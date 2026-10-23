-- Ruty: registro de cada rutina armada con IA. Sirve para el límite del plan Gratis (1 rutina)
-- y para saber cuánto se gasta. Solo la escribe y la lee la Edge Function `ruty` (service role).
create table if not exists public.ruty_usos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  modelo text,
  segundos integer,
  costo_usd numeric(10, 5),
  created_at timestamptz not null default now()
);
create index if not exists ruty_usos_teacher_idx on public.ruty_usos (teacher_id);
alter table public.ruty_usos enable row level security;
