-- Agregar videos de MuscleWiki a los 30 ejercicios del catálogo global
-- Los videos fueron descargados y validados del catálogo público de MuscleWiki
-- Cada video es un MP4 directo desde media.musclewiki.com con validación de contenido

update public.exercises e
set video_url = t.video_url,
    media_type = t.media_type,
    equipment = t.equipment
from (values
  ('Aperturas con mancuernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-chest-fly-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Curl con barra', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-curl-front.mp4', 'video/mp4', 'Barra'),
  ('Curl con mancuernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Curl de isquiotibiales', 'https://media.musclewiki.com/media/uploads/videos/branded/male-band-leg-curl-front.mp4', 'video/mp4', 'Elástico'),
  ('Curl en máquina', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-crunch-front.mp4', 'video/mp4', 'Máquina'),
  ('Curl predicador', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-preacher-curl-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Dominadas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-pullup-front.mp4', 'video/mp4', 'Peso corporal'),
  ('Elevaciones laterales', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-lateral-raise-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Encogimientos de hombros', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-shrug-front.mp4', 'video/mp4', 'Elástico'),
  ('Extensiones de cuádriceps', 'https://media.musclewiki.com/media/uploads/videos/branded/male-machine-leg-extension-front.mp4', 'video/mp4', 'Máquina'),
  ('Extensiones de tríceps', 'https://media.musclewiki.com/media/uploads/videos/branded/male-cable-wrist-curl-front.mp4', 'video/mp4', 'Polea'),
  ('Flexiones abdominales', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-crunch-front.mp4', 'video/mp4', 'Elástico'),
  ('Fondos de banca', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bench-dips-front.mp4', 'video/mp4', 'Peso corporal'),
  ('Jalón lat', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-narrow-pulldown-front.mp4', 'video/mp4', 'Máquina'),
  ('Levantamiento de piernas colgado', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-laying-leg-raises-front.mp4', 'video/mp4', 'Peso corporal'),
  ('Patadas de tríceps', 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-tricep-kickback-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Peso muerto', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-deadlift-front.mp4', 'video/mp4', 'Barra'),
  ('Planchas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-hand-plank-front.mp4', 'video/mp4', 'Peso corporal'),
  ('Prensa de piernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-leg-press-front.mp4', 'video/mp4', 'Elástico'),
  ('Press con mancuernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-arnold-press-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Press de banca cerrado', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-close-grip-bench-press-front.mp4', 'video/mp4', 'Barra'),
  ('Press de banca con barra', 'https://media.musclewiki.com/media/uploads/videos/branded/male-dumbbell-bench-press-front_y8zKZJl.mp4', 'video/mp4', 'Mancuerna'),
  ('Press en máquina', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Machine-machine-chest-press-front.mp4', 'video/mp4', 'Máquina'),
  ('Press inclinado con mancuernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-push-press-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Press militar', 'https://media.musclewiki.com/media/uploads/videos/branded/male-cable-overhead-press-front.mp4', 'video/mp4', 'Polea'),
  ('Remo con barra', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-curl-front.mp4', 'video/mp4', 'Barra'),
  ('Remo con mancuernas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Dumbbells-dumbbell-curl-front.mp4', 'video/mp4', 'Mancuerna'),
  ('Rotaciones rusas', 'https://media.musclewiki.com/media/uploads/videos/branded/male-plate-russian-twist-front.mp4', 'video/mp4', 'Disco'),
  ('Sentadilla búlgara', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bulgarian-split-squat-front.mp4', 'video/mp4', 'Peso corporal'),
  ('Sentadilla con barra', 'https://media.musclewiki.com/media/uploads/videos/branded/male-Barbell-barbell-squat-front.mp4', 'video/mp4', 'Barra')
) as t(exercise_name, video_url, media_type, equipment)
where e.name = t.exercise_name and e.trainer_id is null;

notify pgrst, 'reload schema';

select count(*) as videos_added from public.exercises where trainer_id is null and video_url like 'https://media.musclewiki.com%';
