-- Final migration to setup foods and exercises tables
-- This migration ensures the tables exist with the correct schema

-- =============================================
-- DROP OLD TABLES Y POLICIES (if they exist)
-- =============================================
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;

-- =============================================
-- RECREATE: exercises table (como en Lovable)
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
-- RECREATE: foods table (como en Lovable)
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
-- SEED: Global foods and exercises
-- =============================================
INSERT INTO public.exercises (trainer_id, name, muscle_group, description) VALUES
(NULL, 'Press de banca con barra', 'Pecho', 'Ejercicio fundamental para el pecho'),
(NULL, 'Press inclinado con mancuernas', 'Pecho', 'Trabaja la parte superior del pecho'),
(NULL, 'Aperturas con mancuernas', 'Pecho', 'Aislamiento del pecho'),
(NULL, 'Press en máquina', 'Pecho', 'Movimiento controlado para principiantes'),
(NULL, 'Dominadas', 'Espalda', 'Ejercicio de peso corporal para la espalda'),
(NULL, 'Remo con barra', 'Espalda', 'Movimiento fundamental para espalda'),
(NULL, 'Jalón lat', 'Espalda', 'Aislamiento de dorsales'),
(NULL, 'Remo con mancuernas', 'Espalda', 'Trabajo unilateral de espalda'),
(NULL, 'Press militar', 'Hombros', 'Fundamental para hombros'),
(NULL, 'Elevaciones laterales', 'Hombros', 'Aislamiento de deltoides'),
(NULL, 'Encogimientos de hombros', 'Hombros', 'Trabajo de trapecios'),
(NULL, 'Press con mancuernas', 'Hombros', 'Variante con mancuernas'),
(NULL, 'Curl con barra', 'Brazos', 'Ejercicio fundamental para bíceps'),
(NULL, 'Curl con mancuernas', 'Brazos', 'Variante con mancuernas'),
(NULL, 'Curl en máquina', 'Brazos', 'Movimiento controlado'),
(NULL, 'Curl predicador', 'Brazos', 'Aislamiento intenso'),
(NULL, 'Press de banca cerrado', 'Brazos', 'Trabaja tríceps y pecho'),
(NULL, 'Extensiones de tríceps', 'Brazos', 'Aislamiento de tríceps'),
(NULL, 'Fondos de banca', 'Brazos', 'Ejercicio de peso corporal'),
(NULL, 'Patadas de tríceps', 'Brazos', 'Aislamiento con mancuernas'),
(NULL, 'Sentadilla con barra', 'Piernas', 'Ejercicio fundamental'),
(NULL, 'Prensa de piernas', 'Piernas', 'Máquina para piernas'),
(NULL, 'Extensiones de cuádriceps', 'Piernas', 'Aislamiento frontal'),
(NULL, 'Curl de isquiotibiales', 'Piernas', 'Trabajo de posterior'),
(NULL, 'Sentadilla búlgara', 'Piernas', 'Unilateral'),
(NULL, 'Peso muerto', 'Piernas', 'Ejercicio fundamental'),
(NULL, 'Flexiones abdominales', 'Core', 'Trabajo de abdominales'),
(NULL, 'Planchas', 'Core', 'Ejercicio isométrico'),
(NULL, 'Levantamiento de piernas colgado', 'Core', 'Intenso'),
(NULL, 'Rotaciones rusas', 'Core', 'Trabajo rotacional');

INSERT INTO public.foods (trainer_id, name, portion, calories, protein_g, carbs_g, fats_g, category) VALUES
(NULL, 'Pechuga de pollo', '100g', 165, 31, 0, 3.6, 'protein'),
(NULL, 'Huevo entero', '50g', 78, 6.3, 0.6, 5.5, 'protein'),
(NULL, 'Carne roja magra', '100g', 250, 26, 0, 15, 'protein'),
(NULL, 'Salmón', '100g', 208, 20, 0, 13, 'protein'),
(NULL, 'Yogur griego', '150g', 150, 20, 7, 5, 'protein'),
(NULL, 'Whey protein', '30g', 110, 25, 2, 1, 'protein'),
(NULL, 'Atún en lata', '100g', 132, 29.9, 0, 0.9, 'protein'),
(NULL, 'Queso cottage', '100g', 98, 11, 3.4, 5.3, 'protein'),
(NULL, 'Arroz integral', '150g', 195, 4.5, 43, 1.5, 'carb'),
(NULL, 'Batata dulce', '100g', 86, 1.6, 20, 0.1, 'carb'),
(NULL, 'Pan integral', '30g', 79, 4, 14, 1, 'carb'),
(NULL, 'Avena', '40g', 150, 5, 27, 3, 'carb'),
(NULL, 'Plátano', '100g', 89, 1.1, 23, 0.3, 'carb'),
(NULL, 'Manzana', '100g', 52, 0.3, 14, 0.2, 'carb'),
(NULL, 'Pasta integral', '100g cocinada', 124, 4.4, 25, 0.5, 'carb'),
(NULL, 'Papas hervidas', '100g', 77, 2, 17, 0.1, 'carb'),
(NULL, 'Aceite de oliva', '10ml', 90, 0, 0, 10, 'fat'),
(NULL, 'Aguacate', '100g', 160, 2, 9, 15, 'fat'),
(NULL, 'Cacahuetes', '30g', 180, 7, 7, 15, 'fat'),
(NULL, 'Nueces de Brasil', '30g', 187, 4, 3, 19, 'fat'),
(NULL, 'Almendras', '30g', 179, 6.3, 6.1, 15.1, 'fat'),
(NULL, 'Semillas de chía', '15g', 58, 2, 5, 3.3, 'fat'),
(NULL, 'Brócoli', '100g', 34, 2.8, 7, 0.4, 'neutral'),
(NULL, 'Espinaca', '100g', 23, 2.9, 3.6, 0.4, 'neutral'),
(NULL, 'Lechuga', '100g', 15, 1.2, 2.9, 0.2, 'neutral'),
(NULL, 'Tomate', '100g', 18, 0.9, 3.9, 0.2, 'neutral'),
(NULL, 'Zanahoria', '100g', 41, 0.9, 10, 0.2, 'neutral'),
(NULL, 'Pepino', '100g', 16, 0.7, 3.6, 0.1, 'neutral'),
(NULL, 'Coliflor', '100g', 25, 1.9, 5, 0.3, 'neutral'),
(NULL, 'Champiñones', '100g', 22, 3.1, 3.3, 0.3, 'neutral');
