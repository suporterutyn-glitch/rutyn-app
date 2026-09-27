alter table public.profiles
  add column if not exists plan_seats int,
  add column if not exists plan_status text,
  add column if not exists plan_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Alumnos activos que permite el plan del profesor. null = sin límite.
create or replace function public.limite_alumnos(p_teacher uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_seats int;
begin
  select plan::text, plan_seats into v_plan, v_seats from public.profiles where id = p_teacher;
  if v_plan in ('pro', 'master', 'elite') then return null; end if;
  if v_plan = 'basic' then return greatest(coalesce(v_seats, 5), 5); end if;
  return 1;
end $$;

create or replace function public.alumnos_activos(p_teacher uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles
   where teacher_id = p_teacher and role = 'student' and link_status = 'active'
$$;

revoke all on function public.limite_alumnos(uuid), public.alumnos_activos(uuid) from public, anon;
grant execute on function public.limite_alumnos(uuid), public.alumnos_activos(uuid) to authenticated, service_role;

-- Ningún camino (convite, reactivar, crear alumno) puede pasar el límite del plan.
create or replace function public.controlar_limite_alumnos() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_lim int;
begin
  if new.role <> 'student' or new.teacher_id is null or new.link_status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.link_status = 'active' and old.teacher_id is not distinct from new.teacher_id then return new; end if;
  perform pg_advisory_xact_lock(hashtext('limite_alumnos:' || new.teacher_id::text));
  v_lim := public.limite_alumnos(new.teacher_id);
  if v_lim is not null and public.alumnos_activos(new.teacher_id) >= v_lim then
    raise exception 'student_limit: Limite de alunos do plano atingido (%)', v_lim using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists profiles_limite_alumnos on public.profiles;
create trigger profiles_limite_alumnos
  before insert or update of link_status, teacher_id on public.profiles
  for each row execute function public.controlar_limite_alumnos();

-- Desde la app (rol authenticated) nadie se cambia plan, rol ni vínculo:
-- eso lo hacen el pago (service_role) o las funciones security definer.
create or replace function public.proteger_campos_perfil() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.plan is distinct from old.plan
     or new.plan_seats is distinct from old.plan_seats
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.plan_status is distinct from old.plan_status
     or new.plan_cancel_at_period_end is distinct from old.plan_cancel_at_period_end
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    raise exception 'O plano só muda pelo pagamento' using errcode = '42501';
  end if;
  if new.role is distinct from old.role
     or new.teacher_id is distinct from old.teacher_id
     or new.unlinked_by is distinct from old.unlinked_by then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  -- El alumno solo puede marcarse "pendiente" al mandar una propuesta.
  if new.link_status is distinct from old.link_status
     and not (old.role = 'student' and new.link_status = 'pending' and old.link_status <> 'active') then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  if new.account_status is distinct from old.account_status and new.account_status <> 'deleting' then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_proteger_campos on public.profiles;
create trigger profiles_proteger_campos
  before update on public.profiles
  for each row execute function public.proteger_campos_perfil();

-- Cuando el plan baja (cancelación o falta de pago), los alumnos que sobran
-- quedan suspendidos: primero los vinculados más recientemente.
create or replace function public.ajustar_alumnos_al_plan(p_teacher uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_lim int; v_n int;
begin
  v_lim := public.limite_alumnos(p_teacher);
  if v_lim is null then return 0; end if;
  with sobran as (
    select id from public.profiles
     where teacher_id = p_teacher and role = 'student' and link_status = 'active'
     order by updated_at desc
     offset v_lim
  )
  update public.profiles p set link_status = 'suspended'
    from sobran where p.id = sobran.id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.ajustar_alumnos_al_plan(uuid) from public, anon, authenticated;
grant execute on function public.ajustar_alumnos_al_plan(uuid) to service_role;
