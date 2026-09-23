-- Un convite pendiente llegaba sin nombre ni correo del alumno.
--
-- La única política de lectura del profesor sobre perfiles ajenos exige
-- teacher_id = auth.uid(), y un alumno que todavía no aceptó no está vinculado.
-- El join de la pantalla de convites devolvía null y el profesor tenía que
-- decidir a ciegas sobre alguien anónimo.
--
-- Se habilita la lectura solo mientras exista un convite dirigido a él.

drop policy if exists profiles_teacher_reads_invite_students on public.profiles;
create policy profiles_teacher_reads_invite_students on public.profiles
  for select using (
    exists (
      select 1 from public.invites i
      where i.student_id = profiles.id
        and i.teacher_id = auth.uid()
        and i.status in ('pending', 'countered')
    )
  );
