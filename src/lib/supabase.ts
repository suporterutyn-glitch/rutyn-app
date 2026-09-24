import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// El link de recuperación inicia sesión; si cae en otra ruta, los guardas
// mandan al home y el usuario nunca elige la contraseña nueva.
const hashInicial = new URLSearchParams(window.location.hash.slice(1))
const esRecuperacion = hashInicial.get('type') === 'recovery'
  || (hashInicial.has('error') && window.location.pathname === '/redefinir-senha')
if (esRecuperacion && window.location.pathname !== '/redefinir-senha') {
  window.history.replaceState(null, '', '/redefinir-senha' + window.location.hash)
}

/** Supabase devuelve en el hash por qué el link no sirve (vencido, ya usado). */
export const errorDeLinkRecuperacion = hashInicial.get('error_code') ?? hashInicial.get('error')

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const isSupabaseConfigured = !!(url && key)
