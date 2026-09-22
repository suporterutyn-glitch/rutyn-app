-- La anon key viaja pública dentro del bundle JS, así que todo lo que el rol
-- anon pueda leer es, en la práctica, público en internet.

-- v_teacher_stats se creó sin security_invoker: corría con permisos del owner y
-- salteaba el RLS de profiles, invites, charges y notifications. Con SELECT
-- otorgado a anon, cualquiera con la key podía leer la facturación mensual y la
-- cantidad de alumnos de todos los profesores.
alter view public.v_teacher_stats set (security_invoker = on);
revoke all on public.v_teacher_stats from anon;

-- Catálogos globales y avisos: la app exige login, no hay motivo para que anon
-- los lea. Se mantiene el mismo criterio, restringido a usuarios autenticados.
drop policy if exists anamnesis_read on public.anamnesis_templates;
create policy anamnesis_read on public.anamnesis_templates
  for select to authenticated using (true);

drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements
  for select to authenticated using (is_active is true);

drop policy if exists exercises_read_global on public.exercises;
create policy exercises_read_global on public.exercises
  for select to authenticated using (trainer_id is null);

drop policy if exists foods_read_global on public.foods;
create policy foods_read_global on public.foods
  for select to authenticated using (trainer_id is null);
