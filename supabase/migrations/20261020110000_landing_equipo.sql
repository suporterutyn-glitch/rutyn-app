-- Visitas del equipo: el navegador queda marcado (interno) al entrar con la sesión de WordPress abierta
-- o con rutyn.com.br/?soy=equipo. No suman en los números y en "Persona por persona" aparecen como del equipo.
alter table public.landing_events add column if not exists interno boolean not null default false;

create or replace function public.landing_resumen(p_dias int default 30, p_pagina text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_desde timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' - make_interval(days => greatest(1, least(p_dias, 365)) - 1);
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;

  with ea as (
    select *, (created_at at time zone 'America/Sao_Paulo')::date as dia
      from public.landing_events
     where created_at >= v_desde and (p_pagina is null or coalesce(page, 'home') = p_pagina)
  ),
  -- Los números no cuentan las visitas del equipo; la lista persona por persona sí, marcadas.
  e as (select * from ea where not coalesce(interno, false)),
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
  primera_todos as (
    select distinct on (visitor) visitor, referrer, utm_source, utm_campaign, device, lang, tz
      from ea where type = 'view' order by visitor, created_at
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
           array_remove(array_agg(distinct e.label) filter (where e.type in ('cta', 'plan_click')), null) as botones,
           bool_or(coalesce(e.interno, false)) as interno
      from ea e group by e.visitor
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
        'planes', count(distinct visitor) filter (where type = 'plan_click'),
        'equipo', (select count(distinct visitor) from ea where coalesce(interno, false))) from e),
    'grupos', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v, 'n', n, 'r', r) order by k, n desc), '[]') from grupo),
    'recorridos', (select coalesce(jsonb_agg(x order by x.ultima desc), '[]') from (
        select r.*, pr.device, pr.tz, pr.lang,
               coalesce(nullif(pr.utm_source, ''), nullif(pr.referrer, ''), 'Directo') as fuente,
               nullif(pr.utm_campaign, '') as campana,
               c.id as cuenta, c.full_name as nombre, c.email
          from recorrido r
          left join primera_todos pr using (visitor)
          left join lateral (select * from cuentas c where c.visitor = r.visitor limit 1) c on true
         order by r.ultima desc limit 300) x)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.landing_resumen(int, text) from public, anon;
grant execute on function public.landing_resumen(int, text) to authenticated;
