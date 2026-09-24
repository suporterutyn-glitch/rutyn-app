-- Alimentos: nombre por idioma, porción numérica + unidad y las 5 categorías del módulo 08.
alter table public.foods add column if not exists name_pt text, add column if not exists name_es text,
  add column if not exists name_en text, add column if not exists portion_qty numeric, add column if not exists unit text;

-- Unidad y cantidad salen del texto de porción ('100g', '10ml', '100g cocinada').
update public.foods set
  portion_qty = coalesce(nullif(substring(portion from '([0-9]+(?:[.,][0-9]+)?)'), '')::numeric, 100),
  unit = case
    when portion ~* '[0-9]\s*kg' then 'kg'
    when portion ~* '[0-9]\s*ml' then 'ml'
    when portion ~* '[0-9]\s*l\b' then 'l'
    when portion ~* 'uni' then 'uni'
    else 'g' end
where portion_qty is null;

update public.foods set category = case category
  when 'protein' then 'protein' when 'carb' then 'carb' when 'fat' then 'fat' when 'calories' then 'calories' else 'none' end;

-- El texto de porción queda normalizado: lo sigue leyendo el editor de dietas para los macros.
update public.foods set portion = trim(to_char(portion_qty, 'FM999990.##')) || case unit when 'uni' then 'Uni' when 'kg' then 'Kg' when 'l' then 'L' else unit end;

update public.foods set name='Arroz integral', name_pt='Arroz integral', name_es='Arroz integral', name_en='Brown rice' where trainer_id is null and name='Arroz integral';
update public.foods set name='Aveia em flocos', name_pt='Aveia em flocos', name_es='Avena', name_en='Rolled oats' where trainer_id is null and name='Avena';
update public.foods set name='Batata-doce', name_pt='Batata-doce', name_es='Batata dulce', name_en='Sweet potato' where trainer_id is null and name='Batata dulce';
update public.foods set name='Maçã', name_pt='Maçã', name_es='Manzana', name_en='Apple' where trainer_id is null and name='Manzana';
update public.foods set name='Pão integral', name_pt='Pão integral', name_es='Pan integral', name_en='Whole wheat bread' where trainer_id is null and name='Pan integral';
update public.foods set name='Batata cozida', name_pt='Batata cozida', name_es='Papas hervidas', name_en='Boiled potatoes' where trainer_id is null and name='Papas hervidas';
update public.foods set name='Macarrão integral cozido', name_pt='Macarrão integral cozido', name_es='Pasta integral', name_en='Cooked whole wheat pasta' where trainer_id is null and name='Pasta integral';
update public.foods set name='Banana', name_pt='Banana', name_es='Plátano', name_en='Banana' where trainer_id is null and name='Plátano';
update public.foods set name='Azeite de oliva', name_pt='Azeite de oliva', name_es='Aceite de oliva', name_en='Olive oil' where trainer_id is null and name='Aceite de oliva';
update public.foods set name='Abacate', name_pt='Abacate', name_es='Aguacate', name_en='Avocado' where trainer_id is null and name='Aguacate';
update public.foods set name='Amêndoas', name_pt='Amêndoas', name_es='Almendras', name_en='Almonds' where trainer_id is null and name='Almendras';
update public.foods set name='Amendoim', name_pt='Amendoim', name_es='Cacahuetes', name_en='Peanuts' where trainer_id is null and name='Cacahuetes';
update public.foods set name='Castanha-do-pará', name_pt='Castanha-do-pará', name_es='Nueces de Brasil', name_en='Brazil nuts' where trainer_id is null and name='Nueces de Brasil';
update public.foods set name='Sementes de chia', name_pt='Sementes de chia', name_es='Semillas de chía', name_en='Chia seeds' where trainer_id is null and name='Semillas de chía';
update public.foods set name='Brócolis', name_pt='Brócolis', name_es='Brócoli', name_en='Broccoli' where trainer_id is null and name='Brócoli';
update public.foods set name='Cogumelos', name_pt='Cogumelos', name_es='Champiñones', name_en='Mushrooms' where trainer_id is null and name='Champiñones';
update public.foods set name='Couve-flor', name_pt='Couve-flor', name_es='Coliflor', name_en='Cauliflower' where trainer_id is null and name='Coliflor';
update public.foods set name='Espinafre', name_pt='Espinafre', name_es='Espinaca', name_en='Spinach' where trainer_id is null and name='Espinaca';
update public.foods set name='Alface', name_pt='Alface', name_es='Lechuga', name_en='Lettuce' where trainer_id is null and name='Lechuga';
update public.foods set name='Pepino', name_pt='Pepino', name_es='Pepino', name_en='Cucumber' where trainer_id is null and name='Pepino';
update public.foods set name='Tomate', name_pt='Tomate', name_es='Tomate', name_en='Tomato' where trainer_id is null and name='Tomate';
update public.foods set name='Cenoura', name_pt='Cenoura', name_es='Zanahoria', name_en='Carrot' where trainer_id is null and name='Zanahoria';
update public.foods set name='Atum em lata', name_pt='Atum em lata', name_es='Atún en lata', name_en='Canned tuna' where trainer_id is null and name='Atún en lata';
update public.foods set name='Carne vermelha magra', name_pt='Carne vermelha magra', name_es='Carne roja magra', name_en='Lean red meat' where trainer_id is null and name='Carne roja magra';
update public.foods set name='Ovo inteiro', name_pt='Ovo inteiro', name_es='Huevo entero', name_en='Whole egg' where trainer_id is null and name='Huevo entero';
update public.foods set name='Peito de frango', name_pt='Peito de frango', name_es='Pechuga de pollo', name_en='Chicken breast' where trainer_id is null and name='Pechuga de pollo';
update public.foods set name='Queijo cottage', name_pt='Queijo cottage', name_es='Queso cottage', name_en='Cottage cheese' where trainer_id is null and name='Queso cottage';
update public.foods set name='Salmão', name_pt='Salmão', name_es='Salmón', name_en='Salmon' where trainer_id is null and name='Salmón';
update public.foods set name='Whey protein', name_pt='Whey protein', name_es='Whey protein', name_en='Whey protein' where trainer_id is null and name='Whey protein';
update public.foods set name='Iogurte grego', name_pt='Iogurte grego', name_es='Yogur griego', name_en='Greek yogurt' where trainer_id is null and name='Yogur griego';
update public.foods set name_pt = coalesce(name_pt, name) where trainer_id is not null;

notify pgrst, 'reload schema';
