-- Dietas del módulo 08: orden manual, tipos de refeição, refeições personalizadas,
-- receitas copiadas dentro de la refeição y macros copiados en cada alimento.

alter table public.diets
  add column if not exists position integer,
  add column if not exists last_edited_by text not null default 'teacher';

update public.diets d set position = s.rn
from (select id, row_number() over (partition by owner_id order by created_at) - 1 as rn from public.diets) s
where d.id = s.id and d.position is null;

-- Objetivo: de texto libre al id del catálogo.
update public.diets set goal = case goal
  when 'Emagrecer' then 'weightLoss' when 'Ganhar Massa' then 'muscleGain'
  when 'Manutenção' then 'maintenance' when 'Alimentação Saudável' then 'healthyEating'
  else goal end;

-- Tipo de refeição: id del app ('cafe', 'almoco'...) o 'custom:<uuid>'. Uno por dieta.
alter table public.meals add column if not exists meal_type text;
update public.meals set meal_type = case name
  when 'Café da Manhã' then 'cafe' when 'Lanche da Manhã' then 'lancheManha' when 'Almoço' then 'almoco'
  when 'Lanche da Tarde' then 'lancheTarde' when 'Pré-Treino' then 'preTreino' when 'Pós-Treino' then 'posTreino'
  when 'Jantar' then 'jantar' when 'Ceia' then 'ceia' else null end
where meal_type is null;

create table if not exists public.custom_meals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  default_time text not null default '12:00',
  created_at timestamptz not null default now()
);
alter table public.custom_meals enable row level security;
drop policy if exists custom_meals_owner on public.custom_meals;
create policy custom_meals_owner on public.custom_meals for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Receita dentro de una refeição: copia de nombre, etapas, dicas y foto.
create table if not exists public.meal_recipes (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  recipe_id uuid,
  name text not null,
  steps text[] not null default '{}',
  tips text,
  cover_url text,
  position integer not null default 0
);
alter table public.meal_recipes enable row level security;
drop policy if exists meal_recipes_owner on public.meal_recipes;
create policy meal_recipes_owner on public.meal_recipes for all
  using (exists (select 1 from public.meals m join public.diets d on d.id = m.diet_id where m.id = meal_recipes.meal_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.meals m join public.diets d on d.id = m.diet_id where m.id = meal_recipes.meal_id and d.owner_id = auth.uid()));

alter table public.meal_foods
  add column if not exists meal_recipe_id uuid references public.meal_recipes(id) on delete cascade,
  add column if not exists name_es text,
  add column if not exists name_en text,
  add column if not exists category text,
  add column if not exists portion_qty numeric,
  add column if not exists calories numeric,
  add column if not exists protein_g numeric,
  add column if not exists carbs_g numeric,
  add column if not exists fats_g numeric;

update public.meal_foods mf set
  name_es = f.name_es, name_en = f.name_en, category = f.category, unit = coalesce(mf.unit, f.unit),
  portion_qty = f.portion_qty, calories = f.calories, protein_g = f.protein_g, carbs_g = f.carbs_g, fats_g = f.fats_g
from public.foods f
where f.id = mf.food_id and mf.portion_qty is null;

notify pgrst, 'reload schema';
