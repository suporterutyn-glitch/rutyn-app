-- Objetivo y dificultad guardados como texto viejo -> id del catálogo (se traducen).
update public.routines set objective = case lower(objective)
  when 'hipertrofia' then 'hypertrophy' when 'perda de gordura' then 'fatLoss'
  when 'definição muscular' then 'muscleDefinition' when 'condicionamento físico' then 'physicalConditioning'
  when 'qualidade de vida' then 'qualityOfLife' else objective end
where objective is not null;
update public.routines set difficulty = case lower(difficulty)
  when 'intermediario' then 'intermediate' when 'intermediário' then 'intermediate'
  when 'iniciante' then 'beginner' when 'avançado' then 'advanced' when 'avancado' then 'advanced'
  when 'adaptação' then 'adaptation' else difficulty end
where difficulty is not null;
update public.student_routines sr set objective = r.objective from public.routines r where r.id = sr.routine_id;
