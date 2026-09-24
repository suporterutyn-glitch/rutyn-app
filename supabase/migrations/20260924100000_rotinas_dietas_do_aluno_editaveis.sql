-- Rutinas y dietas del alumno pasan a ser rutinas/dietas reales y editables
-- (marcadas con student_id). student_routines/student_diets conservan período,
-- progreso y la copia en JSON que lee la app del alumno, y apuntan a ellas.

alter table public.routines add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.diets add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.student_routines
  add column if not exists routine_id uuid references public.routines(id) on delete cascade,
  add column if not exists position integer not null default 0;
alter table public.student_diets add column if not exists diet_id uuid references public.diets(id) on delete cascade;
create index if not exists routines_student_idx on public.routines(student_id);
create index if not exists diets_student_idx on public.diets(student_id);

-- Copia completa de una rutina (ejercicios, grupos y series). para_alumno null = modelo en Meus Projetos.
create or replace function public.copiar_rotina(rotina_id uuid, para_alumno uuid, nuevo_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  original public.routines%rowtype;
  nueva_id uuid;
  ex record;
  nuevo_ex_id uuid;
  grupos jsonb := '{}'::jsonb;
  gid uuid;
begin
  select * into original from public.routines where id = rotina_id and owner_id = auth.uid();
  if not found then
    raise exception 'Rotina inexistente ou de outro professor' using errcode = '42501';
  end if;
  if para_alumno is not null and not exists (
    select 1 from public.profiles where id = para_alumno and teacher_id = auth.uid()
  ) then
    raise exception 'Aluno não vinculado a este professor' using errcode = '42501';
  end if;

  insert into public.routines (owner_id, name, objective, difficulty, notes, is_favorite, student_id)
  values (original.owner_id, coalesce(nuevo_nombre, original.name), original.objective,
          original.difficulty, original.notes, false, para_alumno)
  returning id into nueva_id;

  for ex in select * from public.routine_exercises where routine_id = rotina_id order by position loop
    -- Cada bi-set/tri-set de la copia necesita su propio group_id.
    gid := null;
    if ex.group_id is not null then
      if grupos ? ex.group_id::text then
        gid := (grupos ->> ex.group_id::text)::uuid;
      else
        gid := gen_random_uuid();
        grupos := grupos || jsonb_build_object(ex.group_id::text, gid);
      end if;
    end if;
    insert into public.routine_exercises (routine_id, exercise_id, exercise_name_snapshot, position, group_type, group_id, notes)
    values (nueva_id, ex.exercise_id, ex.exercise_name_snapshot, ex.position, ex.group_type, gid, ex.notes)
    returning id into nuevo_ex_id;
    insert into public.series (routine_exercise_id, position, params, notes)
    select nuevo_ex_id, s.position, s.params, s.notes from public.series s
    where s.routine_exercise_id = ex.id order by s.position;
  end loop;
  return nueva_id;
end
$BODY$;
revoke all on function public.copiar_rotina(uuid, uuid, text) from public;
grant execute on function public.copiar_rotina(uuid, uuid, text) to authenticated;

create or replace function public.duplicar_rotina(rotina_id uuid)
returns uuid language plpgsql security definer set search_path = public as $BODY$
declare r public.routines%rowtype;
begin
  select * into r from public.routines where id = rotina_id and owner_id = auth.uid();
  if not found then raise exception 'Rotina inexistente ou de outro professor' using errcode = '42501'; end if;
  return public.copiar_rotina(rotina_id, r.student_id, r.name || ' (cópia)');
end $BODY$;

-- Rutinas ya asignadas en formato viejo: se reconstruyen desde su copia JSON.
do $$
declare
  sr record; x record; s record;
  rid uuid; reid uuid; nser int;
begin
  for sr in select * from public.student_routines where routine_id is null loop
    insert into public.routines (owner_id, name, objective, student_id, is_favorite)
    values (sr.teacher_id, sr.name, sr.objective, sr.student_id, false) returning id into rid;
    for x in select value as e, ordinality - 1 as pos from jsonb_array_elements(coalesce(sr.data->'exercises', '[]'::jsonb)) with ordinality loop
      insert into public.routine_exercises (routine_id, exercise_id, exercise_name_snapshot, position, group_type)
      values (rid,
        case when (x.e->>'exercise_id') ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.exercises where id = (x.e->>'exercise_id')::uuid) then (x.e->>'exercise_id')::uuid end,
        x.e->>'name', x.pos, coalesce(nullif(x.e->>'group_type', ''), 'single'))
      returning id into reid;
      if jsonb_typeof(x.e->'series') = 'array' then
        for s in select value as v, ordinality - 1 as pos from jsonb_array_elements(x.e->'series') with ordinality loop
          insert into public.series (routine_exercise_id, position, params, notes)
          values (reid, s.pos,
            coalesce(s.v->'params', jsonb_strip_nulls(jsonb_build_object('repetition', s.v->>'reps', 'load', s.v->>'load', 'rest', s.v->>'rest'))),
            s.v->>'notes');
        end loop;
      else
        nser := coalesce((x.e->>'series')::int, 3);
        insert into public.series (routine_exercise_id, position, params)
        select reid, g, '{"repetition":"10","rest":"90"}'::jsonb from generate_series(0, nser - 1) g;
      end if;
    end loop;
    update public.student_routines set routine_id = rid where id = sr.id;
  end loop;
end $$;

-- Dietas ya asignadas en formato viejo: los macros guardados ya son de la cantidad.
do $$
declare
  sd record; m record; f record;
  did uuid; mid uuid;
begin
  for sd in select * from public.student_diets where diet_id is null loop
    insert into public.diets (owner_id, name, goal, student_id, position)
    values (sd.teacher_id, sd.name, sd.data->>'goal', sd.student_id, 0) returning id into did;
    for m in select value as v, ordinality - 1 as pos from jsonb_array_elements(coalesce(sd.data->'meals', '[]'::jsonb)) with ordinality loop
      insert into public.meals (diet_id, name, time_of_day, position)
      values (did, m.v->>'name', nullif(m.v->>'time', ''), m.pos) returning id into mid;
      for f in select value as v, ordinality - 1 as pos from jsonb_array_elements(coalesce(m.v->'foods', '[]'::jsonb)) with ordinality loop
        insert into public.meal_foods (meal_id, food_name_snapshot, quantity, unit, position, portion_qty, calories, protein_g, carbs_g, fats_g)
        values (mid, f.v->>'name', coalesce((f.v->>'qty')::numeric, 100), lower(coalesce(nullif(trim(f.v->>'unit'), ''), 'g')), f.pos,
          coalesce((f.v->>'qty')::numeric, 100), (f.v->>'kcal')::numeric, (f.v->>'p')::numeric, (f.v->>'c')::numeric, (f.v->>'f')::numeric);
      end loop;
    end loop;
    update public.student_diets set diet_id = did where id = sd.id;
  end loop;
end $$;

-- Los tipos de refeição de las dietas convertidas, igual que en los modelos.
update public.meals set meal_type = case name
  when 'Café da Manhã' then 'cafe' when 'Lanche da Manhã' then 'lancheManha' when 'Almoço' then 'almoco'
  when 'Lanche da Tarde' then 'lancheTarde' when 'Pré-Treino' then 'preTreino' when 'Pós-Treino' then 'posTreino'
  when 'Jantar' then 'jantar' when 'Ceia' then 'ceia' else null end
where meal_type is null;

notify pgrst, 'reload schema';
