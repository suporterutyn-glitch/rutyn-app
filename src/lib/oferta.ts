// Oferta de lanzamiento para todo profesor que contrate su primer plan hasta el 1/11/2026 23:59 (UTC-3):
// 3 meses gratis, después 3 meses al 50% y luego el precio normal. Se anuncia en rutyn.com.br/oferta
// y dentro de la app. Stripe: prueba de 3 meses + cupón del 50% por 6 meses (ver stripe-create-checkout). Mismo código y fecha
// que supabase/functions/stripe-create-checkout. El descuento lo aplica Stripe.
import type { User } from '@supabase/supabase-js'

export const OFERTA = { codigo: 'lanzamiento50', porcentaje: 50, mesesGratis: 3, meses: 3, hasta: Date.parse('2026-11-02T02:59:59Z') }
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

/** El código de la oferta mientras está vigente: vale para todos los profesores que todavía no pagan. */
export function codigoOferta(_user?: User | null): string | null {
  return ofertaVigente() ? OFERTA.codigo : null
}
