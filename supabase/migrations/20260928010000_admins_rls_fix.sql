-- La política anterior consultaba admins dentro de su propia política (recursión infinita).
DROP POLICY IF EXISTS "Solo el usuario puede ver su propio admin record" ON admins;
DROP POLICY IF EXISTS "Super admin puede insertar admins" ON admins;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
$$;

CREATE POLICY "admins_select_own" ON admins FOR SELECT USING (user_id = auth.uid());
