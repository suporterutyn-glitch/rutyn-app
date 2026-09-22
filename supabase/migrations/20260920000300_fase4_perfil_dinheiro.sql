-- Rutyn · Fase 4: campos de perfil profissional + dados bancários + moeda

alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists specialties text[] default '{}';
alter table public.profiles add column if not exists ideal_clients text[] default '{}';
alter table public.profiles add column if not exists work_formats text[] default '{}';       -- ['presencial','hibrido','online']
alter table public.profiles add column if not exists work_models text[] default '{}';        -- livre por país
alter table public.profiles add column if not exists price_hourly_min numeric(12,2);
alter table public.profiles add column if not exists price_hourly_max numeric(12,2);
alter table public.profiles add column if not exists price_monthly_min numeric(12,2);
alter table public.profiles add column if not exists price_monthly_max numeric(12,2);
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists bank_holder text;
alter table public.profiles add column if not exists bank_name text;
alter table public.profiles add column if not exists bank_agency text;
alter table public.profiles add column if not exists bank_account text;
alter table public.profiles add column if not exists pix_key text;

-- Registra pagamento da assinatura (histórico do professor); provider real vem depois via edge function
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  plan plan_t not null,
  provider text default 'manual',
  status text not null default 'active' check (status in ('active','cancelled','expired')),
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists subscriptions_teacher_idx on public.subscriptions(teacher_id, created_at desc);

alter table public.subscriptions enable row level security;
drop policy if exists sub_self on public.subscriptions;
create policy sub_self on public.subscriptions for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
