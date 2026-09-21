-- Rutyn · Fase 2: núcleo do professor
-- Tabelas: rotinas, exercícios, séries, dietas, alimentos, receitas,
-- cópias do aluno, agenda, notificações, mensalidades, hidratação.

------------------------------------------------------------
-- Enums
------------------------------------------------------------
do $$ begin create type charge_status_t as enum ('pending','awaiting','paid','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type charge_format_t as enum ('monthly','hourly'); exception when duplicate_object then null; end $$;
do $$ begin create type notif_type_t as enum ('info','warning','invite','payment','evaluation','routine','system'); exception when duplicate_object then null; end $$;
do $$ begin create type appt_type_t as enum ('training','evaluation','meeting','other'); exception when duplicate_object then null; end $$;

------------------------------------------------------------
-- Catálogos globais (admin-managed) e criações do professor
------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,  -- null = catálogo global
  name_pt text not null,
  name_es text,
  muscle_groups text[] default '{}',
  category text,
  media_url text,
  media_type text check (media_type in ('gif','video','youtube','image')),
  cover_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists exercises_owner_idx on public.exercises(owner_id);
create index if not exists exercises_name_pt_idx on public.exercises(lower(name_pt));

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name_pt text not null,
  name_es text,
  category text check (category in ('protein','carb','fat','neutral','calories')),
  unit text default 'g',
  portion numeric(10,2) default 100,
  kcal numeric(10,2) default 0,
  protein numeric(10,2) default 0,
  carb numeric(10,2) default 0,
  fat numeric(10,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists foods_owner_idx on public.foods(owner_id);

------------------------------------------------------------
-- Rotinas (modelos do professor)
------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  objective text,
  difficulty text,
  notes text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists routines_owner_idx on public.routines(owner_id);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name_snapshot text,
  position int not null default 0,
  group_type text check (group_type in ('single','biset','triset')) default 'single',
  group_id uuid, -- agrupa exercícios num bi/tri-set
  notes text
);
create index if not exists routine_exercises_routine_idx on public.routine_exercises(routine_id);

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises(id) on delete cascade,
  position int not null default 0,
  params jsonb not null default '{}'::jsonb, -- { reps, load, rest, cadence, ... }
  notes text
);
create index if not exists series_routine_exercise_idx on public.series(routine_exercise_id);

------------------------------------------------------------
-- Dietas (modelos do professor)
------------------------------------------------------------
create table if not exists public.diets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  goal text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists diets_owner_idx on public.diets(owner_id);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  diet_id uuid not null references public.diets(id) on delete cascade,
  name text not null,
  time_of_day text, -- '07:00'
  position int not null default 0
);
create index if not exists meals_diet_idx on public.meals(diet_id);

create table if not exists public.meal_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name_snapshot text,
  quantity numeric(10,2) not null default 100,
  unit text default 'g',
  position int not null default 0
);
create index if not exists meal_foods_meal_idx on public.meal_foods(meal_id);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  instructions text,
  cover_url text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);
create index if not exists recipes_owner_idx on public.recipes(owner_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name_snapshot text,
  quantity numeric(10,2) default 100,
  unit text default 'g',
  position int not null default 0
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);

------------------------------------------------------------
-- Cópias atribuídas ao aluno (independentes do modelo)
------------------------------------------------------------
create table if not exists public.student_routines (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  source_routine_id uuid references public.routines(id) on delete set null,
  name text not null,
  objective text,
  starts_on date,
  ends_on date,
  weekdays int[] default '{}', -- 0..6
  frequency int,
  is_hidden boolean default false,
  estimated_workouts int default 0,
  completed_workouts int default 0,
  data jsonb default '{}'::jsonb, -- snapshot dos exercícios/séries
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists sr_student_idx on public.student_routines(student_id);
create index if not exists sr_teacher_idx on public.student_routines(teacher_id);

create table if not exists public.student_diets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  source_diet_id uuid references public.diets(id) on delete set null,
  name text not null,
  cycle_start date default current_date,
  cycle_position int not null default 0,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists sd_student_idx on public.student_diets(student_id);

------------------------------------------------------------
-- Agenda de compromissos
------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  title text not null,
  kind appt_type_t default 'training',
  starts_at timestamptz not null,
  ends_at timestamptz,
  notify_student boolean default true,
  notes text,
  created_at timestamptz default now()
);
create index if not exists appts_teacher_time_idx on public.appointments(teacher_id, starts_at);

------------------------------------------------------------
-- Notificações
------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notif_type_t not null default 'info',
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notif_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notif_user_unread_idx on public.notifications(user_id) where read_at is null;

------------------------------------------------------------
-- Mensalidades (aluno paga fora do app; professor gerencia aqui)
------------------------------------------------------------
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  format charge_format_t not null default 'monthly',
  amount numeric(12,2) not null,
  hours numeric(6,2),
  due_date date not null,
  status charge_status_t not null default 'pending',
  student_declared_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists charges_teacher_idx on public.charges(teacher_id, due_date desc);
create index if not exists charges_student_idx on public.charges(student_id, due_date desc);

------------------------------------------------------------
-- Hidratação
------------------------------------------------------------
create table if not exists public.hydration_days (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  target_ml int not null default 2500,
  ml int not null default 0,
  unique (student_id, day)
);

------------------------------------------------------------
-- Views auxiliares (contadores derivados, nunca gravados)
------------------------------------------------------------
create or replace view public.v_teacher_stats as
select
  p.id as teacher_id,
  (select count(*) from public.profiles s where s.teacher_id = p.id and s.link_status = 'active') as active_students,
  (select count(*) from public.invites i where i.teacher_id = p.id and i.status in ('pending','countered')) as pending_invites,
  (select coalesce(sum(amount),0) from public.charges c where c.teacher_id = p.id and c.status = 'paid' and date_trunc('month', c.paid_at) = date_trunc('month', now())) as month_received,
  (select count(*) from public.notifications n where n.user_id = p.id and n.read_at is null) as unread_notifications
from public.profiles p
where p.role = 'teacher';

------------------------------------------------------------
-- Triggers updated_at
------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array['exercises','routines','diets','student_routines','student_diets','charges'] loop
    execute format('drop trigger if exists %I on public.%I', tbl||'_touch', tbl);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', tbl||'_touch', tbl);
  end loop;
end $$;

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.foods enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.series enable row level security;
alter table public.diets enable row level security;
alter table public.meals enable row level security;
alter table public.meal_foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.student_routines enable row level security;
alter table public.student_diets enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;
alter table public.charges enable row level security;
alter table public.hydration_days enable row level security;

-- Exercises / foods: dono OU global (owner null)
drop policy if exists exercises_read on public.exercises;
create policy exercises_read on public.exercises for select using (owner_id is null or owner_id = auth.uid());
drop policy if exists exercises_write on public.exercises;
create policy exercises_write on public.exercises for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists foods_read on public.foods;
create policy foods_read on public.foods for select using (owner_id is null or owner_id = auth.uid());
drop policy if exists foods_write on public.foods;
create policy foods_write on public.foods for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Routines: dono
drop policy if exists routines_owner on public.routines;
create policy routines_owner on public.routines for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Routine_exercises + series: acesso pelo dono da rotina
drop policy if exists re_owner on public.routine_exercises;
create policy re_owner on public.routine_exercises for all
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = auth.uid()));

drop policy if exists series_owner on public.series;
create policy series_owner on public.series for all
  using (exists (select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id where re.id = routine_exercise_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id where re.id = routine_exercise_id and r.owner_id = auth.uid()));

-- Diets / meals / meal_foods
drop policy if exists diets_owner on public.diets;
create policy diets_owner on public.diets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists meals_owner on public.meals;
create policy meals_owner on public.meals for all
  using (exists (select 1 from public.diets d where d.id = diet_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.diets d where d.id = diet_id and d.owner_id = auth.uid()));

drop policy if exists meal_foods_owner on public.meal_foods;
create policy meal_foods_owner on public.meal_foods for all
  using (exists (select 1 from public.meals m join public.diets d on d.id = m.diet_id where m.id = meal_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.meals m join public.diets d on d.id = m.diet_id where m.id = meal_id and d.owner_id = auth.uid()));

-- Recipes
drop policy if exists recipes_owner on public.recipes;
create policy recipes_owner on public.recipes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists recipe_ings_owner on public.recipe_ingredients;
create policy recipe_ings_owner on public.recipe_ingredients for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));

-- Student copies: professor lê/escreve tudo; aluno lê/atualiza a sua cópia
drop policy if exists sr_teacher_all on public.student_routines;
create policy sr_teacher_all on public.student_routines for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists sr_student_read on public.student_routines;
create policy sr_student_read on public.student_routines for select using (student_id = auth.uid());
drop policy if exists sr_student_update on public.student_routines;
create policy sr_student_update on public.student_routines for update using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists sd_teacher_all on public.student_diets;
create policy sd_teacher_all on public.student_diets for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists sd_student_read on public.student_diets;
create policy sd_student_read on public.student_diets for select using (student_id = auth.uid());

-- Appointments
drop policy if exists appts_teacher on public.appointments;
create policy appts_teacher on public.appointments for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists appts_student_read on public.appointments;
create policy appts_student_read on public.appointments for select using (student_id = auth.uid());

-- Notifications: dono lê/atualiza
drop policy if exists notif_self on public.notifications;
create policy notif_self on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Charges: envolvidos leem, professor escreve; aluno atualiza só student_declared_at (regra simplificada: aluno pode update)
drop policy if exists charges_teacher on public.charges;
create policy charges_teacher on public.charges for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists charges_student_read on public.charges;
create policy charges_student_read on public.charges for select using (student_id = auth.uid());
drop policy if exists charges_student_declare on public.charges;
create policy charges_student_declare on public.charges for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Hydration: aluno é dono
drop policy if exists hydration_owner on public.hydration_days;
create policy hydration_owner on public.hydration_days for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists hydration_teacher_read on public.hydration_days;
create policy hydration_teacher_read on public.hydration_days for select
  using (exists (select 1 from public.profiles s where s.id = student_id and s.teacher_id = auth.uid()));
