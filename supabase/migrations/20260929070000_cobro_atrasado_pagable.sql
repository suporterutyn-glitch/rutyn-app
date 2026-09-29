-- Un cobro vencido ("atrasado", status suspended) también se puede avisar como pagado.
create or replace function public.proteger_cobros() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if new.status <> 'awaiting' or old.status not in ('pending', 'suspended')
     or new.amount is distinct from old.amount or new.format is distinct from old.format
     or new.due_date is distinct from old.due_date or new.paid_at is distinct from old.paid_at
     or new.teacher_id is distinct from old.teacher_id or new.student_id is distinct from old.student_id
     or new.hours is distinct from old.hours or new.notes is distinct from old.notes then
    raise exception 'El alumno solo puede avisar que pagó' using errcode = '42501';
  end if;
  return new;
end $$;
