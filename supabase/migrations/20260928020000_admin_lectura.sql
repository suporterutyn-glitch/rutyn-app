CREATE POLICY "admin_read_profiles" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_read_subscriptions" ON subscriptions FOR SELECT USING (public.is_admin());
