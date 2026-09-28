-- Evaluación física, etapa 1: ficha del alumno, autor de cada cambio y permisos por sección.
-- Secciones (orden fijo): perfil, rm, aerobica, muscular, perimetria, fotos, gordura, carga, anamnese.

alter table public.assessments
  add column if not exists birth_date date,
  add column if not exists sex text check (sex in ('M', 'F')),
  add column if not exists goals text,
  add column if not exists injuries text,
  add column if not exists pathologies text,
  add column if not exists medications text,
  add column if not exists meals_per_day integer check (meals_per_day between 0 and 20),
  add column if not exists workouts_per_week integer check (workouts_per_week between 0 and 14),
  add column if not exists work_type text check (work_type in ('remote', 'office', 'field', 'physical', 'mixed')),
  add column if not exists activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'very', 'extreme')),
  add column if not exists smoker boolean not null default false,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by_name text,
  add column if not exists updated_by_role text check (updated_by_role in ('teacher', 'student'));

alter table public.assessments
  alter column student_visible_sections set default array['perfil','rm','aerobica','muscular','perimetria','fotos','gordura','carga','anamnese'],
  alter column student_editable_sections set default '{}';

-- Las filas viejas usaban otros nombres de sección: pasan al nuevo esquema (todo visible, nada editable).
update public.assessments set
  student_visible_sections = array['perfil','rm','aerobica','muscular','perimetria','fotos','gordura','carga','anamnese'],
  student_editable_sections = '{}'
where not (student_visible_sections && array['perfil','rm','aerobica','muscular','perimetria','fotos','gordura','carga','anamnese']);

-- Una ficha vigente por alumno y profesor.
create unique index if not exists assessments_alumno_profesor on public.assessments (student_id, teacher_id);

-- El alumno puede actualizar su ficha; el trigger limita qué columnas según los permisos.
drop policy if exists ass_student_update on public.assessments;
create policy ass_student_update on public.assessments for update
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create or replace function public.proteger_evaluacion() returns trigger
language plpgsql set search_path to 'public' as $$
declare
  ficha text[] := array['birth_date','sex','weight_kg','height_cm','goals','injuries','pathologies','medications',
                        'meals_per_day','workouts_per_week','work_type','activity_level','smoker'];
  campo text;
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if new.student_visible_sections is distinct from old.student_visible_sections
     or new.student_editable_sections is distinct from old.student_editable_sections
     or new.teacher_id is distinct from old.teacher_id or new.student_id is distinct from old.student_id then
    raise exception 'El alumno no puede cambiar permisos' using errcode = '42501';
  end if;
  if not ('perfil' = any(old.student_editable_sections)) then
    foreach campo in array ficha loop
      if (to_jsonb(new) -> campo) is distinct from (to_jsonb(old) -> campo) then
        raise exception 'Tu profesor no liberó la edición de esta sección' using errcode = '42501';
      end if;
    end loop;
  end if;
  new.updated_by := auth.uid();
  new.updated_by_role := 'student';
  return new;
end $$;
drop trigger if exists assessments_proteger on public.assessments;
create trigger assessments_proteger before update on public.assessments
  for each row execute function public.proteger_evaluacion();
