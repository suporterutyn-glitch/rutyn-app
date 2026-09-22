-- Rutyn · Fase 7: buckets de storage

-- Bucket público 'avatars' (leitura pública, escrita só pelo dono)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket privado 'assessment-photos' (só professor+aluno da avaliação leem)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assessment-photos', 'assessment-photos', false, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies avatars: qualquer um lê (bucket público), dono escreve/atualiza/deleta
-- Convenção: arquivos salvos como <user_id>/<filename>
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policies assessment-photos: aluno dono lê/escreve suas fotos; professor vinculado lê
-- Convenção: <student_id>/<assessment_id>/<filename>
drop policy if exists "assessphotos_owner_all" on storage.objects;
create policy "assessphotos_owner_all" on storage.objects
  for all using (
    bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "assessphotos_teacher_read" on storage.objects;
create policy "assessphotos_teacher_read" on storage.objects
  for select using (
    bucket_id = 'assessment-photos' and exists (
      select 1 from public.profiles p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.teacher_id = auth.uid()
    )
  );
