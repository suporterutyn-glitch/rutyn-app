-- La app ya tiene inglés: el registro guarda el idioma elegido en profiles.language.
alter type public.lang_t add value if not exists 'en';

-- Ocupación y formatos de trabajo se guardan como ids del catálogo
-- (src/lib/catalogos.ts); quedaban algunos con el texto viejo.
update public.profiles set occupation = 'personalTrainer' where occupation = 'Personal Trainer';
update public.profiles
   set work_formats = array(select case f when 'hibrido' then 'hybrid' when 'presencial' then 'inPerson' else f end
                              from unnest(work_formats) f)
 where work_formats && array['hibrido', 'presencial'];
update public.invites set model = case model when 'hibrido' then 'hybrid' when 'presencial' then 'inPerson' else model end
 where model in ('hibrido', 'presencial');
