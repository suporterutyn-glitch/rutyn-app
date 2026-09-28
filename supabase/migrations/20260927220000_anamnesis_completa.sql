-- Anamnesis completa: modelos globales/listos/propios, copia de preguntas al enviar, progreso, adjuntos.

-- ---- Modelos ----
alter table public.anamnesis_templates
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists kind text not null default 'global' check (kind in ('global', 'parq', 'nutrition', 'custom')),
  add column if not exists priority integer not null default 100;

drop policy if exists anamnesis_read on public.anamnesis_templates;
drop policy if exists modelos_leer on public.anamnesis_templates;
drop policy if exists modelos_propios on public.anamnesis_templates;
create policy modelos_leer on public.anamnesis_templates for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy modelos_propios on public.anamnesis_templates for all to authenticated
  using (owner_id = auth.uid() and kind = 'custom')
  with check (owner_id = auth.uid() and kind = 'custom');

-- PAR-Q (7 sí/no) y Nutrición (6), listos y traducidos (la app original los guardaba en un solo idioma).
insert into public.anamnesis_templates (name, name_es, name_en, kind, priority, is_active, questions)
select 'PAR-Q', 'PAR-Q', 'PAR-Q', 'parq', 10, true, '[
 {"id":"p1","type":"yesno","label_pt":"Algum médico já disse que você tem um problema cardíaco e que só deve fazer atividade física recomendada por um médico?","label_es":"¿Algún médico te dijo alguna vez que tenés un problema cardíaco y que solo debés hacer actividad física recomendada por un médico?","label_en":"Has a doctor ever said you have a heart condition and should only do physical activity recommended by a doctor?"},
 {"id":"p2","type":"yesno","label_pt":"Você sente dor no peito quando pratica atividade física?","label_es":"¿Sentís dolor en el pecho cuando hacés actividad física?","label_en":"Do you feel pain in your chest when you do physical activity?"},
 {"id":"p3","type":"yesno","label_pt":"No último mês, você sentiu dor no peito sem estar fazendo atividade física?","label_es":"En el último mes, ¿sentiste dolor en el pecho sin estar haciendo actividad física?","label_en":"In the past month, have you had chest pain when you were not doing physical activity?"},
 {"id":"p4","type":"yesno","label_pt":"Você perde o equilíbrio por tontura ou já perdeu a consciência?","label_es":"¿Perdés el equilibrio por mareos o alguna vez perdiste el conocimiento?","label_en":"Do you lose your balance because of dizziness, or have you ever lost consciousness?"},
 {"id":"p5","type":"yesno","label_pt":"Você tem algum problema ósseo ou articular que pode piorar com a atividade física?","label_es":"¿Tenés algún problema óseo o articular que podría empeorar con la actividad física?","label_en":"Do you have a bone or joint problem that could be made worse by physical activity?"},
 {"id":"p6","type":"yesno","label_pt":"Algum médico receita atualmente remédios para sua pressão arterial ou problema cardíaco?","label_es":"¿Algún médico te receta actualmente medicamentos para la presión arterial o un problema cardíaco?","label_en":"Is a doctor currently prescribing medication for your blood pressure or a heart condition?"},
 {"id":"p7","type":"yesno","label_pt":"Você sabe de algum outro motivo pelo qual não deveria praticar atividade física?","label_es":"¿Conocés algún otro motivo por el cual no deberías hacer actividad física?","label_en":"Do you know of any other reason why you should not do physical activity?"}
]'::jsonb
where not exists (select 1 from public.anamnesis_templates where kind = 'parq');

insert into public.anamnesis_templates (name, name_es, name_en, kind, priority, is_active, questions)
select 'Nutrição', 'Nutrición', 'Nutrition', 'nutrition', 20, true, '[
 {"id":"n1","type":"number","label_pt":"Quantas refeições você faz por dia?","label_es":"¿Cuántas comidas hacés por día?","label_en":"How many meals do you eat per day?"},
 {"id":"n2","type":"yesno","label_pt":"Você tem alguma alergia ou intolerância alimentar?","label_es":"¿Tenés alguna alergia o intolerancia alimentaria?","label_en":"Do you have any food allergies or intolerances?"},
 {"id":"n3","type":"text","label_pt":"Quais alimentos você não gosta ou evita?","label_es":"¿Qué alimentos no te gustan o evitás?","label_en":"Which foods do you dislike or avoid?"},
 {"id":"n4","type":"number","label_pt":"Quantos litros de água você bebe por dia?","label_es":"¿Cuántos litros de agua tomás por día?","label_en":"How many liters of water do you drink per day?"},
 {"id":"n5","type":"text","label_pt":"Você usa algum suplemento? Qual?","label_es":"¿Tomás algún suplemento? ¿Cuál?","label_en":"Do you take any supplements? Which ones?"},
 {"id":"n6","type":"text","label_pt":"Descreva um dia típico da sua alimentação.","label_es":"Describí un día típico de tu alimentación.","label_en":"Describe a typical day of eating."}
]'::jsonb
where not exists (select 1 from public.anamnesis_templates where kind = 'nutrition');

-- ---- Anamnesis enviadas ----
alter table public.anamnesis_answers
  add column if not exists questions jsonb,
  add column if not exists template_name text,
  add column if not exists template_name_es text,
  add column if not exists template_name_en text,
  add column if not exists status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  add column if not exists current_index integer not null default 0,
  add column if not exists comments jsonb not null default '{}',
  add column if not exists completed_by text check (completed_by in ('student', 'teacher'));
alter table public.anamnesis_answers alter column template_id drop not null;

-- Las ya enviadas copian las preguntas del modelo (desde ahora quedan congeladas en el envío).
update public.anamnesis_answers a set
  questions = coalesce(a.questions, t.questions),
  template_name = coalesce(a.template_name, t.name), template_name_es = coalesce(a.template_name_es, t.name_es), template_name_en = coalesce(a.template_name_en, t.name_en),
  status = case when a.submitted_at is not null then 'completed' when a.answers <> '{}'::jsonb then 'in_progress' else 'pending' end,
  completed_by = case when a.submitted_at is not null then coalesce(a.completed_by, 'student') else a.completed_by end
from public.anamnesis_templates t where t.id = a.template_id and a.questions is null;

-- El alumno solo lee y responde (antes podía crear y editar cualquier campo).
drop policy if exists ans_student on public.anamnesis_answers;
drop policy if exists ans_student_read on public.anamnesis_answers;
drop policy if exists ans_student_update on public.anamnesis_answers;
create policy ans_student_read on public.anamnesis_answers for select using (student_id = auth.uid());
create policy ans_student_update on public.anamnesis_answers for update using (student_id = auth.uid()) with check (student_id = auth.uid());

create or replace function public.proteger_anamnesis() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user <> 'authenticated' or auth.uid() = old.teacher_id then return new; end if;
  if old.status = 'completed' then
    raise exception 'Esta anamnesis ya está completa' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'answers' - 'comments' - 'status' - 'current_index' - 'submitted_at' - 'completed_by')
     is distinct from (to_jsonb(old) - 'answers' - 'comments' - 'status' - 'current_index' - 'submitted_at' - 'completed_by') then
    raise exception 'El alumno solo puede responder' using errcode = '42501';
  end if;
  if new.status = 'completed' then new.completed_by := 'student'; end if;
  return new;
end $$;
drop trigger if exists anamnesis_proteger on public.anamnesis_answers;
create trigger anamnesis_proteger before update on public.anamnesis_answers
  for each row execute function public.proteger_anamnesis();

-- ---- Adjuntos (imagen / documento): {alumno}/{profesor}/{anamnesis}/{pregunta}-{marca}.{ext} ----
insert into storage.buckets (id, name, public, file_size_limit)
values ('anamnesis-files', 'anamnesis-files', false, 10485760)
on conflict (id) do nothing;

drop policy if exists anamfiles_acceso on storage.objects;
create policy anamfiles_acceso on storage.objects for all using (
  bucket_id = 'anamnesis-files' and (
    ((storage.foldername(name))[2] = auth.uid()::text
      and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.teacher_id = auth.uid()))
    or (storage.foldername(name))[1] = auth.uid()::text
  ))
  with check (
  bucket_id = 'anamnesis-files' and (
    ((storage.foldername(name))[2] = auth.uid()::text
      and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.teacher_id = auth.uid()))
    or (storage.foldername(name))[1] = auth.uid()::text
  ));
