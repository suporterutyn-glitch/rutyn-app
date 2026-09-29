-- Tarea diaria (06:00 UTC): elimina cuentas congeladas por falta de pago hace más de 60 días.
-- El secreto vive en Vault ('cron_secret') y en los secrets de la función (CRON_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('limpieza-cuentas') where exists (select 1 from cron.job where jobname = 'limpieza-cuentas');
select cron.schedule('limpieza-cuentas', '0 6 * * *', $$
  select net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.supabase.co/functions/v1/limpieza-cuentas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  )
$$);
