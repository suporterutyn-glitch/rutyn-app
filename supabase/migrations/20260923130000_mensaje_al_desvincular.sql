-- El diálogo "Removido da Lista" (print 023 del módulo 01) muestra quién removió
-- al alumno y la razón que escribió el profesor. Hoy esa razón viaja en una
-- notificación y se pierde: no queda nada que el diálogo pueda leer.
--
-- teacher_id se sigue poniendo en null al desvincular, porque la lista de
-- "Meus Alunos" filtra por ese campo y el alumno removido debe desaparecer de
-- ahí. Para poder decir quién fue, se guarda aparte en unlinked_by.

alter table public.profiles add column if not exists link_message text;
alter table public.profiles add column if not exists unlinked_by uuid references public.profiles(id) on delete set null;

create or replace function public.gestionar_vinculo_aluno(aluno_id uuid, accion text, mensaje text default null)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  es_mi_alumno boolean;
  quien uuid := auth.uid();
begin
  select exists (
    select 1 from public.profiles
    where id = aluno_id
      and role = 'student'
      and teacher_id = quien
  ) into es_mi_alumno;

  if not es_mi_alumno then
    raise exception 'El alumno no pertenece a este profesor' using errcode = '42501';
  end if;

  if accion = 'suspender' then
    update public.profiles
      set link_status = 'suspended'::link_status_t,
          link_message = nullif(trim(coalesce(mensaje, '')), '')
      where id = aluno_id;

  elsif accion = 'reactivar' then
    update public.profiles
      set link_status = 'active'::link_status_t,
          link_message = null
      where id = aluno_id;

  elsif accion = 'desvincular' then
    update public.profiles
      set teacher_id = null,
          unlinked_by = quien,
          link_status = 'ended'::link_status_t,
          link_message = nullif(trim(coalesce(mensaje, '')), '')
      where id = aluno_id;

  else
    raise exception 'Accion invalida: %', accion using errcode = '22023';
  end if;
end;
$BODY$;

revoke all on function public.gestionar_vinculo_aluno(uuid, text, text) from public;
grant execute on function public.gestionar_vinculo_aluno(uuid, text, text) to authenticated;

-- El alumno necesita el nombre de quien lo removió, pero ya no es su profesor
-- y no puede leer ese perfil.
--
-- Una política de SELECT no sirve acá: consultar profiles desde una política de
-- profiles es recursión infinita (42P17) y deja a todos sin poder leer ni su
-- propio perfil. Se resuelve con una función acotada que devuelve solo el
-- nombre y el teléfono.
create or replace function public.quien_me_desvinculou()
returns table (full_name text, phone text)
language sql
security definer
set search_path = public
stable
as $FN$
  select p.full_name, p.phone
  from public.profiles yo
  join public.profiles p on p.id = yo.unlinked_by
  where yo.id = auth.uid()
$FN$;

revoke all on function public.quien_me_desvinculou() from public;
grant execute on function public.quien_me_desvinculou() to authenticated;

notify pgrst, 'reload schema';
