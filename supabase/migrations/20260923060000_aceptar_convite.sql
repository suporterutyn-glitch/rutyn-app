-- Aceptar un convite no vinculaba al alumno.
--
-- La pantalla marcaba el convite como 'accepted' (eso sí funciona: el convite
-- es del profesor) y después intentaba escribir teacher_id en el perfil del
-- alumno. Pero en ese instante el alumno todavía NO es suyo, así que ninguna
-- política lo permite: PostgREST devuelve 200 con lista vacía y el error se
-- descartaba. Resultado: el convite desaparecía de la lista y el alumno nunca
-- aparecía en "Meus Alunos", con link_status 'pending' y teacher_id null.
--
-- Es un problema de orden: la autorización para vincular no viene de ser dueño
-- del alumno, viene de tener un convite pendiente que ese alumno envió. Eso no
-- se puede expresar en la política de UPDATE sin abrir la escritura del perfil,
-- así que se resuelve con una función que valida el convite y hace las dos
-- escrituras juntas: o se vincula y se acepta, o no pasa nada.

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
      and teacher_id = auth.uid()
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

  -- Los convites restantes de este alumno dejan de tener sentido: ya tiene
  -- profesor. Se cierran para que no queden pendientes en otras bandejas.
  update public.invites
    set status = 'rejected'
    where student_id = c.student_id
      and id <> c.id
      and status in ('pending', 'countered');
end
$BODY$;

revoke all on function public.aceptar_convite(uuid) from public;
grant execute on function public.aceptar_convite(uuid) to authenticated;

-- Reparación de los convites que ya se aceptaron mientras el vínculo fallaba:
-- el convite quedó 'accepted' y el alumno sin profesor. Se completa la mitad
-- que nunca llegó a escribirse.
update public.profiles a
  set teacher_id = i.teacher_id,
      link_status = 'active'::link_status_t
  from public.invites i
  where i.student_id = a.id
    and i.status = 'accepted'
    and a.teacher_id is null
    and a.role = 'student'::role_t;
