-- Fix professor role for prof.test5177@test.com
-- The profile was created with role='student' by the trigger, needs to be teacher

UPDATE public.profiles
SET role = 'teacher'::role_t
WHERE id = '0530a422-ce50-4ad3-b590-b6f5c4e3c584'
  AND email = 'prof.test5177@test.com';

-- Verify the update
SELECT id, email, role FROM public.profiles
WHERE id = '0530a422-ce50-4ad3-b590-b6f5c4e3c584';
