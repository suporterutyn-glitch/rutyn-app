-- Reemplaza la política amplia por una función acotada.
--
-- La política anterior dejaba al profesor escribir CUALQUIER campo del perfil
-- de sus alumnos: nombre, correo, teléfono, datos bancarios, clave PIX. La app
-- solo necesita gestionar el vínculo, así que se expone exactamente eso.
--
-- La función es SECURITY DEFINER: valida ella misma que el alumno sea del
-- profesor que la invoca y solo toca link_status y teacher_id.

create or replace function public.gestionar_vinculo_aluno(aluno_id uuid, accion text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  es_mi_alumno boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = aluno_id
      and role = 'student'
      and teacher_id = auth.uid()
  ) into es_mi_alumno;

  if not es_mi_alumno then
    raise exception 'El alumno no pertenece a este profesor' using errcode = '42501';
  end if;

  if accion = 'suspender' then
    update public.profiles
      set link_status = 'suspended'::link_status_t
      where id = aluno_id;

  elsif accion = 'reactivar' then
    update public.profiles
      set link_status = 'active'::link_status_t
      where id = aluno_id;

  elsif accion = 'desvincular' then
    update public.profiles
      set teacher_id = null,
          link_status = 'ended'::link_status_t
      where id = aluno_id;

  else
    raise exception 'Accion invalida: %', accion using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.gestionar_vinculo_aluno(uuid, text) from public;
grant execute on function public.gestionar_vinculo_aluno(uuid, text) to authenticated;

-- Ya no hace falta: la funcion cubre el caso sin dar escritura sobre el perfil.
drop policy if exists profiles_teacher_updates_students on public.profiles;
