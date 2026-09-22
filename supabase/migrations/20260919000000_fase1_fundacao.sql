-- Rutyn · Fase 1: Fundação (perfis, vínculo, planos)
-- Idempotente; roda em Supabase Postgres com RLS ativado por padrão.

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type role_t as enum ('teacher','student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status_t as enum ('active','deactivated','deleting');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_status_t as enum ('none','pending','active','suspended','ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_t as enum ('M','F','X');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_t as enum ('free','pro','master','elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lang_t as enum ('pt','es');
exception when duplicate_object then null; end $$;

-- Tabela de perfis (1:1 com auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_t not null,
  account_status account_status_t not null default 'active',
  link_status link_status_t not null default 'none',
  full_name text,
  email text,
  phone text,
  country text,             -- código ISO2
  language lang_t,
  gender gender_t,
  avatar_url text,
  profile_complete boolean not null default false,
  teacher_id uuid references public.profiles(id) on delete set null,
  -- Só para professores:
  plan plan_t,
  plan_expires_at timestamptz,
  marketplace_visible boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_teacher_idx on public.profiles(teacher_id);
create index if not exists profiles_role_idx on public.profiles(role);

-- Convites aluno→professor (proposta)
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','countered','cancelled')),
  format text check (format in ('monthly','hourly')),
  amount numeric(12,2),
  frequency int,
  weekdays int[],
  model text,
  objectives text[],
  notes text,
  last_offer_by text check (last_offer_by in ('student','teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invites_student_idx on public.invites(student_id);
create index if not exists invites_teacher_idx on public.invites(teacher_id);

-- Trigger: cria linha em profiles quando auth.users é criada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role role_t := coalesce((meta->>'role')::role_t, 'student');
begin
  insert into public.profiles (
    id, role, email, full_name, phone, country, language, gender,
    plan
  ) values (
    new.id,
    v_role,
    new.email,
    meta->>'full_name',
    meta->>'phone',
    meta->>'country',
    nullif(meta->>'language','')::lang_t,
    nullif(meta->>'gender','')::gender_t,
    case when v_role = 'teacher' then 'free'::plan_t else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists invites_touch on public.invites;
create trigger invites_touch before update on public.invites
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.invites enable row level security;

-- Profiles: o dono lê/atualiza a própria linha
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Professor lê perfis dos próprios alunos
drop policy if exists profiles_teacher_reads_students on public.profiles;
create policy profiles_teacher_reads_students on public.profiles
  for select using (
    teacher_id is not null and teacher_id = auth.uid()
  );

-- Aluno lê perfil do seu professor
drop policy if exists profiles_student_reads_teacher on public.profiles;
create policy profiles_student_reads_teacher on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.teacher_id = profiles.id
    )
  );

-- Marketplace: qualquer autenticado lê professor com marketplace_visible=true e perfil completo
drop policy if exists profiles_marketplace on public.profiles;
create policy profiles_marketplace on public.profiles
  for select using (
    role = 'teacher' and marketplace_visible is true and profile_complete is true
  );

-- Invites: envolvidos podem ler
drop policy if exists invites_involved_select on public.invites;
create policy invites_involved_select on public.invites
  for select using (student_id = auth.uid() or teacher_id = auth.uid());

drop policy if exists invites_student_insert on public.invites;
create policy invites_student_insert on public.invites
  for insert with check (student_id = auth.uid());

drop policy if exists invites_involved_update on public.invites;
create policy invites_involved_update on public.invites
  for update using (student_id = auth.uid() or teacher_id = auth.uid());
