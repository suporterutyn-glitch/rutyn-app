-- Rutyn · Fase 9: anúncios globais

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_pt text not null,
  title_es text,
  body_pt text,
  body_es text,
  audience text not null default 'all' check (audience in ('all','teachers','students')),
  media_url text,
  cta_label_pt text,
  cta_url text,
  priority int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.announcement_views (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select using (is_active is true);

alter table public.announcement_views enable row level security;
drop policy if exists annview_self on public.announcement_views;
create policy annview_self on public.announcement_views for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed de exemplo
insert into public.announcements (title_pt, title_es, body_pt, body_es, audience, priority)
values
  ('Bem-vindo ao Rutyn!', '¡Bienvenido a Rutyn!',
   'Complete seu perfil e comece a usar todos os recursos.',
   'Completa tu perfil y empieza a usar todos los recursos.',
   'all', 10)
on conflict do nothing;
