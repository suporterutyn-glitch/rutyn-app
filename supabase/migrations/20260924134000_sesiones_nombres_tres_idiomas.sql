-- Sesiones de entreno guardadas antes de que la copia del alumno llevara
-- name_pt/name_es/name_en: se completan desde el catálogo para que el
-- profesor vea cada ejercicio en su idioma. `name` (la clave del historial)
-- no se toca.
update public.workout_sessions ws
   set data = jsonb_set(ws.data, '{exercises}', (
     select jsonb_agg(
              case when ex ? 'name_pt' or cat.id is null then ex
                   else ex || jsonb_build_object('name_pt', cat.name_pt, 'name_es', cat.name_es, 'name_en', cat.name_en)
              end order by ord)
       from jsonb_array_elements(ws.data->'exercises') with ordinality as e(ex, ord)
       left join lateral (
         select c.id, c.name_pt, c.name_es, c.name_en
           from public.exercises c
          where ex->>'name' in (c.name, c.name_pt, c.name_es, c.name_en)
          order by (c.trainer_id is null) desc
          limit 1
       ) cat on true
   ))
 where jsonb_typeof(ws.data->'exercises') = 'array'
   and exists (select 1 from jsonb_array_elements(ws.data->'exercises') x where not x ? 'name_pt');
