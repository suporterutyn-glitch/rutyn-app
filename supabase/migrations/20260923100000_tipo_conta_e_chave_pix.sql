-- "Dados do Professor" muestra Tipo de Conta y Tipo de Chave, pero esos dos
-- datos no existían: el alumno veía la cuenta sin saber si es corrente o
-- poupança, y la clave PIX sin saber si es CPF, e-mail o teléfono. Al pagar
-- desde el banco, ambas cosas hacen falta.

alter table public.profiles add column if not exists bank_account_type text;
alter table public.profiles add column if not exists pix_key_type text;

notify pgrst, 'reload schema';
