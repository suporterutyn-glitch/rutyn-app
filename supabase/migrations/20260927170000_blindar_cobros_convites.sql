-- Blindaje de lo que alumno y profesor pueden editar directamente (RLS dejaba cambiar cualquier columna).
-- Solo aplica a llamadas de la app (rol authenticated); las funciones security definer y el service role no pasan por acá.

-- 1) Aceptar convite: solo acepta quien NO hizo la última oferta, y el 1er cobro se crea acá
--    (antes lo insertaba el alumno desde la app y RLS lo descartaba en silencio).
create or replace function public.aceptar_convite(convite_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  c public.invites%rowtype;
  vence date;
begin
  select * into c from public.invites
    where id = convite_id and (teacher_id = auth.uid() or student_id = auth.uid())
      and status in ('pending', 'countered')
    for update;
  if not found then
    raise exception 'Convite inexistente o ya respondido' using errcode = '42501';
  end if;
  if (coalesce(c.last_offer_by, 'student') = 'student' and auth.uid() <> c.teacher_id)
     or (c.last_offer_by = 'teacher' and auth.uid() <> c.student_id) then
    raise exception 'Solo puede aceptar quien recibió la última oferta' using errcode = '42501';
  end if;

  update public.invites set status = 'accepted' where id = c.id;
  update public.profiles set teacher_id = c.teacher_id, link_status = 'active'::link_status_t
    where id = c.student_id and role = 'student'::role_t;
  update public.invites set status = 'rejected'
    where student_id = c.student_id and id <> c.id and status in ('pending', 'countered');

  -- Primera mensualidad: el próximo día 5.
  vence := make_date(extract(year from current_date)::int, extract(month from current_date)::int, 5);
  if vence <= current_date then vence := (vence + interval '1 month')::date; end if;
  insert into public.charges (teacher_id, student_id, format, amount, due_date, status)
    values (c.teacher_id, c.student_id, coalesce(c.format, 'monthly')::charge_format_t, coalesce(c.amount, 0), vence, 'pending');
end $$;

-- 2) Convites
create or replace function public.proteger_convites() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    -- El alumno solo crea pedidos propios, pendientes y como su oferta.
    if new.status <> 'pending' or coalesce(new.last_offer_by, 'student') <> 'student' then
      raise exception 'Convite inválido' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.teacher_id is distinct from old.teacher_id or new.student_id is distinct from old.student_id then
    raise exception 'No se puede cambiar a quién va el convite' using errcode = '42501';
  end if;
  if new.status = 'accepted' and old.status <> 'accepted' then
    raise exception 'Para aceptar se usa aceptar_convite' using errcode = '42501';
  end if;
  if auth.uid() = old.student_id then
    -- El alumno solo puede cancelar o rechazar; no toca condiciones.
    if new.status not in ('rejected', 'cancelled') or new.amount is distinct from old.amount
       or new.format is distinct from old.format or new.frequency is distinct from old.frequency
       or new.last_offer_by is distinct from old.last_offer_by then
      raise exception 'Cambio no permitido en el convite' using errcode = '42501';
    end if;
  elsif new.status = 'countered' and new.last_offer_by is distinct from 'teacher' then
    raise exception 'La contraoferta del profesor debe quedar como suya' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists invites_proteger on public.invites;
create trigger invites_proteger before insert or update on public.invites
  for each row execute function public.proteger_convites();

-- 3) Cobros: el alumno solo declara "ya pagué" (pending -> awaiting).
create or replace function public.proteger_cobros() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if new.status <> 'awaiting' or old.status <> 'pending'
     or new.amount is distinct from old.amount or new.format is distinct from old.format
     or new.due_date is distinct from old.due_date or new.paid_at is distinct from old.paid_at
     or new.teacher_id is distinct from old.teacher_id or new.student_id is distinct from old.student_id
     or new.hours is distinct from old.hours or new.notes is distinct from old.notes then
    raise exception 'El alumno solo puede avisar que pagó' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists charges_proteger on public.charges;
create trigger charges_proteger before update on public.charges
  for each row execute function public.proteger_cobros();

-- 4) Propuestas de cambio de cobro: el alumno solo acepta o rechaza una pendiente.
create or replace function public.proteger_propuestas_cobro() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if old.status <> 'pending' or new.status not in ('accepted', 'rejected')
     or new.new_amount is distinct from old.new_amount or new.new_format is distinct from old.new_format
     or new.reason is distinct from old.reason
     or new.teacher_id is distinct from old.teacher_id or new.student_id is distinct from old.student_id then
    raise exception 'El alumno solo puede aceptar o rechazar la propuesta' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists ccp_proteger on public.charge_change_proposals;
create trigger ccp_proteger before update on public.charge_change_proposals
  for each row execute function public.proteger_propuestas_cobro();

-- 5) Rutinas asignadas: el alumno solo suma entrenamientos completados.
create or replace function public.proteger_rutinas_alumno() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if (to_jsonb(new) - 'completed_workouts' - 'updated_at') is distinct from (to_jsonb(old) - 'completed_workouts' - 'updated_at') then
    raise exception 'El alumno solo puede registrar entrenamientos completados' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists student_routines_proteger on public.student_routines;
create trigger student_routines_proteger before update on public.student_routines
  for each row execute function public.proteger_rutinas_alumno();
