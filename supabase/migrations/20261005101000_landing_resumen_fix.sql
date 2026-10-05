-- Corrige landing_resumen: la variable `v` chocaba con la columna `v` de los grupos.
create or replace function public.landing_resumen(p_dias int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_desde timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' - make_interval(days => greatest(1, least(p_dias, 365)) - 1);
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;

  with e as (
    select *, (created_at at time zone 'America/Sao_Paulo')::date as dia from public.landing_events where created_at >= v_desde
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
  -- Una fila por visitante: de dónde vino la primera vez dentro del período.
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
    'grupos', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v, 'n', n, 'r', r) order by k, n desc), '[]') from grupo)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.landing_resumen(int) from public, anon;
grant execute on function public.landing_resumen(int) to authenticated;
