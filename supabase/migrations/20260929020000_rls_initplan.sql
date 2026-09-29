-- Rendimiento: auth.uid() dentro de (select ...) se evalúa una vez por consulta, no por fila.
-- Misma lógica que antes; generado desde pg_policies.
alter policy "ass_teacher" on public.assessments using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "ass_student_read" on public.assessments using ((student_id = (select auth.uid())));
alter policy "ans_teacher" on public.anamnesis_answers using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "conv_involved" on public.conversations using (((teacher_id = (select auth.uid())) OR (student_id = (select auth.uid())))) with check (((teacher_id = (select auth.uid())) OR (student_id = (select auth.uid()))));
alter policy "msg_involved_read" on public.messages using ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.teacher_id = (select auth.uid())) OR (c.student_id = (select auth.uid())))))));
alter policy "exercises_read_own" on public.exercises using ((trainer_id = (select auth.uid())));
alter policy "exercises_create_own" on public.exercises with check ((trainer_id = (select auth.uid())));
alter policy "exercises_update_own" on public.exercises using ((trainer_id = (select auth.uid()))) with check ((trainer_id = (select auth.uid())));
alter policy "exercises_delete_own" on public.exercises using ((trainer_id = (select auth.uid())));
alter policy "foods_read_own" on public.foods using ((trainer_id = (select auth.uid())));
alter policy "foods_create_own" on public.foods with check ((trainer_id = (select auth.uid())));
alter policy "foods_update_own" on public.foods using ((trainer_id = (select auth.uid()))) with check ((trainer_id = (select auth.uid())));
alter policy "foods_delete_own" on public.foods using ((trainer_id = (select auth.uid())));
alter policy "msg_send" on public.messages with check (((sender_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.teacher_id = (select auth.uid())) OR (c.student_id = (select auth.uid()))))))));
alter policy "ccp_teacher" on public.charge_change_proposals using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "ccp_student" on public.charge_change_proposals using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "ccp_student_read" on public.charge_change_proposals using ((student_id = (select auth.uid())));
alter policy "ws_self" on public.workout_sessions using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "ws_teacher_read" on public.workout_sessions using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = workout_sessions.student_id) AND (p.teacher_id = (select auth.uid()))))));
alter policy "routines_owner" on public.routines using ((owner_id = (select auth.uid()))) with check ((owner_id = (select auth.uid())));
alter policy "re_owner" on public.routine_exercises using ((EXISTS ( SELECT 1
   FROM routines r
  WHERE ((r.id = routine_exercises.routine_id) AND (r.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM routines r
  WHERE ((r.id = routine_exercises.routine_id) AND (r.owner_id = (select auth.uid()))))));
alter policy "series_owner" on public.series using ((EXISTS ( SELECT 1
   FROM (routine_exercises re
     JOIN routines r ON ((r.id = re.routine_id)))
  WHERE ((re.id = series.routine_exercise_id) AND (r.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM (routine_exercises re
     JOIN routines r ON ((r.id = re.routine_id)))
  WHERE ((re.id = series.routine_exercise_id) AND (r.owner_id = (select auth.uid()))))));
alter policy "diets_owner" on public.diets using ((owner_id = (select auth.uid()))) with check ((owner_id = (select auth.uid())));
alter policy "meals_owner" on public.meals using ((EXISTS ( SELECT 1
   FROM diets d
  WHERE ((d.id = meals.diet_id) AND (d.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM diets d
  WHERE ((d.id = meals.diet_id) AND (d.owner_id = (select auth.uid()))))));
alter policy "push_self" on public.push_subscriptions using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy "meal_foods_owner" on public.meal_foods using ((EXISTS ( SELECT 1
   FROM (meals m
     JOIN diets d ON ((d.id = m.diet_id)))
  WHERE ((m.id = meal_foods.meal_id) AND (d.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM (meals m
     JOIN diets d ON ((d.id = m.diet_id)))
  WHERE ((m.id = meal_foods.meal_id) AND (d.owner_id = (select auth.uid()))))));
alter policy "recipes_owner" on public.recipes using ((owner_id = (select auth.uid()))) with check ((owner_id = (select auth.uid())));
alter policy "recipe_ings_owner" on public.recipe_ingredients using ((EXISTS ( SELECT 1
   FROM recipes r
  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM recipes r
  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.owner_id = (select auth.uid()))))));
alter policy "sr_teacher_all" on public.student_routines using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "sr_student_read" on public.student_routines using ((student_id = (select auth.uid())));
alter policy "sr_student_update" on public.student_routines using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "sd_teacher_all" on public.student_diets using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "sd_student_read" on public.student_diets using ((student_id = (select auth.uid())));
alter policy "appts_teacher" on public.appointments using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "appts_student_read" on public.appointments using ((student_id = (select auth.uid())));
alter policy "notif_self" on public.notifications using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy "charges_teacher" on public.charges using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "charges_student_read" on public.charges using ((student_id = (select auth.uid())));
alter policy "charges_student_declare" on public.charges using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "hydration_owner" on public.hydration_days using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "hydration_teacher_read" on public.hydration_days using ((EXISTS ( SELECT 1
   FROM profiles s
  WHERE ((s.id = hydration_days.student_id) AND (s.teacher_id = (select auth.uid()))))));
alter policy "sub_self" on public.subscriptions using ((teacher_id = (select auth.uid()))) with check ((teacher_id = (select auth.uid())));
alter policy "annview_self" on public.announcement_views using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy "profiles_self_select" on public.profiles using (((select auth.uid()) = id));
alter policy "profiles_self_update" on public.profiles using (((select auth.uid()) = id)) with check (((select auth.uid()) = id));
alter policy "profiles_teacher_reads_students" on public.profiles using (((teacher_id IS NOT NULL) AND (teacher_id = (select auth.uid()))));
alter policy "invites_involved_select" on public.invites using (((student_id = (select auth.uid())) OR (teacher_id = (select auth.uid()))));
alter policy "invites_student_insert" on public.invites with check ((student_id = (select auth.uid())));
alter policy "invites_involved_update" on public.invites using (((student_id = (select auth.uid())) OR (teacher_id = (select auth.uid()))));
alter policy "profiles_teacher_reads_invite_students" on public.profiles using ((EXISTS ( SELECT 1
   FROM invites i
  WHERE ((i.student_id = profiles.id) AND (i.teacher_id = (select auth.uid())) AND (i.status = ANY (ARRAY['pending'::text, 'countered'::text]))))));
alter policy "user_favorites_own" on public.user_favorites using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy "notifications_insert_vinculado" on public.notifications with check (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles alumno
  WHERE ((alumno.id = notifications.user_id) AND (alumno.teacher_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM profiles yo
  WHERE ((yo.id = (select auth.uid())) AND (yo.teacher_id = notifications.user_id)))) OR (EXISTS ( SELECT 1
   FROM invites i
  WHERE (((i.teacher_id = (select auth.uid())) AND (i.student_id = notifications.user_id)) OR ((i.student_id = (select auth.uid())) AND (i.teacher_id = notifications.user_id)))))));
alter policy "custom_meals_owner" on public.custom_meals using ((owner_id = (select auth.uid()))) with check ((owner_id = (select auth.uid())));
alter policy "meal_recipes_owner" on public.meal_recipes using ((EXISTS ( SELECT 1
   FROM (meals m
     JOIN diets d ON ((d.id = m.diet_id)))
  WHERE ((m.id = meal_recipes.meal_id) AND (d.owner_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1
   FROM (meals m
     JOIN diets d ON ((d.id = m.diet_id)))
  WHERE ((m.id = meal_recipes.meal_id) AND (d.owner_id = (select auth.uid()))))));
alter policy "ass_student_update" on public.assessments using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
alter policy "leer" on public.assessment_rm_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'rm'::text, false))));
alter policy "escribir" on public.assessment_rm_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'rm'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'rm'::text, true))));
alter policy "admins_select_own" on public.admins using ((user_id = (select auth.uid())));
alter policy "leer" on public.assessment_aerobic_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'aerobica'::text, false))));
alter policy "escribir" on public.assessment_aerobic_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'aerobica'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'aerobica'::text, true))));
alter policy "leer" on public.assessment_muscular_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'muscular'::text, false))));
alter policy "escribir" on public.assessment_muscular_tests using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'muscular'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'muscular'::text, true))));
alter policy "leer" on public.assessment_perimetry using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'perimetria'::text, false))));
alter policy "escribir" on public.assessment_perimetry using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'perimetria'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'perimetria'::text, true))));
alter policy "leer" on public.assessment_bodyfat using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'gordura'::text, false))));
alter policy "escribir" on public.assessment_bodyfat using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'gordura'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'gordura'::text, true))));
alter policy "leer" on public.assessment_photos using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'fotos'::text, false))));
alter policy "escribir" on public.assessment_photos using (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'fotos'::text, true)))) with check (((teacher_id = (select auth.uid())) OR ((student_id = (select auth.uid())) AND seccion_permitida(student_id, teacher_id, 'fotos'::text, true))));
alter policy "modelos_leer" on public.anamnesis_templates using (((owner_id IS NULL) OR (owner_id = (select auth.uid()))));
alter policy "modelos_propios" on public.anamnesis_templates using (((owner_id = (select auth.uid())) AND (kind = 'custom'::text))) with check (((owner_id = (select auth.uid())) AND (kind = 'custom'::text)));
alter policy "ans_student_read" on public.anamnesis_answers using ((student_id = (select auth.uid())));
alter policy "ans_student_update" on public.anamnesis_answers using ((student_id = (select auth.uid()))) with check ((student_id = (select auth.uid())));
