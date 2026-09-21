-- =============================================
-- RESTRUCTURE: foods y exercises como en Lovable
-- =============================================

-- Backup de datos antiguos (opcional, para referencias)
-- CREATE TABLE public.foods_legacy AS SELECT * FROM public.foods;
-- CREATE TABLE public.exercises_legacy AS SELECT * FROM public.exercises;

-- =============================================
-- DROP OLD TABLES Y POLICIES
-- =============================================
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;

-- =============================================
-- RECREATE: exercise_library (como en Lovable)
-- =============================================
CREATE TABLE public.exercises (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_trainer ON public.exercises(trainer_id);
CREATE INDEX idx_exercises_muscle ON public.exercises(muscle_group);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- RLS: Global exercises (trainer_id IS NULL) readable by anyone
-- Personal exercises (trainer_id = auth.uid()) readable by trainer only
CREATE POLICY "exercises_read_global" ON public.exercises FOR SELECT
  USING (trainer_id IS NULL);

CREATE POLICY "exercises_read_own" ON public.exercises FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "exercises_create_own" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "exercises_update_own" ON public.exercises FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "exercises_delete_own" ON public.exercises FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- =============================================
-- RECREATE: foods (como en Lovable)
-- =============================================
CREATE TABLE public.foods (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion TEXT,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fats_g NUMERIC,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_foods_trainer ON public.foods(trainer_id);
CREATE INDEX idx_foods_category ON public.foods(category);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- RLS: Global foods (trainer_id IS NULL) readable by anyone
-- Personal foods (trainer_id = auth.uid()) readable by trainer only
CREATE POLICY "foods_read_global" ON public.foods FOR SELECT
  USING (trainer_id IS NULL);

CREATE POLICY "foods_read_own" ON public.foods FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "foods_create_own" ON public.foods FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "foods_update_own" ON public.foods FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "foods_delete_own" ON public.foods FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- =============================================
-- TRIGGERS: updated_at
-- =============================================
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_foods_updated BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
