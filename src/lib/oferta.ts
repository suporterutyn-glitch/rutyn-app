// Oferta de lanzamiento: 50% durante 3 meses para quien llega por la página de la oferta
// (rutyn.com.br/oferta) y contrata hasta el 1/11/2026 23:59 (UTC-3). Mismo código y fecha
// que supabase/functions/stripe-create-checkout. El descuento lo aplica Stripe.
import type { User } from '@supabase/supabase-js'

export const OFERTA = { codigo: 'lanzamiento50', porcentaje: 50, meses: 3, hasta: Date.parse('2026-11-02T02:59:59Z') }
const CLAVE = 'rutyn_oferta'

export const ofertaVigente = () => Date.now() <= OFERTA.hasta

/** Guarda la oferta si la URL la trae (?oferta=lanzamiento50). */
export function guardarOfertaDesdeUrl() {
  try {
    if (new URLSearchParams(window.location.search).get('oferta') === OFERTA.codigo && ofertaVigente()) {
      localStorage.setItem(CLAVE, OFERTA.codigo)
    }
  } catch { /* sin almacenamiento: queda la del registro (user_metadata) */ }
}

/** El código de la oferta si este profesor la tiene y sigue vigente. */
export function codigoOferta(user?: User | null): string | null {
  if (!ofertaVigente()) return null
  let local: string | null = null
  try { local = localStorage.getItem(CLAVE) } catch { /* nada */ }
  const enUrl = new URLSearchParams(window.location.search).get('oferta')
  return [local, enUrl, user?.user_metadata?.oferta].includes(OFERTA.codigo) ? OFERTA.codigo : null
}
