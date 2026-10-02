-- Link de invitación del profesor: app.rutyn.com.br/c/<codigo>.
-- El alumno que entra por el link queda vinculado al instante (si el plan del profesor tiene lugar).

alter table public.profiles add column if not exists invite_code text;
update public.profiles set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
 where role = 'teacher' and invite_code is null;
alter table public.profiles alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
create unique index if not exists profiles_invite_code_key on public.profiles (invite_code);

-- Nombre y foto del profesor para la pantalla de registro (cualquiera con el link).
create or replace function public.profesor_por_codigo(p_codigo text)
returns table (full_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select full_name, avatar_url from public.profiles
   where invite_code = lower(trim(p_codigo)) and role = 'teacher' and account_status = 'active'
$$;
revoke all on function public.profesor_por_codigo(text) from public;
grant execute on function public.profesor_por_codigo(text) to anon, authenticated;

-- El alumno logueado se vincula con el profesor del código.
-- Devuelve: ok | not_found | not_student | already_linked | teacher_full
create or replace function public.vincular_con_codigo(p_codigo text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_yo public.profiles%rowtype;
  v_prof public.profiles%rowtype;
  v_lim int;
begin
  select * into v_yo from public.profiles where id = auth.uid();
  if not found or v_yo.role <> 'student' then return 'not_student'; end if;

  select * into v_prof from public.profiles
   where invite_code = lower(trim(p_codigo)) and role = 'teacher' and account_status = 'active';
  if not found or v_prof.frozen_since is not null then return 'not_found'; end if;

  if v_yo.teacher_id = v_prof.id and v_yo.link_status in ('active', 'pending', 'suspended') then
    return case when v_yo.link_status = 'active' then 'ok' else 'already_linked' end;
  end if;
  if v_yo.link_status in ('active', 'pending', 'suspended') then return 'already_linked'; end if;

  v_lim := public.limite_alumnos(v_prof.id);
  if v_lim is not null and public.alumnos_activos(v_prof.id) >= v_lim then return 'teacher_full'; end if;

  -- Propuestas abiertas a otros profesores quedan sin efecto.
  update public.invites set status = 'cancelled' where student_id = v_yo.id and status in ('pending', 'countered');

  update public.profiles
     set teacher_id = v_prof.id, link_status = 'active', unlinked_by = null
   where id = v_yo.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_prof.id, 'invite', 'Novo aluno pelo seu link',
          coalesce(v_yo.full_name, v_yo.email) || ' entrou pelo seu link de convite. Defina a mensalidade em Financeiro.',
          jsonb_build_object('key', 'joinedByLink', 'params', jsonb_build_object('who', coalesce(v_yo.full_name, v_yo.email))));
  return 'ok';
end $$;
revoke all on function public.vincular_con_codigo(text) from public, anon;
grant execute on function public.vincular_con_codigo(text) to authenticated;
