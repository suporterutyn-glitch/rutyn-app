-- Fix: infinite recursion in profiles RLS.
-- Sub-selects on profiles from inside profiles policies re-enter RLS.
-- Solution: security-definer helpers that bypass RLS.

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

-- (Optional but consistent) also refactor teacher-reads-students to use helper — not required, no recursion there.
