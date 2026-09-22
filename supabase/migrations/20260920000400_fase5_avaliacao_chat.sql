-- Rutyn · Fase 5: Avaliação física + Chat

-- Avaliações
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  taken_at date default current_date,
  -- Dados básicos
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  age int,
  resting_hr int,
  -- Composição corporal
  body_fat_pct numeric(5,2),
  lean_mass_kg numeric(6,2),
  -- Perimetria (cm)
  neck numeric(5,2), shoulders numeric(5,2), chest numeric(5,2),
  waist numeric(5,2), abdomen numeric(5,2), hips numeric(5,2),
  biceps_l numeric(5,2), biceps_r numeric(5,2),
  forearm_l numeric(5,2), forearm_r numeric(5,2),
  thigh_l numeric(5,2), thigh_r numeric(5,2),
  calf_l numeric(5,2), calf_r numeric(5,2),
  -- Testes de força (1RM)
  bench_1rm numeric(6,2), squat_1rm numeric(6,2), deadlift_1rm numeric(6,2),
  notes text,
  -- Permissões por seção que o aluno pode ver/editar
  student_visible_sections text[] default array['basic','composition'],
  student_editable_sections text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists assessments_student_idx on public.assessments(student_id, taken_at desc);

drop trigger if exists assessments_touch on public.assessments;
create trigger assessments_touch before update on public.assessments for each row execute function public.set_updated_at();

alter table public.assessments enable row level security;
drop policy if exists ass_teacher on public.assessments;
create policy ass_teacher on public.assessments for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists ass_student_read on public.assessments;
create policy ass_student_read on public.assessments for select using (student_id = auth.uid());

-- Anamneses (modelos globais e respostas)
create table if not exists public.anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  questions jsonb not null default '[]'::jsonb, -- [{id, label_pt, label_es, type: 'text'|'select'|'yesno'|'number', options?}]
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.anamnesis_templates enable row level security;
drop policy if exists anamnesis_read on public.anamnesis_templates;
create policy anamnesis_read on public.anamnesis_templates for select using (true);

create table if not exists public.anamnesis_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.anamnesis_templates(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists anamnesis_ans_student_idx on public.anamnesis_answers(student_id);
alter table public.anamnesis_answers enable row level security;
drop policy if exists ans_teacher on public.anamnesis_answers;
create policy ans_teacher on public.anamnesis_answers for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists ans_student on public.anamnesis_answers;
create policy ans_student on public.anamnesis_answers for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- CHAT ---------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  teacher_last_read_at timestamptz,
  student_last_read_at timestamptz,
  created_at timestamptz default now(),
  unique (teacher_id, student_id)
);
create index if not exists conv_teacher_idx on public.conversations(teacher_id, last_message_at desc);
create index if not exists conv_student_idx on public.conversations(student_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists msg_conv_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists conv_involved on public.conversations;
create policy conv_involved on public.conversations for all
  using (teacher_id = auth.uid() or student_id = auth.uid())
  with check (teacher_id = auth.uid() or student_id = auth.uid());

drop policy if exists msg_involved_read on public.messages;
create policy msg_involved_read on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.teacher_id = auth.uid() or c.student_id = auth.uid())));

drop policy if exists msg_send on public.messages;
create policy msg_send on public.messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (c.teacher_id = auth.uid() or c.student_id = auth.uid())));

-- Trigger: atualiza last_message da conversation quando insere mensagem
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = new.body, last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists msg_insert_bump on public.messages;
create trigger msg_insert_bump after insert on public.messages
  for each row execute function public.on_message_insert();

-- Habilita Realtime nas messages (Supabase Realtime lê da publication)
alter publication supabase_realtime add table public.messages;
