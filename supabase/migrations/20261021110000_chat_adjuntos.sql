-- Chat estilo Instagram: fotos, videos cortos, audios y documentos, y quién mandó el último mensaje
-- (para "Tú: …" y el punto de no leído en la lista).

alter table public.messages
  add column if not exists kind text not null default 'text',
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime text,
  add column if not exists duration_s numeric;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'image', 'video', 'audio', 'file'));
alter table public.messages alter column body set default '';

alter table public.conversations add column if not exists last_sender_id uuid;

-- El último mensaje de la lista: el texto, o "::image", "::video", "::audio", "::file" (la app lo traduce).
create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = case when new.kind = 'text' then new.body else '::' || new.kind end,
         last_message_at = new.created_at,
         last_sender_id = new.sender_id
   where id = new.conversation_id;
  return new;
end $$;

-- Archivos del chat: privados, carpeta = id de la conversación; solo la ven y suben sus dos integrantes.
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat', 'chat', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

create or replace function public.es_de_mi_conversacion(p_carpeta text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
     where c.id::text = p_carpeta
       and (c.teacher_id = auth.uid() or c.student_id = auth.uid())
  )
$$;
revoke all on function public.es_de_mi_conversacion(text) from public, anon;
grant execute on function public.es_de_mi_conversacion(text) to authenticated;

drop policy if exists chat_leer on storage.objects;
create policy chat_leer on storage.objects for select to authenticated
  using (bucket_id = 'chat' and public.es_de_mi_conversacion((storage.foldername(name))[1]));

drop policy if exists chat_subir on storage.objects;
create policy chat_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and public.es_de_mi_conversacion((storage.foldername(name))[1]));
