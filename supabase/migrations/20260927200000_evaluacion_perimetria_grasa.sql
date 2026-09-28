-- Evaluación física, etapa 3: perimetría (16 medidas con historial por día) y % de grasa.

create table if not exists public.assessment_perimetry (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date check (measured_on between '2020-01-01' and current_date + 1),
  neck numeric, shoulders numeric, chest numeric, waist numeric, abdomen numeric, hips numeric,
  biceps_relaxed_l numeric, biceps_relaxed_r numeric, biceps_contracted_l numeric, biceps_contracted_r numeric,
  forearm_l numeric, forearm_r numeric, thigh_l numeric, thigh_r numeric, calf_l numeric, calf_r numeric,
  created_at timestamptz not null default now(),
  -- Un registro por día: guardar de nuevo el mismo día lo reemplaza; otro día suma un punto al historial.
  unique (student_id, teacher_id, measured_on),
  check (coalesce(neck, shoulders, chest, waist, abdomen, hips, biceps_relaxed_l, biceps_relaxed_r, biceps_contracted_l,
    biceps_contracted_r, forearm_l, forearm_r, thigh_l, thigh_r, calf_l, calf_r) is not null)
);
do $$ declare c text; begin
  foreach c in array array['neck','shoulders','chest','waist','abdomen','hips','biceps_relaxed_l','biceps_relaxed_r','biceps_contracted_l',
    'biceps_contracted_r','forearm_l','forearm_r','thigh_l','thigh_r','calf_l','calf_r'] loop
    execute format('alter table public.assessment_perimetry drop constraint if exists %I', 'perim_' || c);
    execute format('alter table public.assessment_perimetry add constraint %I check (%I between 5 and 300)', 'perim_' || c, c);
  end loop;
end $$;

create table if not exists public.assessment_bodyfat (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  tested_on date not null default current_date check (tested_on between '2020-01-01' and current_date + 1),
  protocol text not null check (protocol in ('pollock3', 'pollock7', 'jp3m', 'jp3f', 'bia', 'manual')),
  weight_kg numeric check (weight_kg between 20 and 350),
  chest numeric check (chest between 1 and 100), midaxillary numeric check (midaxillary between 1 and 100),
  triceps numeric check (triceps between 1 and 100), subscapular numeric check (subscapular between 1 and 100),
  abdomen numeric check (abdomen between 1 and 100), suprailiac numeric check (suprailiac between 1 and 100),
  thigh numeric check (thigh between 1 and 100),
  fat_pct numeric check (fat_pct between 1 and 70),
  created_at timestamptz not null default now()
);

create index if not exists perimetry_alumno on public.assessment_perimetry (student_id, teacher_id, measured_on);
create index if not exists bodyfat_alumno on public.assessment_bodyfat (student_id, teacher_id, tested_on desc, created_at desc);

do $$
declare t text; s text;
begin
  foreach t in array array['assessment_perimetry:perimetria', 'assessment_bodyfat:gordura'] loop
    s := split_part(t, ':', 2); t := split_part(t, ':', 1);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists leer on public.%I', t);
    execute format('drop policy if exists escribir on public.%I', t);
    execute format($p$create policy leer on public.%I for select using (
      teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, %L, false)))$p$, t, s);
    execute format($p$create policy escribir on public.%I for all using (
      teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, %L, true)))
      with check (teacher_id = auth.uid() or (student_id = auth.uid() and public.seccion_permitida(student_id, teacher_id, %L, true)))$p$, t, s, s);
  end loop;
end $$;

-- Las medidas de la ficha vieja pasan a ser el primer punto del historial.
insert into public.assessment_perimetry (student_id, teacher_id, measured_on, neck, shoulders, chest, waist, abdomen, hips,
  biceps_relaxed_l, biceps_relaxed_r, forearm_l, forearm_r, thigh_l, thigh_r, calf_l, calf_r)
select student_id, teacher_id, coalesce(taken_at, current_date), neck, shoulders, chest, waist, abdomen, hips,
  biceps_l, biceps_r, forearm_l, forearm_r, thigh_l, thigh_r, calf_l, calf_r
from public.assessments
where coalesce(neck, shoulders, chest, waist, abdomen, hips, biceps_l, biceps_r, forearm_l, forearm_r, thigh_l, thigh_r, calf_l, calf_r) is not null
on conflict do nothing;
