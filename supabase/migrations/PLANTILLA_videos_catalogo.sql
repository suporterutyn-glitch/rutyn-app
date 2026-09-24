-- PLANTILLA — todavía no es una migración, por eso el nombre no lleva fecha.
--
-- Los 30 ejercicios del catálogo global tienen `trainer_id is null` y la única
-- política que los alcanza es `exercises_read_global`, que da SELECT y nada más.
-- Ningún profesor los puede editar desde la app (y está bien: el catálogo es
-- compartido por todos). Por eso los videos entran por acá.
--
-- CÓMO USARLA
--   1. Completá la segunda columna de cada fila con el link del video.
--   2. Poné en la tercera el tipo: 'youtube', 'video' (mp4 directo) o 'gif'.
--   3. La cuarta es la imagen de portada; si la dejás vacía se usa el propio
--      video (en YouTube la miniatura sale sola, así que podés dejarla NULL).
--   4. Las filas que queden en NULL no se tocan — se pueden cargar de a tandas.
--   5. Avisame y la renombro a 20260925xxxxxx_videos_catalogo.sql y la corro.
--
-- Solo poné acá links que tengas derecho a usar: videos propios, o de canales
-- cuyo dueño autorizó el embebido.

update public.exercises e
set video_url   = coalesce(t.url, e.video_url),
    media_type  = coalesce(t.tipo, e.media_type),
    thumbnail_url = coalesce(t.portada, e.thumbnail_url)
from (values
  -- nombre exacto en la base          | url del video | tipo | portada
  ('Press de banca con barra',          null, null, null),
  ('Press inclinado con mancuernas',    null, null, null),
  ('Aperturas con mancuernas',          null, null, null),
  ('Press en máquina',                  null, null, null),
  ('Press de banca cerrado',            null, null, null),
  ('Dominadas',                         null, null, null),
  ('Jalón lat',                         null, null, null),
  ('Remo con barra',                    null, null, null),
  ('Remo con mancuernas',               null, null, null),
  ('Encogimientos de hombros',          null, null, null),
  ('Press militar',                     null, null, null),
  ('Press con mancuernas',              null, null, null),
  ('Elevaciones laterales',             null, null, null),
  ('Curl con barra',                    null, null, null),
  ('Curl con mancuernas',               null, null, null),
  ('Curl predicador',                   null, null, null),
  ('Curl en máquina',                   null, null, null),
  ('Extensiones de tríceps',            null, null, null),
  ('Patadas de tríceps',                null, null, null),
  ('Fondos de banca',                   null, null, null),
  ('Sentadilla con barra',              null, null, null),
  ('Sentadilla búlgara',                null, null, null),
  ('Prensa de piernas',                 null, null, null),
  ('Extensiones de cuádriceps',         null, null, null),
  ('Curl de isquiotibiales',            null, null, null),
  ('Peso muerto',                       null, null, null),
  ('Flexiones abdominales',             null, null, null),
  ('Planchas',                          null, null, null),
  ('Levantamiento de piernas colgado',  null, null, null),
  ('Rotaciones rusas',                  null, null, null)
) as t(nombre, url, tipo, portada)
where e.name = t.nombre
  and e.trainer_id is null
  and t.url is not null;

notify pgrst, 'reload schema';

select count(*) as con_video from public.exercises where trainer_id is null and video_url is not null;
