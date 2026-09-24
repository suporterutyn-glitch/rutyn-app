-- Agregar campos de ubicación y nombre de estudiante a compromissos
-- Esto permite mostrar la información en la agenda sin hacer joins adicionales

alter table public.appointments
add column location text,
add column student_name text;

-- Comentarios para claridad
comment on column public.appointments.location is 'Ubicación del compromiso (ej: Smart Fit Paulista, Studio Rutyn)';
comment on column public.appointments.student_name is 'Nombre del estudiante snapshot (para preservar nombre en el momento de creación)';
