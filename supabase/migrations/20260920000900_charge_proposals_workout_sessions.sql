-- Rutyn · Fase 10: propostas de alteração de cobrança + histórico de sessões de treino

-- Propostas de alteração de cobrança (professor propõe; aluno aceita/recusa)
create table if not exists public.charge_change_proposals (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  new_format charge_format_t not null,
  new_amount numeric(12,2) not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  responded_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists ccp_student_idx on public.charge_change_proposals(student_id, status);

alter table public.charge_change_proposals enable row level security;
drop policy if exists ccp_teacher on public.charge_change_proposals;
create policy ccp_teacher on public.charge_change_proposals for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists ccp_student on public.charge_change_proposals;
create policy ccp_student on public.charge_change_proposals for update using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists ccp_student_read on public.charge_change_proposals;
create policy ccp_student_read on public.charge_change_proposals for select using (student_id = auth.uid());

-- Histórico de sessões de treino (execuções concluídas)
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_routine_id uuid not null references public.student_routines(id) on delete cascade,
  started_at timestamptz not null default now(),
  duration_seconds int not null default 0,
  data jsonb not null default '{}'::jsonb, -- { exercises: [{name, series: [{done,load,reps}]}], effort? }
  effort_1_5 int,
  created_at timestamptz default now()
);
create index if not exists ws_student_idx on public.workout_sessions(student_id, started_at desc);
create index if not exists ws_routine_idx on public.workout_sessions(student_routine_id, started_at desc);

alter table public.workout_sessions enable row level security;
drop policy if exists ws_self on public.workout_sessions;
create policy ws_self on public.workout_sessions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists ws_teacher_read on public.workout_sessions;
create policy ws_teacher_read on public.workout_sessions for select
  using (exists (select 1 from public.profiles p where p.id = student_id and p.teacher_id = auth.uid()));
