-- Oferta de lanzamiento: cuando un profesor confirma su correo (hasta el 1/11/2026 23:59 UTC-3),
-- la Edge Function oferta-aviso le deja el aviso en la app y le manda el correo de la oferta.
create or replace function public.oferta_al_confirmar() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_secreto text;
begin
  if now() > '2026-11-02 02:59:59+00' then return new; end if;
  if old.email_confirmed_at is not null or new.email_confirmed_at is null then return new; end if;
  if coalesce(new.raw_user_meta_data->>'role', '') <> 'teacher' then return new; end if;
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'cron_secret';
  if v_secreto is null then return new; end if;
  perform net.http_post(
    url := 'https://nkmfabceawstzndrxdwj.supabase.co/functions/v1/oferta-aviso',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto),
    body := jsonb_build_object('user_id', new.id)
  );
  return new;
exception when others then
  -- Avisar la oferta nunca debe impedir confirmar el correo.
  return new;
end $$;
revoke all on function public.oferta_al_confirmar() from public, anon, authenticated;

drop trigger if exists oferta_al_confirmar on auth.users;
create trigger oferta_al_confirmar after update of email_confirmed_at on auth.users
  for each row execute function public.oferta_al_confirmar();
