-- Cada aviso nuevo (notifications) se manda también al celular: el trigger llama a la
-- Edge Function send-push por pg_net. Si el usuario no activó las notificaciones, la función no hace nada.

create or replace function public.notificacion_a_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_secreto text;
begin
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'cron_secret';
  if v_secreto is null then return new; end if;
  -- Solo si ese usuario tiene algún dispositivo registrado.
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then return new; end if;
  perform net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- Un fallo al avisar al celular nunca debe impedir guardar el aviso.
  return new;
end $$;
revoke all on function public.notificacion_a_push() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.notificacion_a_push();
