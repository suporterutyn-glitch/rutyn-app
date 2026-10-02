import { supabase } from './supabase'

// Link de invitación del profesor: app.rutyn.com.br/c/<codigo>.
// El código se guarda hasta que el alumno tenga cuenta y se usa una sola vez.
const CLAVE = 'rutyn.convite'

export const urlConvite = (codigo: string) => `${window.location.origin}/c/${codigo}`

export function guardarCodigo(codigo: string) {
  try { localStorage.setItem(CLAVE, codigo.trim().toLowerCase()) } catch { /* sin storage */ }
}

export function leerCodigo(): string | null {
  try { return localStorage.getItem(CLAVE) } catch { return null }
}

export function borrarCodigo() {
  try { localStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}

export type ResultadoConvite = 'ok' | 'not_found' | 'not_student' | 'already_linked' | 'teacher_full' | 'error'

/** Vincula al alumno logueado con el profesor del código y lo borra. */
export async function usarCodigo(codigo: string): Promise<ResultadoConvite> {
  const { data, error } = await supabase.rpc('vincular_con_codigo', { p_codigo: codigo })
  if (error) return 'error'
  borrarCodigo()
  return (data as ResultadoConvite) ?? 'error'
}

export async function profesorDelCodigo(codigo: string) {
  const { data } = await supabase.rpc('profesor_por_codigo', { p_codigo: codigo })
  return ((data as { full_name: string | null; avatar_url: string | null }[] | null) ?? [])[0] ?? null
}

/** Clave del texto que explica por qué no se pudo usar el link. */
export function mensajeConvite(r: ResultadoConvite) {
  if (r === 'teacher_full') return 'signupStudent:linkFull'
  if (r === 'already_linked') return 'signupStudent:linkTaken'
  if (r === 'not_student') return 'signupStudent:linkTeacher'
  return 'signupStudent:linkInvalid'
}
