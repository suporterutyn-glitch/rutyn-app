-- Evaluación física, etapa 2: 1RM, resistencia aeróbica y resistencia muscular.
-- Historial explícito: cada prueba es una fila con fecha (la app original pisaba el registro).

-- ¿El alumno puede ver/editar esta sección de su ficha con ese profesor?
create or replace function public.seccion_permitida(p_student uuid, p_teacher uuid, p_seccion text, p_editar boolean)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.assessments a
    join public.profiles p on p.id = a.student_id and p.teacher_id = a.teacher_id and p.link_status = 'active'
    where a.student_id = p_student and a.teacher_id = p_teacher
      and p_seccion = any(case when p_editar then a.student_editable_sections else a.student_visible_sections end)
  )
$$;
revoke all on function public.seccion_permitida(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.seccion_permitida(uuid, uuid, text, boolean) to authenticated;

create table if not exists public.assessment_rm_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null check (length(trim(exercise_name)) > 0),
  load_kg numeric not null check (load_kg > 0 and load_kg <= 1000),
  reps integer not null check (reps between 1 and 100),
  tested_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_aerobic_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  protocol text not null check (protocol in ('cooper12', 'cooper6', 'rockport', 'beep')),
  distance_m numeric check (distance_m > 0 and distance_m < 10000),
  time_min numeric check (time_min > 0 and time_min < 60),
  final_hr integer check (final_hr between 40 and 250),
  weight_kg numeric check (weight_kg between 20 and 350),
  level integer check (level between 1 and 21),
  shuttles integer check (shuttles between 0 and 16),
  tested_on date not null default current_date check (tested_on between '2020-01-01' and current_date + 1),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_muscular_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  situps integer check (situps between 0 and 200),
  plank_s integer check (plank_s between 0 and 3600),
  pushups integer check (pushups between 0 and 200),
  squats integer check (squats between 0 and 300),
  tested_on date not null default current_date check (tested_on between '2020-01-01' and current_date + 1),
  notes text,
  created_at timestamptz not null default now(),
  check (coalesce(situps, plank_s, pushups, squats) is not null)
);

create index if not exists rm_tests_alumno on public.assessment_rm_tests (student_id, teacher_id, created_at);
create index if not exists aerobic_tests_alumno on public.assessment_aerobic_tests (student_id, teacher_id, tested_on desc, created_at desc);
create index if not exists muscular_tests_alumno on public.assessment_muscular_tests (student_id, teacher_id, tested_on desc, created_at desc);

do $$
declare
  t text; s text;
begin
  foreach t in array array['assessment_rm_tests:rm', 'assessment_aerobic_tests:aerobica', 'assessment_muscular_tests:muscular'] loop
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
