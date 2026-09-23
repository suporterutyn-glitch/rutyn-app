-- El profesor tenía política de SELECT sobre sus alumnos pero ninguna de UPDATE,
-- así que suspender, reactivar y quitar alumno fallaban en silencio: PostgREST
-- devuelve 200 con lista vacía cuando RLS filtra la fila, sin error.
--
-- Resguardos en el WITH CHECK, que no limitan la gestión del vínculo:
--   * el alumno solo puede quedar con este profesor o liberado (teacher_id null),
--     nunca reasignado a otro profesor;
--   * no puede cambiar de rol a profesor.

drop policy if exists profiles_teacher_updates_students on public.profiles;
create policy profiles_teacher_updates_students on public.profiles
  for update
  using (teacher_id is not null and teacher_id = auth.uid())
  with check (role = 'student' and (teacher_id is null or teacher_id = auth.uid()));
