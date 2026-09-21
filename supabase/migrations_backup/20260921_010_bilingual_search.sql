-- Bilingual search support: add Spanish translations to catalog

-- Ejercicios (Exercises)
update public.exercises set name_es = 'Sentadilla' where lower(name_pt) = 'agachamento';
update public.exercises set name_es = 'Curl de bíceps' where lower(name_pt) = 'rosca direta';
update public.exercises set name_es = 'Press plano' where lower(name_pt) = 'supino reto';

-- Create index on name_es for faster bilingual search
create index if not exists exercises_name_es_idx on public.exercises(lower(name_es));
create index if not exists foods_name_es_idx on public.foods(lower(name_es));
