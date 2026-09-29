-- Bajar de plan se agenda para la próxima renovación: se guarda el cambio pendiente en el perfil.
alter table public.profiles
  add column if not exists plan_pending_plan text,
  add column if not exists plan_pending_seats int,
  add column if not exists plan_pending_at timestamptz;

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
     or new.plan_pending_at is distinct from old.plan_pending_at then
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
