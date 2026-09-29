-- El país define la moneda del plan: después del primer pago el profesor no puede cambiarlo solo
-- (así no se pasa a Brasil para pagar en reales). El admin lo cambia por la edge function (service role).
create or replace function public.proteger_pais_pagante() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.country is distinct from old.country and old.stripe_customer_id is not null then
    raise exception 'country_locked: O país não pode ser alterado depois de assinar. Fale com o suporte.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_pais_fijo on public.profiles;
create trigger profiles_pais_fijo before update of country on public.profiles
  for each row execute function public.proteger_pais_pagante();
