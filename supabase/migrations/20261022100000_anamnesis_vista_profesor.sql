-- Tarjeta "Evaluaciones" del inicio del profesor: anamnesis que el alumno completó y el profesor todavía no abrió.
alter table public.anamnesis_answers add column if not exists teacher_seen_at timestamptz;
