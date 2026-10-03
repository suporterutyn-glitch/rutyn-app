-- Agenda del profesor: compromisos repetidos (series) y recordatorios automáticos.

alter table public.appointments
  add column if not exists series_id uuid,
  add column if not exists reminded_day_at timestamptz,
  add column if not exists reminded_hour_at timestamptz;
create index if not exists appts_series_idx on public.appointments (series_id) where series_id is not null;
create index if not exists appts_starts_idx on public.appointments (starts_at);

-- Recordatorio el día anterior (24 h antes) y 1 hora antes, al profesor y al alumno avisado.
-- La app traduce el aviso con data.key; title/body son el respaldo en portugués.
create or replace function public.recordatorios_agenda() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_n int := 0;
  v_clave text;
  v_titulo text;
  v_cuando text;
begin
  for r in
    select a.*, case when a.starts_at <= now() + interval '65 minutes' then 'hour' else 'day' end as tipo
      from public.appointments a
     where a.starts_at > now()
       and (
         (a.starts_at <= now() + interval '65 minutes' and a.reminded_hour_at is null and a.created_at < now() - interval '10 minutes')
         or
         (a.starts_at > now() + interval '65 minutes' and a.starts_at <= now() + interval '24 hours'
          and a.reminded_day_at is null and a.created_at < a.starts_at - interval '24 hours')
       )
  loop
    v_clave := case when r.tipo = 'hour' then 'apptReminderHour' else 'apptReminderDay' end;
    v_titulo := case when r.tipo = 'hour' then 'Em 1 hora: ' else 'Lembrete: ' end || r.title;
    v_cuando := to_char(r.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');

    insert into public.notifications (user_id, type, title, body, data)
    values (r.teacher_id, 'info', v_titulo, v_cuando,
            jsonb_build_object('key', v_clave, 'params', jsonb_build_object(
              'name', r.title || coalesce(' · ' || nullif(r.student_name, ''), ''), 'at', r.starts_at)));
    if r.student_id is not null and r.notify_student then
      insert into public.notifications (user_id, type, title, body, data)
      values (r.student_id, 'info', v_titulo, v_cuando,
              jsonb_build_object('key', v_clave, 'params', jsonb_build_object('name', r.title, 'at', r.starts_at)));
    end if;

    if r.tipo = 'hour' then
      -- El de 1 hora también cierra el del día, para no mandar los dos juntos.
      update public.appointments set reminded_hour_at = now(), reminded_day_at = coalesce(reminded_day_at, now()) where id = r.id;
    else
      update public.appointments set reminded_day_at = now() where id = r.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.recordatorios_agenda() from public, anon, authenticated;

select cron.unschedule('agenda-recordatorios') where exists (select 1 from cron.job where jobname = 'agenda-recordatorios');
select cron.schedule('agenda-recordatorios', '*/10 * * * *', $$select public.recordatorios_agenda()$$);
