-- Nadie podía avisarle a nadie.
--
-- La única política de notifications era notif_self: user_id = auth.uid().
-- Es decir, cada quien solo podía crear notificaciones para sí mismo. Todo lo
-- que la app llama "avisar al otro" fallaba con 42501 y el código lo descartaba:
-- el aviso de propuesta aceptada o recusada, la contrapropuesta, la suspensión,
-- la baja de la lista, la dieta nueva y la pantalla entera de "Notificar alunos".
--
-- Se permite insertar solo hacia alguien con quien existe una relación real:
-- el profesor a sus alumnos, el alumno a su profesor, y las dos partes de un
-- convite abierto (que es cuando todavía no hay vínculo pero sí hay trato).
-- Leer y marcar como leída siguen siendo cosa del dueño: notif_self no cambia.

drop policy if exists notifications_insert_vinculado on public.notifications;
create policy notifications_insert_vinculado on public.notifications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles alumno
      where alumno.id = notifications.user_id
        and alumno.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles yo
      where yo.id = auth.uid()
        and yo.teacher_id = notifications.user_id
    )
    or exists (
      select 1 from public.invites i
      where (i.teacher_id = auth.uid() and i.student_id = notifications.user_id)
         or (i.student_id = auth.uid() and i.teacher_id = notifications.user_id)
    )
  );
