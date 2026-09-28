-- Estas funciones ya verifican auth.uid(), pero nadie sin sesión necesita llamarlas.
-- existe_profesor queda abierta: la usa el registro del alumno antes de iniciar sesión.
revoke execute on function public.aceptar_convite(uuid) from anon, public;
revoke execute on function public.copiar_rotina(uuid, uuid, text) from anon, public;
revoke execute on function public.duplicar_rotina(uuid) from anon, public;
revoke execute on function public.definir_meta_hidratacao(uuid, integer) from anon, public;
revoke execute on function public.gestionar_vinculo_aluno(uuid, text, text) from anon, public;
grant execute on function public.aceptar_convite(uuid) to authenticated;
grant execute on function public.copiar_rotina(uuid, uuid, text) to authenticated;
grant execute on function public.duplicar_rotina(uuid) to authenticated;
grant execute on function public.definir_meta_hidratacao(uuid, integer) to authenticated;
grant execute on function public.gestionar_vinculo_aluno(uuid, text, text) to authenticated;

-- Funciones de trigger: el permiso solo se chequea al crear el trigger, no al dispararse.
revoke execute on function public.controlar_limite_alumnos() from anon, authenticated, public;
revoke execute on function public.crear_convite_desde_registro() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

alter function public.set_updated_at() set search_path = public;
