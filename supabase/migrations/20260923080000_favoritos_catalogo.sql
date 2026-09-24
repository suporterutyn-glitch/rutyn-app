-- Favoritos para el catálogo compartido (exercícios e alimentos).
--
-- routines/diets/recipes son filas del profesor, así que un is_favorite en la
-- propia fila alcanza. exercises y foods no: el catálogo es compartido, y un
-- booleano en la fila haría que marcar un favorito se lo marcara a todos.
-- El favorito es del usuario, no del item, y por eso vive en su propia tabla.

create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('exercise', 'food')),
  item_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, item_type, item_id)
);

alter table public.user_favorites enable row level security;

drop policy if exists user_favorites_own on public.user_favorites;
create policy user_favorites_own on public.user_favorites
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.user_favorites to authenticated;

-- PostgREST cachea el esquema: sin esto, la tabla existe pero la API responde
-- "Could not find the table in the schema cache" (PGRST205).
notify pgrst, 'reload schema';
