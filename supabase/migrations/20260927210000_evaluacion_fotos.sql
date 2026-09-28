-- Evaluación física, etapa 4: fotos posturales (frente, espalda, lateral), 2 por ángulo:
-- 'reference' (fija, se cambia a mano) y 'current' (la nueva reemplaza a la anterior).
-- Archivos en el bucket privado assessment-photos: {alumno}/{profesor}/{ángulo}-{posición}-{marca}.jpg

create table if not exists public.assessment_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  angle text not null check (angle in ('front', 'back', 'side')),
  slot text not null check (slot in ('reference', 'current')),
  path text not null,
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id, angle, slot)
);
alter table public.assessment_photos enable row level security;
drop policy if exists leer on public.assessment_photos;
drop policy if exists escribir on public.assessment_photos;
create policy leer on public.assessment_photos for select using (
  teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, 'fotos', false)));
create policy escribir on public.assessment_photos for all using (
  teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, 'fotos', true)))
  with check (teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, 'fotos', true)));

-- Archivos: el profesor maneja las fotos de sus alumnos; el alumno solo con la sección visible/liberada.
drop policy if exists assessphotos_owner_all on storage.objects;
drop policy if exists assessphotos_teacher_read on storage.objects;
drop policy if exists evalfotos_leer on storage.objects;
drop policy if exists evalfotos_escribir on storage.objects;
create policy evalfotos_leer on storage.objects for select using (
  bucket_id = 'assessment-photos' and (
    ((storage.foldername(name))[2] = auth.uid()::text
      and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.teacher_id = auth.uid()))
    or ((storage.foldername(name))[1] = auth.uid()::text
      and public.seccion_permitida(auth.uid(), ((storage.foldername(name))[2])::uuid, 'fotos', false))
  ));
create policy evalfotos_escribir on storage.objects for all using (
  bucket_id = 'assessment-photos' and (
    ((storage.foldername(name))[2] = auth.uid()::text
      and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.teacher_id = auth.uid()))
    or ((storage.foldername(name))[1] = auth.uid()::text
      and public.seccion_permitida(auth.uid(), ((storage.foldername(name))[2])::uuid, 'fotos', true))
  ))
  with check (
  bucket_id = 'assessment-photos' and (
    ((storage.foldername(name))[2] = auth.uid()::text
      and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.teacher_id = auth.uid()))
    or ((storage.foldername(name))[1] = auth.uid()::text
      and public.seccion_permitida(auth.uid(), ((storage.foldername(name))[2])::uuid, 'fotos', true))
  ));
