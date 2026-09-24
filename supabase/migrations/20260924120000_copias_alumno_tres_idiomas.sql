-- Las copias que lee el alumno pasan a llevar el nombre del ejercicio en los tres
-- idiomas y los grupos musculares: cada alumno lo ve en su idioma.
update public.student_routines sr
set data = jsonb_set(sr.data, '{exercises}', (
  select coalesce(jsonb_agg(
    case when e.id is not null then t.x || jsonb_build_object(
      'name_pt', e.name_pt, 'name_es', e.name_es, 'name_en', e.name_en,
      'muscle_group', e.muscle_group, 'muscle_groups', to_jsonb(e.muscle_groups))
    else t.x end order by t.ord), '[]'::jsonb)
  from jsonb_array_elements(sr.data->'exercises') with ordinality t(x, ord)
  left join public.exercises e on e.id::text = t.x->>'exercise_id'
))
where jsonb_typeof(sr.data->'exercises') = 'array';

-- Dietas: nombre del alimento en los tres idiomas y el tipo de refeição.
update public.student_diets sd
set data = jsonb_set(sd.data, '{meals}', (
  select coalesce(jsonb_agg(
    t.m || jsonb_build_object('meal_type', (
      select ml.meal_type from public.meals ml where ml.diet_id = sd.diet_id and ml.name = t.m->>'name' limit 1
    ), 'foods', (
      select coalesce(jsonb_agg(
        case when f.id is not null then u.f || jsonb_build_object('name_pt', f.name_pt, 'name_es', f.name_es, 'name_en', f.name_en)
        else u.f end order by u.o), '[]'::jsonb)
      from jsonb_array_elements(t.m->'foods') with ordinality u(f, o)
      left join public.foods f on f.trainer_id is null and (f.name_pt = u.f->>'name' or f.name_es = u.f->>'name')
    )) order by t.ord), '[]'::jsonb)
  from jsonb_array_elements(sd.data->'meals') with ordinality t(m, ord)
))
where jsonb_typeof(sd.data->'meals') = 'array';
