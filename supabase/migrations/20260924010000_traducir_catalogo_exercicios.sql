-- El catálogo de ejercicios estaba solo en español y con el grupo muscular
-- como texto libre ("Pecho", "Core"), que no coincide con los ids del catálogo
-- oficial (muscle_groups de enums.json). Por eso los chips y los filtros de
-- grupo no encontraban nada.
--
-- Acá se traduce a los tres idiomas de la app y se normalizan grupos y
-- categoría. `name` se conserva como estaba: es lo que ya quedó copiado en las
-- rutinas existentes y no hay que romperlo.

alter table public.exercises add column if not exists name_pt text;
alter table public.exercises add column if not exists name_es text;
alter table public.exercises add column if not exists name_en text;
alter table public.exercises add column if not exists description_pt text;
alter table public.exercises add column if not exists description_es text;
alter table public.exercises add column if not exists description_en text;

update public.exercises e
set name_pt = t.name_pt,
    name_es = t.name_es,
    name_en = t.name_en,
    muscle_groups = t.grupos,
    muscle_group = t.grupos[1],
    category = t.categoria,
    description_pt = t.desc_pt,
    description_es = t.desc_es,
    description_en = t.desc_en
from (values
  ('Aperturas con mancuernas', 'Crucifixo com halteres', 'Aperturas con mancuernas', 'Dumbbell fly', array['chest'], 'musculacao', 'Isolamento de peito', 'Aislamiento del pecho', 'Chest isolation'),
  ('Curl con barra', 'Rosca direta com barra', 'Curl con barra', 'Barbell curl', array['biceps'], 'musculacao', 'Exercício base para bíceps', 'Ejercicio fundamental para bíceps', 'Core biceps exercise'),
  ('Curl con mancuernas', 'Rosca com halteres', 'Curl con mancuernas', 'Dumbbell curl', array['biceps'], 'musculacao', 'Variante com halteres', 'Variante con mancuernas', 'Dumbbell variation'),
  ('Curl de isquiotibiales', 'Flexora deitada', 'Curl femoral', 'Lying leg curl', array['hamstrings'], 'musculacao', 'Trabalho de posterior de coxa', 'Trabajo de isquiotibiales', 'Hamstring work'),
  ('Curl en máquina', 'Rosca na máquina', 'Curl en máquina', 'Machine curl', array['biceps'], 'musculacao', 'Movimento controlado', 'Movimiento controlado', 'Controlled movement'),
  ('Curl predicador', 'Rosca scott', 'Curl predicador', 'Preacher curl', array['biceps'], 'musculacao', 'Isolamento intenso', 'Aislamiento intenso', 'Intense isolation'),
  ('Dominadas', 'Barra fixa', 'Dominadas', 'Pull-up', array['back','biceps'], 'calistenia', 'Peso corporal para as costas', 'Peso corporal para la espalda', 'Bodyweight back exercise'),
  ('Elevaciones laterales', 'Elevação lateral', 'Elevaciones laterales', 'Lateral raise', array['shoulders'], 'musculacao', 'Isolamento de deltoides', 'Aislamiento de deltoides', 'Deltoid isolation'),
  ('Encogimientos de hombros', 'Encolhimento de ombros', 'Encogimientos de hombros', 'Shrug', array['traps'], 'musculacao', 'Trabalho de trapézio', 'Trabajo de trapecios', 'Trap work'),
  ('Extensiones de cuádriceps', 'Cadeira extensora', 'Extensiones de cuádriceps', 'Leg extension', array['quadriceps'], 'musculacao', 'Isolamento frontal de coxa', 'Aislamiento frontal', 'Quad isolation'),
  ('Extensiones de tríceps', 'Extensão de tríceps', 'Extensiones de tríceps', 'Triceps extension', array['triceps'], 'musculacao', 'Isolamento de tríceps', 'Aislamiento de tríceps', 'Triceps isolation'),
  ('Flexiones abdominales', 'Abdominal supra', 'Abdominales', 'Crunch', array['abs'], 'calistenia', 'Trabalho de abdômen', 'Trabajo de abdominales', 'Abdominal work'),
  ('Fondos de banca', 'Mergulho no banco', 'Fondos en banco', 'Bench dip', array['triceps','chest'], 'calistenia', 'Peso corporal para tríceps', 'Peso corporal para tríceps', 'Bodyweight triceps'),
  ('Jalón lat', 'Puxada frontal', 'Jalón al pecho', 'Lat pulldown', array['back'], 'musculacao', 'Isolamento de dorsais', 'Aislamiento de dorsales', 'Lat isolation'),
  ('Levantamiento de piernas colgado', 'Elevação de pernas suspenso', 'Elevación de piernas colgado', 'Hanging leg raise', array['abs'], 'calistenia', 'Abdômen inferior, intenso', 'Abdomen inferior, intenso', 'Lower abs, intense'),
  ('Patadas de tríceps', 'Tríceps coice', 'Patada de tríceps', 'Triceps kickback', array['triceps'], 'musculacao', 'Isolamento com halteres', 'Aislamiento con mancuernas', 'Dumbbell isolation'),
  ('Peso muerto', 'Levantamento terra', 'Peso muerto', 'Deadlift', array['hamstrings','glutes','lowerBack'], 'musculacao', 'Exercício base de cadeia posterior', 'Ejercicio fundamental de cadena posterior', 'Posterior chain staple'),
  ('Planchas', 'Prancha', 'Plancha', 'Plank', array['abs'], 'isometria', 'Exercício isométrico', 'Ejercicio isométrico', 'Isometric exercise'),
  ('Prensa de piernas', 'Leg press', 'Prensa de piernas', 'Leg press', array['quadriceps','glutes'], 'musculacao', 'Máquina para pernas', 'Máquina para piernas', 'Machine leg exercise'),
  ('Press con mancuernas', 'Desenvolvimento com halteres', 'Press de hombros con mancuernas', 'Dumbbell shoulder press', array['shoulders'], 'musculacao', 'Variante com halteres', 'Variante con mancuernas', 'Dumbbell variation'),
  ('Press de banca cerrado', 'Supino fechado', 'Press de banca cerrado', 'Close-grip bench press', array['triceps','chest'], 'musculacao', 'Trabalha tríceps e peito', 'Trabaja tríceps y pecho', 'Triceps and chest'),
  ('Press de banca con barra', 'Supino reto com barra', 'Press de banca con barra', 'Barbell bench press', array['chest','triceps'], 'musculacao', 'Exercício base para peito', 'Ejercicio fundamental para el pecho', 'Core chest exercise'),
  ('Press en máquina', 'Supino na máquina', 'Press en máquina', 'Machine chest press', array['chest'], 'musculacao', 'Movimento controlado, bom para iniciantes', 'Movimiento controlado para principiantes', 'Controlled, beginner friendly'),
  ('Press inclinado con mancuernas', 'Supino inclinado com halteres', 'Press inclinado con mancuernas', 'Incline dumbbell press', array['chest','shoulders'], 'musculacao', 'Trabalha a parte superior do peito', 'Trabaja la parte superior del pecho', 'Upper chest'),
  ('Press militar', 'Desenvolvimento militar', 'Press militar', 'Overhead press', array['shoulders'], 'musculacao', 'Exercício base para ombros', 'Fundamental para hombros', 'Core shoulder exercise'),
  ('Remo con barra', 'Remada curvada com barra', 'Remo con barra', 'Barbell row', array['back','biceps'], 'musculacao', 'Movimento base para costas', 'Movimiento fundamental para espalda', 'Core back movement'),
  ('Remo con mancuernas', 'Remada unilateral com halter', 'Remo con mancuerna', 'One-arm dumbbell row', array['back','biceps'], 'musculacao', 'Trabalho unilateral de costas', 'Trabajo unilateral de espalda', 'Unilateral back work'),
  ('Rotaciones rusas', 'Rotação russa', 'Rotación rusa', 'Russian twist', array['abs'], 'funcional', 'Trabalho rotacional', 'Trabajo rotacional', 'Rotational work'),
  ('Sentadilla búlgara', 'Agachamento búlgaro', 'Sentadilla búlgara', 'Bulgarian split squat', array['quadriceps','glutes'], 'musculacao', 'Unilateral de pernas', 'Unilateral de piernas', 'Unilateral leg work'),
  ('Sentadilla con barra', 'Agachamento com barra', 'Sentadilla con barra', 'Barbell squat', array['quadriceps','glutes'], 'musculacao', 'Exercício base para pernas', 'Ejercicio fundamental para piernas', 'Core leg exercise')
) as t(actual, name_pt, name_es, name_en, grupos, categoria, desc_pt, desc_es, desc_en)
where e.name = t.actual and e.trainer_id is null;

notify pgrst, 'reload schema';
