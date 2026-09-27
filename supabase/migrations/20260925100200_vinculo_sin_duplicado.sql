-- Quedaban dos versiones; con (aluno_id, accion) Postgres no sabía cuál usar.
drop function if exists public.gestionar_vinculo_aluno(uuid, text);
