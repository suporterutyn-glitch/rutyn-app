-- Meta de hidratación del alumno, definida por su profesor (perfil do aluno > Dietas).
alter table public.profiles add column if not exists hydration_goal_ml integer not null default 2500;

-- El profesor no escribe el perfil del alumno: solo esta meta, y solo si es su alumno.
create or replace function public.definir_meta_hidratacao(aluno_id uuid, meta_ml integer)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if meta_ml < 500 or meta_ml > 10000 then
    raise exception 'A meta deve ficar entre 500 e 10.000 ml' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = aluno_id and teacher_id = auth.uid()) then
    raise exception 'Aluno não vinculado a este professor' using errcode = '42501';
  end if;
  update public.profiles set hydration_goal_ml = meta_ml where id = aluno_id;
  -- El día de hoy ya registrado pasa a usar la meta nueva.
  update public.hydration_days set target_ml = meta_ml where student_id = aluno_id and day = current_date;
  insert into public.notifications (user_id, type, title, body)
  values (aluno_id, 'info', 'Nova meta de hidratação', 'Sua meta diária agora é ' || meta_ml || ' ml.');
end
$BODY$;
revoke all on function public.definir_meta_hidratacao(uuid, integer) from public;
grant execute on function public.definir_meta_hidratacao(uuid, integer) to authenticated;
