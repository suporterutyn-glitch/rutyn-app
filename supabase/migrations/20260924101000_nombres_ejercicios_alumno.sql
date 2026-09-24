-- Rutinas convertidas desde la copia vieja: el nombre del ejercicio pasa al del catálogo (PT).
update public.routine_exercises re set exercise_name_snapshot = e.name_pt
from public.exercises e, public.routines r
where e.id = re.exercise_id and r.id = re.routine_id and r.student_id is not null
  and e.name_pt is not null and re.exercise_name_snapshot is distinct from e.name_pt
  and re.exercise_name_snapshot in (e.name_es, e.name_en, e.name);
update public.routine_exercises re set exercise_name_snapshot = e.name_pt
from public.exercises e
where e.id = re.exercise_id and re.exercise_name_snapshot = 'Extensiones de tríceps';

-- La copia del alumno toma los nombres corregidos.
update public.student_routines sr set data = jsonb_set(sr.data, '{exercises}', (select coalesce(jsonb_agg(case when re.exercise_name_snapshot is not null then t.x || jsonb_build_object('name', re.exercise_name_snapshot) else t.x end order by t.ord), '[]'::jsonb) from jsonb_array_elements(sr.data->'exercises') with ordinality t(x, ord) left join public.routine_exercises re on re.routine_id = sr.routine_id and re.position = t.ord - 1)) where sr.routine_id is not null and jsonb_typeof(sr.data->'exercises') = 'array';

-- Alimentos de dietas convertidas: vínculo al catálogo y nombre en PT.
update public.meal_foods mf set food_id = f.id, food_name_snapshot = f.name_pt, name_es = f.name_es, name_en = f.name_en, category = f.category from public.foods f where mf.food_id is null and f.trainer_id is null and mf.food_name_snapshot = f.name_es and f.name_pt is not null;
