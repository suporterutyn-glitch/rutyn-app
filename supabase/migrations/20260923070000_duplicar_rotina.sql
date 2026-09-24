-- "Duplicar" una rutina desde la lista de Meus Projetos.
--
-- Copiar solo la fila de routines dejaría una rutina vacía: el contenido real
-- vive en routine_exercises y series. Hacerlo desde el cliente serían tres
-- viajes encadenados que pueden fallar a la mitad y dejar una copia rota.
--
-- Devuelve el id de la copia para que la pantalla pueda destacarla.

create or replace function public.duplicar_rotina(rotina_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  original public.routines%rowtype;
  nueva_id uuid;
  ex record;
  nuevo_ex_id uuid;
begin
  select * into original
    from public.routines
    where id = rotina_id and owner_id = auth.uid();

  if not found then
    raise exception 'Rotina inexistente ou de outro professor' using errcode = '42501';
  end if;

  insert into public.routines (owner_id, name, objective, difficulty, notes, is_favorite)
  values (original.owner_id, original.name || ' (cópia)', original.objective,
          original.difficulty, original.notes, false)
  returning id into nueva_id;

  for ex in
    select * from public.routine_exercises
    where routine_id = rotina_id
    order by position
  loop
    insert into public.routine_exercises
      (routine_id, exercise_id, exercise_name_snapshot, position, group_type, group_id)
    values
      (nueva_id, ex.exercise_id, ex.exercise_name_snapshot, ex.position, ex.group_type, ex.group_id)
    returning id into nuevo_ex_id;

    insert into public.series (routine_exercise_id, position, params, notes)
    select nuevo_ex_id, s.position, s.params, s.notes
      from public.series s
      where s.routine_exercise_id = ex.id
      order by s.position;
  end loop;

  return nueva_id;
end
$BODY$;

revoke all on function public.duplicar_rotina(uuid) from public;
grant execute on function public.duplicar_rotina(uuid) to authenticated;
