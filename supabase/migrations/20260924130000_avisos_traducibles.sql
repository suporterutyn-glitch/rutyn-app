-- Avisos en el idioma de quien los lee.
--
-- title/body quedaban fijos en portugués. Ahora cada aviso guarda también
-- data = {key, params}; la app lo traduce al mostrarlo (src/i18n/avisos.ts)
-- y title/body quedan como respaldo.

create or replace function public.crear_convite_desde_registro()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  correo_profesor text;
  id_profesor uuid;
begin
  if new.role is distinct from 'student'::role_t then
    return new;
  end if;

  select nullif(trim(raw_user_meta_data->>'teacher_email'), '')
    into correo_profesor
    from auth.users
    where id = new.id;

  if correo_profesor is null then
    return new;
  end if;

  select id into id_profesor
    from public.profiles
    where lower(email) = lower(correo_profesor)
      and role = 'teacher'::role_t
    limit 1;

  -- Correo inexistente o de alguien que no es profesor: el alumno sigue sin
  -- vínculo y la app lo lleva a buscar profesor en el marketplace.
  if id_profesor is null then
    return new;
  end if;

  insert into public.invites (student_id, teacher_id, status)
  values (new.id, id_profesor, 'pending');

  update public.profiles
    set link_status = 'pending'::link_status_t
    where id = new.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    id_profesor,
    'invite'::notif_type_t,
    'Novo convite de aluno',
    coalesce(nullif(new.full_name, ''), new.email) || ' quer treinar com você.',
    jsonb_build_object('key', 'newInvite', 'params', jsonb_build_object('who', coalesce(nullif(new.full_name, ''), new.email)))
  );

  return new;
end
$BODY$;

create or replace function public.definir_meta_hidratacao(aluno_id uuid, meta_ml integer)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if meta_ml < 500 or meta_ml > 10000 then
    raise exception 'A meta deve ficar entre 500 e 10.000 ml' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = aluno_id and teacher_id = auth.uid()) then
    raise exception 'Aluno não vinculado a este professor' using errcode = '42501';
  end if;
  update public.profiles set hydration_goal_ml = meta_ml where id = aluno_id;
  -- El día de hoy ya registrado pasa a usar la meta nueva.
  update public.hydration_days set target_ml = meta_ml where student_id = aluno_id and day = current_date;
  insert into public.notifications (user_id, type, title, body, data)
  values (aluno_id, 'info', 'Nova meta de hidratação', 'Sua meta diária agora é ' || meta_ml || ' ml.',
          jsonb_build_object('key', 'hydration', 'params', jsonb_build_object('ml', meta_ml)));
end
$BODY$;

update public.notifications
   set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('key', 'hydration', 'params',
         jsonb_build_object('ml', (regexp_match(body, '(\d+) ml'))[1]::int))
 where title = 'Nova meta de hidratação' and data->>'key' is null and body ~ '\d+ ml';

update public.notifications
   set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('key', 'newInvite', 'params',
         jsonb_build_object('who', regexp_replace(body, ' quer treinar com você\.$', '')))
 where title = 'Novo convite de aluno' and data->>'key' is null;

update public.notifications
   set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('key', 'newRoutine', 'params',
         jsonb_build_object('who', (regexp_match(body, '^(.*) atribuiu a rotina "(.*)"\.$'))[1],
                            'name', (regexp_match(body, '^(.*) atribuiu a rotina "(.*)"\.$'))[2]))
 where title = 'Nova rotina' and data->>'key' is null and body ~ '^(.*) atribuiu a rotina "(.*)"\.$';

update public.notifications
   set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('key', 'newDiet', 'params',
         jsonb_build_object('who', (regexp_match(body, '^(.*) atribuiu a dieta "(.*)"\.$'))[1],
                            'name', (regexp_match(body, '^(.*) atribuiu a dieta "(.*)"\.$'))[2]))
 where title = 'Nova dieta' and data->>'key' is null and body ~ '^(.*) atribuiu a dieta "(.*)"\.$';
