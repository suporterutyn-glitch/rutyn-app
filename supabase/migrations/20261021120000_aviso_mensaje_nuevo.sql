-- Aviso de mensaje nuevo del chat (en la app y, por el trigger notifications_push, en el celular).
-- Para no llenar de avisos una charla: si el destinatario ya tiene un aviso sin leer de esa misma
-- conversación de los últimos 15 minutos, se actualiza ese (sin volver a sonar) en vez de crear otro.
-- La app marca como leídos los avisos de una conversación al abrirla.
create or replace function public.aviso_mensaje_nuevo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_conv public.conversations%rowtype;
  v_dest uuid;
  v_nombre text;
  v_clave text;
  v_previo text;
  v_cuerpo text;
  v_existe uuid;
  v_datos jsonb;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then return new; end if;
  v_dest := case when new.sender_id = v_conv.teacher_id then v_conv.student_id else v_conv.teacher_id end;
  if v_dest is null or v_dest = new.sender_id then return new; end if;
  select coalesce(nullif(trim(full_name), ''), 'Rutyn') into v_nombre from public.profiles where id = new.sender_id;
  v_clave := case new.kind when 'image' then 'newMessageImage' when 'video' then 'newMessageVideo'
                           when 'audio' then 'newMessageAudio' when 'file' then 'newMessageFile' else 'newMessage' end;
  v_previo := left(coalesce(new.body, ''), 140);
  -- Texto de respaldo (portugués); la app y el celular lo traducen con la clave.
  v_cuerpo := case new.kind when 'image' then '📷 Enviou uma foto' when 'video' then '🎬 Enviou um vídeo'
                            when 'audio' then '🎤 Enviou um áudio' when 'file' then '📄 Enviou um documento' else v_previo end;
  v_datos := jsonb_build_object('key', v_clave, 'conversation_id', new.conversation_id,
                                'params', jsonb_build_object('who', v_nombre, 'preview', v_previo));

  select id into v_existe from public.notifications
   where user_id = v_dest and read_at is null and data->>'conversation_id' = new.conversation_id::text
     and created_at > now() - interval '15 minutes'
   order by created_at desc limit 1;

  if v_existe is not null then
    update public.notifications set title = v_nombre, body = v_cuerpo, data = v_datos where id = v_existe;
  else
    insert into public.notifications (user_id, type, title, body, data) values (v_dest, 'invite', v_nombre, v_cuerpo, v_datos);
  end if;
  return new;
exception when others then
  -- Un problema con el aviso nunca debe impedir que se guarde el mensaje.
  return new;
end $$;
revoke all on function public.aviso_mensaje_nuevo() from public, anon, authenticated;

drop trigger if exists aviso_mensaje_nuevo on public.messages;
create trigger aviso_mensaje_nuevo after insert on public.messages
  for each row execute function public.aviso_mensaje_nuevo();
