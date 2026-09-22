# Migraciones archivadas — no aplicar

Copia de las migraciones tal como estaban antes de la limpieza del 2026-09-21.
Se conservan como referencia histórica. **Ninguna debe volver a `migrations/`.**

## Por qué estaban rotas

Los nombres no seguían el formato que espera la CLI (`<timestamp de 14 dígitos>_nombre.sql`).
Supabase toma como versión los dígitos **antes del primer `_`**, así que `20260919_000_…`,
`20260919_001_…` y `20260919_002_…` colapsaban todas en la versión `20260919`. La CLI daba esa
versión por aplicada y salteaba el resto en silencio: 16 migraciones nunca corrieron, y la base
de producción quedó con 4 tablas mientras el código consultaba 30.

## Por qué estas quedaron obsoletas

`exercises` y `foods` fueron redefinidas por `20260921120000_final_foods_exercises_migration`
(de `owner_id`/`name_pt`/`name_es` a `trainer_id`/`name`/`muscle_group`). Todo lo escrito contra
el esquema viejo ya no aplica:

| Archivo | Motivo |
|---|---|
| `20260919_001_fix_profiles_rls_recursion.sql` | Incluida en `20260921003000_fix_profiles_rls_live.sql` |
| `20260919_002_fase2_professor.sql` | Reemplazada por `20260921140000_fase2_professor_sin_catalogos.sql` |
| `20260921_010_bilingual_search.sql` | Usa `name_pt`/`name_es`, columnas que ya no existen |
| `20260921_011_seed_exercises_foods.sql` | Inserta con el esquema viejo |
| `20260921_012_seed_foods.sql` | Inserta con el esquema viejo |
| `20260921_020_fix_prof_test5177_role.sql` | Arregla un usuario de prueba que no existe |
| `20260921_100_restructure_foods_exercises_lovable.sql` | **Hace `DROP TABLE … CASCADE`**; la superó la `final` |
| `20260921_101_seed_global_foods_exercises.sql` | Mismo seed que ya aplicó la `final`; duplicaría el catálogo |

Los demás archivos de esta carpeta son copias de migraciones que **sí** siguen vigentes, con su
nombre viejo. La versión buena de cada una está en `migrations/` con timestamp correcto.

## Estado actual

`migrations/` tiene 13 archivos, todos con timestamp de 14 dígitos y todos registrados como
aplicados en `supabase_migrations.schema_migrations`. `supabase db push` es un no-op.

Salvedad: el orden de esos 13 refleja cómo se aplicaron sobre la base existente, no
necesariamente un replay limpio desde cero. Si alguna vez hay que reconstruir de cero, revisar
el orden antes (en particular, `fase2_professor_sin_catalogos` depende de que `exercises` y
`foods` ya existan, que las crea `final_foods_exercises_migration`).
