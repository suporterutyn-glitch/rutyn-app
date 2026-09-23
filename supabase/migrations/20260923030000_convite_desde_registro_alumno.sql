-- "Já tenho um professor" no hacía nada.
--
-- El registro del alumno guarda teacher_email en los metadatos, pero nada lo
-- leía: no se creaba convite, el profesor no se enteraba y el alumno quedaba
-- con link_status 'none'. La app lo mandaba a "Aguardando Aprovação" a esperar
-- una solicitud que nunca se había enviado.
--
-- Se engancha en la creación del perfil: si el alumno declaró un profesor y ese
-- correo corresponde a un profesor real, se crea el convite pendiente, se deja
-- al alumno en espera y se notifica al profesor.

create or replace function public.crear_convite_desde_registro()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  correo_profesor text;
  id_profesor uuid;
begin
  if new.role is distinct from 'student'::role_t then
    return new;
  end if;

  select nullif(trim(raw_user_meta_data->>'teacher_email'), '')
    into correo_profesor
    from auth.users
    where id = new.id;

  if correo_profesor is null then
    return new;
  end if;

  select id into id_profesor
    from public.profiles
    where lower(email) = lower(correo_profesor)
      and role = 'teacher'::role_t
    limit 1;

  -- Correo inexistente o de alguien que no es profesor: el alumno sigue sin
  -- vínculo y la app lo lleva a buscar profesor en el marketplace.
  if id_profesor is null then
    return new;
  end if;

  insert into public.invites (student_id, teacher_id, status)
  values (new.id, id_profesor, 'pending');

  update public.profiles
    set link_status = 'pending'::link_status_t
    where id = new.id;

  insert into public.notifications (user_id, type, title, body)
  values (
    id_profesor,
    'invite'::notif_type_t,
    'Novo convite de aluno',
    coalesce(nullif(new.full_name, ''), new.email) || ' quer treinar com você.'
  );

  return new;
end
$BODY$;

drop trigger if exists profiles_convite_desde_registro on public.profiles;
create trigger profiles_convite_desde_registro
  after insert on public.profiles
  for each row execute function public.crear_convite_desde_registro();
