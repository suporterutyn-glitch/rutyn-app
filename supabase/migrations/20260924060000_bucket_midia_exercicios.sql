-- Videos, GIFs y portadas de los ejercicios que crea el profesor.
-- Público para que el alumno los vea; cada profesor escribe solo en <su id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 50 * 1024 * 1024,
  array['video/mp4','video/quicktime','video/webm','image/gif','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "exercise_media_public_read" on storage.objects;
create policy "exercise_media_public_read" on storage.objects
  for select using (bucket_id = 'exercise-media');

drop policy if exists "exercise_media_owner_write" on storage.objects;
create policy "exercise_media_owner_write" on storage.objects
  for insert with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "exercise_media_owner_update" on storage.objects;
create policy "exercise_media_owner_update" on storage.objects
  for update using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "exercise_media_owner_delete" on storage.objects;
create policy "exercise_media_owner_delete" on storage.objects
  for delete using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);
