-- Tarea diaria de mensualidades (11:00 UTC = 08:00 en Brasil): recurrencia, recordatorios y atrasos.
select cron.unschedule('charge-cron') where exists (select 1 from cron.job where jobname = 'charge-cron');
select cron.schedule('charge-cron', '0 11 * * *', $$
  select net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.supabase.co/functions/v1/charge-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  )
$$);
