// deno-lint-ignore-file
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// Precios en USD para todos los países. Se crean solos en Stripe la primera
// vez (lookup_key), así solo hace falta cargar STRIPE_SECRET_KEY.
export const PRECIOS = {
  basic: { lookup: 'rutyn_basic_monthly_usd', nombre: 'Rutyn Básico', centavos: 100 },  // por alumno
  pro: { lookup: 'rutyn_pro_monthly_usd', nombre: 'Rutyn Pro', centavos: 2999 },        // ilimitado
} as const
export type PlanPago = keyof typeof PRECIOS
export const MIN_BASIC = 5
export const MAX_BASIC = 29 // con 30 o más el Pro sale más barato

export function stripe() {
  // @ts-ignore
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('stripe_not_configured')
  return new Stripe(key, { apiVersion: '2024-06-20' as any, httpClient: Stripe.createFetchHttpClient() })
}

export async function precioDe(s: any, plan: PlanPago): Promise<string> {
  const p = PRECIOS[plan]
  const { data } = await s.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 })
  if (data[0]) return data[0].id
  const creado = await s.prices.create({
    currency: 'usd', unit_amount: p.centavos, recurring: { interval: 'month' },
    lookup_key: p.lookup, product_data: { name: p.nombre, metadata: { rutyn_plan: plan } },
    metadata: { rutyn_plan: plan },
  })
  return creado.id
}

export function planDePrecio(price: any): PlanPago | null {
  const k = price?.lookup_key
  if (k === PRECIOS.basic.lookup) return 'basic'
  if (k === PRECIOS.pro.lookup) return 'pro'
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
