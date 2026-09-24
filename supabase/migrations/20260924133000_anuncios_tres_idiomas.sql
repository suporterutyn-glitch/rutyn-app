-- Anuncios en tres idiomas: la app muestra el del idioma elegido y, si falta, el portugués.
alter table public.announcements
  add column if not exists title_en text,
  add column if not exists body_en text,
  add column if not exists cta_label_es text,
  add column if not exists cta_label_en text;
