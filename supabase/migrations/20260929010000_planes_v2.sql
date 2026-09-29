-- Planes v2: el Básico arranca en 2 alumnos (antes 5).
create or replace function public.limite_alumnos(p_teacher uuid)
 returns integer
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_plan text; v_seats int;
begin
  select plan::text, plan_seats into v_plan, v_seats from public.profiles where id = p_teacher;
  if v_plan in ('pro', 'master', 'elite') then return null; end if;
  if v_plan = 'basic' then return greatest(coalesce(v_seats, 2), 2); end if;
  return 1;
end $function$;
