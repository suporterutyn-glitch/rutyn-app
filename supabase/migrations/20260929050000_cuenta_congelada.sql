-- Falta de pago: la cuenta del profesor (y la de sus alumnos) queda congelada desde esta fecha.
-- A los 60 días sin pagar se eliminan (edge function limpieza-cuentas).
alter table public.profiles add column if not exists frozen_since timestamptz;

CREATE OR REPLACE FUNCTION public.proteger_campos_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.plan is distinct from old.plan
     or new.plan_seats is distinct from old.plan_seats
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.plan_status is distinct from old.plan_status
     or new.plan_cancel_at_period_end is distinct from old.plan_cancel_at_period_end
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.plan_pending_plan is distinct from old.plan_pending_plan
     or new.plan_pending_seats is distinct from old.plan_pending_seats
     or new.plan_pending_at is distinct from old.plan_pending_at
     or new.frozen_since is distinct from old.frozen_since then
    raise exception 'O plano só muda pelo pagamento' using errcode = '42501';
  end if;
  if new.role is distinct from old.role
     or new.teacher_id is distinct from old.teacher_id
     or new.unlinked_by is distinct from old.unlinked_by then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  -- El alumno solo puede marcarse "pendiente" al mandar una propuesta.
  if new.link_status is distinct from old.link_status
     and not (old.role = 'student' and new.link_status = 'pending' and old.link_status <> 'active') then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  if new.account_status is distinct from old.account_status and new.account_status <> 'deleting' then
    raise exception 'Campo protegido' using errcode = '42501';
  end if;
  return new;
end $function$;

-- Para el profesor: su propia fecha. Para el alumno: la de su profesor.
create or replace function public.cuenta_congelada() returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select frozen_since from profiles where id = auth.uid()),
    (select t.frozen_since from profiles a join profiles t on t.id = a.teacher_id where a.id = auth.uid())
  )
$$;
revoke execute on function public.cuenta_congelada() from anon, public;
grant execute on function public.cuenta_congelada() to authenticated;
