// deno-lint-ignore-file
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// Una cuenta Stripe de Brasil solo puede cobrar tarjetas brasileñas en BRL:
// los profesores de Brasil pagan en reales y el resto en dólares. Los precios se
// crean solos en Stripe la primera vez (lookup_key).
// Básico: escalonado (graduated) — `base` cubre los primeros 2 alumnos y `extra` cada alumno adicional.
// Pro: fijo, alumnos ilimitados. Los precios de Stripe no se editan: al cambiar valores se sube la versión del lookup.
export const PRECIOS = {
  basic: { nombre: 'Rutyn Básico', usd: { lookup: 'rutyn_basic_v2_usd', base: 499, extra: 100 }, brl: { lookup: 'rutyn_basic_v2_brl', base: 2490, extra: 590 } },
  pro: { nombre: 'Rutyn Pro', usd: { lookup: 'rutyn_pro_v2_usd', centavos: 4999 }, brl: { lookup: 'rutyn_pro_v2_brl', centavos: 24990 } },
} as const
const INCLUIDOS_BASIC = 2
// Suscripciones creadas antes del cambio de precios siguen con su precio viejo.
const LOOKUPS_VIEJOS: Record<string, PlanPago> = {
  rutyn_basic_monthly_usd: 'basic', rutyn_basic_monthly_brl: 'basic', rutyn_pro_monthly_usd: 'pro', rutyn_pro_monthly_brl: 'pro',
}
export type Moneda = 'usd' | 'brl'
export function monedaDePais(pais?: string | null): Moneda {
  return (pais ?? '').toUpperCase() === 'BR' ? 'brl' : 'usd'
}
export type PlanPago = keyof typeof PRECIOS
export const MIN_BASIC = 2
export const MAX_BASIC = 46 // con 47 o más el Pro sale más barato

export function stripe() {
  // @ts-ignore
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('stripe_not_configured')
  return new Stripe(key, { apiVersion: '2024-06-20' as any, httpClient: Stripe.createFetchHttpClient() })
}

export async function precioDe(s: any, plan: PlanPago, moneda: Moneda = 'usd'): Promise<string> {
  const p = PRECIOS[plan][moneda]
  const { data } = await s.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 })
  if (data[0]) return data[0].id
  // Mismo producto que el precio en la otra moneda, para que en Stripe quede un solo "Rutyn Básico/Pro".
  const otra = PRECIOS[plan][moneda === 'usd' ? 'brl' : 'usd']
  const { data: hermano } = await s.prices.list({ lookup_keys: [otra.lookup], limit: 1 })
  const producto = hermano[0]?.product
  const monto = 'base' in p
    ? { billing_scheme: 'tiered', tiers_mode: 'graduated', tiers: [
        { up_to: INCLUIDOS_BASIC, flat_amount: p.base, unit_amount: 0 },
        { up_to: 'inf', unit_amount: p.extra },
      ] }
    : { unit_amount: p.centavos }
  const creado = await s.prices.create({
    currency: moneda, ...monto, recurring: { interval: 'month' }, lookup_key: p.lookup,
    ...(producto ? { product: typeof producto === 'string' ? producto : producto.id } : { product_data: { name: PRECIOS[plan].nombre, metadata: { rutyn_plan: plan } } }),
    metadata: { rutyn_plan: plan },
  })
  return creado.id
}

export function planDePrecio(price: any): PlanPago | null {
  const k = price?.lookup_key
  for (const plan of ['basic', 'pro'] as const) {
    if (k === PRECIOS[plan].usd.lookup || k === PRECIOS[plan].brl.lookup) return plan
  }
  if (k && LOOKUPS_VIEJOS[k]) return LOOKUPS_VIEJOS[k]
  return (price?.metadata?.rutyn_plan as PlanPago) ?? null
}

export function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
export function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...cors() } })
}
