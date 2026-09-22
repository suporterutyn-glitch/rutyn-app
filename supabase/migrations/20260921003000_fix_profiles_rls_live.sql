-- La migración 001 nunca se aplicó a producción: la policy recursiva de fase1
-- sigue activa y hace que TODO select sobre profiles falle con 42P17,
-- incluso profiles_self_select. Ese es el 500 del login.

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.my_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select teacher_id from public.profiles where id = auth.uid();
$$;

drop policy if exists profiles_student_reads_teacher on public.profiles;
create policy profiles_student_reads_teacher on public.profiles
  for select using (id = public.my_teacher_id());

-- El listado del marketplace es para usuarios logueados. Sin el "to authenticated"
-- queda legible por el rol anon, y la anon key viaja pública en el bundle.
drop policy if exists profiles_marketplace on public.profiles;
create policy profiles_marketplace on public.profiles
  for select to authenticated using (
    role = 'teacher' and marketplace_visible is true and profile_complete is true
  );
