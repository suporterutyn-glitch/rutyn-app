-- El registro del alumno necesita avisar en el momento si el correo del
-- profesor existe, pero quien lo tipea todavía no está autenticado y no puede
-- leer perfiles ajenos.
--
-- Devuelve solo verdadero/falso: no expone nombre, teléfono ni ningún otro dato
-- del profesor. Permite saber si un correo pertenece a un profesor de la
-- plataforma, que es justamente lo que la pantalla necesita mostrar.

create or replace function public.existe_profesor(correo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $BODY$
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(trim(correo))
      and role = 'teacher'::role_t
  );
$BODY$;

revoke all on function public.existe_profesor(text) from public;
grant execute on function public.existe_profesor(text) to anon, authenticated;
