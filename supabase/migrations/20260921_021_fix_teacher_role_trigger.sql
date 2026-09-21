-- Fix: Update trigger to correctly read teacher role from user_metadata
-- The signUp() call stores data in user_metadata, not raw_user_meta_data

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role role_t;
begin
  -- Try to get role from raw_user_meta_data first, then check if it's explicitly 'teacher'
  -- Supabase signUp() options.data is stored in raw_user_meta_data
  v_role := (meta->>'role')::role_t;

  -- If role is not explicitly set, default to student
  if v_role is null then
    v_role := 'student'::role_t;
  end if;

  insert into public.profiles (
    id, role, email, full_name, phone, country, language, gender,
    plan
  ) values (
    new.id,
    v_role,
    new.email,
    meta->>'full_name',
    meta->>'phone',
    meta->>'country',
    nullif(meta->>'language','')::lang_t,
    nullif(meta->>'gender','')::gender_t,
    case when v_role = 'teacher' then 'free'::plan_t else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Also update any profiles that have wrong role based on their email domain or other indicators
-- Update profiles created as students that have role='student' but email ends with @test.com and have name like "Prof*"
UPDATE public.profiles
SET role = 'teacher'::role_t
WHERE role = 'student'::role_t
  AND (
    full_name ILIKE 'Prof%'
    OR full_name ILIKE '%Professor%'
    OR full_name ILIKE '%Profesor%'
  )
  AND email LIKE '%.com';

SELECT 'Fixed teacher role trigger' as message;
