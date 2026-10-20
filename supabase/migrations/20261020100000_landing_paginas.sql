-- Analítica por página (portada / oferta) y seguimiento persona por persona en el panel admin.
-- page: 'home' = rutyn.com.br, 'oferta' = rutyn.com.br/oferta. Los eventos viejos (sin page) son de la portada.
alter table public.landing_events add column if not exists page text;
create index if not exists landing_events_page_idx on public.landing_events (page, created_at);

-- El registro desde la landing guarda en la cuenta el id del navegador (user_metadata.landing_visitor)
-- y la página (landing_page): así se une lo que hizo en la landing con lo que hizo después en la app.

drop function if exists public.landing_resumen(int);

create or replace function public.landing_resumen(p_dias int default 30, p_pagina text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_desde timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' - make_interval(days => greatest(1, least(p_dias, 365)) - 1);
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;

  with e as (
    select *, (created_at at time zone 'America/Sao_Paulo')::date as dia
      from public.landing_events
     where created_at >= v_desde and (p_pagina is null or coalesce(page, 'home') = p_pagina)
  ),
  dias as (
    select d::date as dia from generate_series((v_desde at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') d
  ),
  por_dia as (
    select dias.dia,
           count(*) filter (where e.type = 'view') as vistas,
           count(distinct e.visitor) filter (where e.type = 'view') as visitantes,
           count(distinct e.visitor) filter (where e.type = 'form_start') as iniciaron,
           count(distinct e.visitor) filter (where e.type = 'signup') as registros
      from dias left join e on e.dia = dias.dia group by dias.dia order by dias.dia
  ),
  primera as (
    select distinct on (visitor) visitor, referrer, utm_source, utm_medium, utm_campaign, device, lang, tz
      from e where type = 'view' order by visitor, created_at
  ),
  convertidos as (select distinct visitor from e where type = 'signup'),
  grupo as (
    select 'fuente' as k, coalesce(nullif(p.utm_source, ''), nullif(p.referrer, ''), 'Directo') as v, count(*) n, count(c.visitor) r from primera p left join convertidos c using (visitor) group by 2
    union all select 'campana', nullif(p.utm_campaign, ''), count(*), count(c.visitor) from primera p left join convertidos c using (visitor) where nullif(p.utm_campaign, '') is not null group by 2
    union all select 'dispositivo', coalesce(p.device, '?'), count(*), count(c.visitor) from primera p left join convertidos c using (visitor) group by 2
    union all select 'idioma', coalesce(p.lang, '?'), count(*), count(c.visitor) from primera p left join convertidos c using (visitor) group by 2
    union all select 'zona', coalesce(p.tz, '?'), count(*), count(c.visitor) from primera p left join convertidos c using (visitor) group by 2
    union all select 'boton', coalesce(label, '?'), count(*), 0 from e where type in ('cta', 'plan_click') group by 2
  ),
  -- Cuentas creadas desde la landing (con el id de su navegador).
  cuentas as (
    select u.raw_user_meta_data->>'landing_visitor' as visitor, p.id, p.full_name, p.email
      from auth.users u join public.profiles p on p.id = u.id
     where coalesce(u.raw_user_meta_data->>'landing_visitor', '') <> ''
  ),
  -- Una fila por persona que entró: qué hizo y hasta dónde llegó.
  recorrido as (
    select e.visitor,
           min(e.created_at) as primera, max(e.created_at) as ultima,
           array_agg(distinct coalesce(e.page, 'home')) as paginas,
           count(*) filter (where e.type = 'view') as vistas,
           bool_or(e.type in ('cta', 'plan_click')) as clic,
           bool_or(e.type = 'form_start') as formulario,
           bool_or(e.type = 'signup_sent') as envio,
           bool_or(e.type = 'signup') as registro,
           bool_or(e.type = 'plan_click') as pago,
           array_remove(array_agg(distinct e.label) filter (where e.type in ('cta', 'plan_click')), null) as botones
      from e group by e.visitor
  )
  select jsonb_build_object(
    'desde', v_desde,
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'vistas', vistas, 'visitantes', visitantes, 'iniciaron', iniciaron, 'registros', registros) order by dia), '[]') from por_dia),
    'total', (select jsonb_build_object(
        'vistas', count(*) filter (where type = 'view'),
        'visitantes', count(distinct visitor) filter (where type = 'view'),
        'clics', count(distinct visitor) filter (where type in ('cta', 'plan_click')),
        'iniciaron', count(distinct visitor) filter (where type = 'form_start'),
        'enviaron', count(distinct visitor) filter (where type = 'signup_sent'),
        'registros', count(distinct visitor) filter (where type = 'signup'),
        'planes', count(distinct visitor) filter (where type = 'plan_click')) from e),
    'grupos', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v, 'n', n, 'r', r) order by k, n desc), '[]') from grupo),
    'recorridos', (select coalesce(jsonb_agg(x order by x.ultima desc), '[]') from (
        select r.*, pr.device, pr.tz, pr.lang,
               coalesce(nullif(pr.utm_source, ''), nullif(pr.referrer, ''), 'Directo') as fuente,
               nullif(pr.utm_campaign, '') as campana,
               c.id as cuenta, c.full_name as nombre, c.email
          from recorrido r
          left join primera pr using (visitor)
          left join lateral (select * from cuentas c where c.visitor = r.visitor limit 1) c on true
         order by r.ultima desc limit 300) x)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.landing_resumen(int, text) from public, anon;
grant execute on function public.landing_resumen(int, text) to authenticated;

-- Profesores registrados en el período y de dónde vinieron (portada, oferta o directo en la app),
-- con lo que hicieron después: confirmar correo, completar perfil, alumnos y plan.
create or replace function public.landing_profesores(p_dias int default 30, p_pagina text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_desde timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' - make_interval(days => greatest(1, least(p_dias, 365)) - 1);
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(x order by x.creado desc), '[]') into v_out from (
    select p.id, p.full_name as nombre, p.email, p.created_at as creado,
           coalesce(u.raw_user_meta_data->>'landing_page', 'app') as origen,
           u.email_confirmed_at is not null as confirmado,
           coalesce(p.profile_complete, false) as perfil,
           p.plan::text as plan, p.plan_status,
           u.last_sign_in_at as ultimo_ingreso,
           (select count(*) from public.profiles a where a.teacher_id = p.id and a.role = 'student' and a.link_status in ('active', 'suspended')) as alumnos,
           (select coalesce(nullif(le.utm_source, ''), nullif(le.referrer, ''), 'Directo')
              from public.landing_events le
             where le.visitor = u.raw_user_meta_data->>'landing_visitor' and le.type = 'view'
             order by le.created_at limit 1) as fuente
      from public.profiles p join auth.users u on u.id = p.id
     where p.role = 'teacher' and p.created_at >= v_desde
       and (p_pagina is null or coalesce(u.raw_user_meta_data->>'landing_page', 'app') = p_pagina)
  ) x;
  return v_out;
end $$;
revoke all on function public.landing_profesores(int, text) from public, anon;
grant execute on function public.landing_profesores(int, text) to authenticated;
