-- El formulario de "Novo Exercício" pide, según el módulo 07: nombre, tipo de
-- medio (GIF / vídeo del celular / link de YouTube), portada opcional, uno o
-- varios grupos musculares y una categoría. En la tabla solo había un
-- muscle_group de texto libre y una video_url suelta.
--
-- muscle_group (singular, texto) se conserva para no romper lo existente: se
-- sigue llenando con el primero de la lista.

alter table public.exercises add column if not exists muscle_groups text[] default '{}';
alter table public.exercises add column if not exists category text;
alter table public.exercises add column if not exists media_type text;

-- Lo que ya existe queda con su grupo dentro del arreglo.
update public.exercises
  set muscle_groups = array[muscle_group]
  where muscle_group is not null
    and (muscle_groups is null or cardinality(muscle_groups) = 0);

notify pgrst, 'reload schema';
