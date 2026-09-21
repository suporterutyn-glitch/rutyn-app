-- Seed: templates básicos de anamnese

insert into public.anamnesis_templates (name, questions) values
('Anamnese básica', '[
  {"id":"q1","label_pt":"Você tem alguma doença crônica?","label_es":"¿Tienes alguna enfermedad crónica?","type":"yesno"},
  {"id":"q2","label_pt":"Se sim, qual?","label_es":"Si sí, ¿cuál?","type":"text"},
  {"id":"q3","label_pt":"Você toma alguma medicação?","label_es":"¿Tomas alguna medicación?","type":"yesno"},
  {"id":"q4","label_pt":"Se sim, qual?","label_es":"Si sí, ¿cuál?","type":"text"},
  {"id":"q5","label_pt":"Alguma lesão ou dor recorrente?","label_es":"¿Alguna lesión o dolor recurrente?","type":"text"},
  {"id":"q6","label_pt":"Nível de atividade atual","label_es":"Nivel de actividad actual","type":"select","options":["Sedentário","Leve","Moderado","Ativo","Muito ativo"]},
  {"id":"q7","label_pt":"Objetivo principal","label_es":"Objetivo principal","type":"select","options":["Emagrecimento","Hipertrofia","Condicionamento","Reabilitação","Saúde"]},
  {"id":"q8","label_pt":"Fuma?","label_es":"¿Fumas?","type":"yesno"},
  {"id":"q9","label_pt":"Consome álcool?","label_es":"¿Consumes alcohol?","type":"yesno"},
  {"id":"q10","label_pt":"Horas de sono por noite","label_es":"Horas de sueño por noche","type":"number"}
]'::jsonb)
on conflict do nothing;

insert into public.anamnesis_templates (name, questions) values
('Anamnese esportiva', '[
  {"id":"s1","label_pt":"Pratica alguma modalidade esportiva?","label_es":"¿Practicas alguna modalidad deportiva?","type":"text"},
  {"id":"s2","label_pt":"Frequência semanal","label_es":"Frecuencia semanal","type":"number"},
  {"id":"s3","label_pt":"Já treinou com peso antes?","label_es":"¿Ya has entrenado con pesas antes?","type":"yesno"},
  {"id":"s4","label_pt":"Tem competições no horizonte?","label_es":"¿Tienes competencias en el horizonte?","type":"yesno"},
  {"id":"s5","label_pt":"Qual seu foco: força, resistência, potência?","label_es":"¿Cuál es tu enfoque: fuerza, resistencia, potencia?","type":"select","options":["Força","Resistência","Potência","Todos"]}
]'::jsonb)
on conflict do nothing;
