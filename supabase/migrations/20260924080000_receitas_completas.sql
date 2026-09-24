-- Receitas del módulo 08: categoría, preparo, tiempo, utensilios, etapas, dicas y video.
alter table public.recipes
  add column if not exists category text not null default 'outro',
  add column if not exists prep_type text not null default 'facil',
  add column if not exists time_estimate text not null default 'lt30',
  add column if not exists utensils text[] not null default '{}',
  add column if not exists steps text[] not null default '{}',
  add column if not exists tips text,
  add column if not exists video_url text,
  add column if not exists updated_at timestamptz not null default now();

-- Las instrucciones viejas (texto libre, una por línea) pasan a ser etapas.
update public.recipes
set steps = array(select trim(s) from regexp_split_to_table(instructions, E'\n+') s where trim(s) <> '')
where instructions is not null and cardinality(steps) = 0;

notify pgrst, 'reload schema';
