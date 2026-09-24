-- El alumno también acepta: la contrapropuesta del profesor se responde desde
-- la home del alumno, y ahí el código hacía las mismas dos escrituras sueltas
-- que ya fallaban del lado del profesor (ver 20260923060000).
--
-- En vez de una segunda función casi igual, se amplía la existente: acepta
-- quien esté en el convite, sea el profesor o el alumno. La validación sigue
-- siendo la misma — hay que ser parte del convite y el convite tiene que estar
-- abierto.

create or replace function public.aceptar_convite(convite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  c public.invites%rowtype;
begin
  select * into c
    from public.invites
    where id = convite_id
      and (teacher_id = auth.uid() or student_id = auth.uid())
      and status in ('pending', 'countered')
    for update;

  if not found then
    raise exception 'Convite inexistente o ya respondido' using errcode = '42501';
  end if;

  update public.invites
    set status = 'accepted'
    where id = c.id;

  update public.profiles
    set teacher_id = c.teacher_id,
        link_status = 'active'::link_status_t
    where id = c.student_id
      and role = 'student'::role_t;

  update public.invites
    set status = 'rejected'
    where student_id = c.student_id
      and id <> c.id
      and status in ('pending', 'countered');
end
$BODY$;

revoke all on function public.aceptar_convite(uuid) from public;
grant execute on function public.aceptar_convite(uuid) to authenticated;
