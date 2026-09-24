-- Dietas convertidas desde copias viejas: objetivo de texto a id (se traduce).
update public.diets set goal = case goal
  when 'Emagrecer' then 'weightLoss' when 'Ganhar Massa' then 'muscleGain'
  when 'Manutenção' then 'maintenance' when 'Alimentação Saudável' then 'healthyEating'
  else goal end
where goal in ('Emagrecer', 'Ganhar Massa', 'Manutenção', 'Alimentação Saudável');
update public.student_diets sd set data = jsonb_set(sd.data, '{goal}', to_jsonb(d.goal))
from public.diets d where d.id = sd.diet_id and d.goal is not null;
