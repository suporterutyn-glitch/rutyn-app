-- Alimentos agregados a dietas antes de los nombres por idioma guardaron el nombre en español.
update public.meal_foods mf set food_name_snapshot = f.name_pt
from public.foods f
where f.id = mf.food_id and mf.food_name_snapshot = f.name_es and f.name_pt is not null;
