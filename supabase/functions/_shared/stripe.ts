// deno-lint-ignore-file
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// Una cuenta Stripe de Brasil solo puede cobrar tarjetas brasileñas en BRL:
// los profesores de Brasil pagan en reales y el resto en dólares. Los precios se
// crean solos en Stripe la primera vez (lookup_key).
export const PRECIOS = {
  basic: { nombre: 'Rutyn Básico', usd: { lookup: 'rutyn_basic_monthly_usd', centavos: 100 }, brl: { lookup: 'rutyn_basic_monthly_brl', centavos: 590 } },    // por alumno
  pro: { nombre: 'Rutyn Pro', usd: { lookup: 'rutyn_pro_monthly_usd', centavos: 2999 }, brl: { lookup: 'rutyn_pro_monthly_brl', centavos: 14990 } },         // ilimitado
} as const
export type Moneda = 'usd' | 'brl'
export function monedaDePais(pais?: string | null): Moneda {
  return (pais ?? '').toUpperCase() === 'BR' ? 'brl' : 'usd'
}
export type PlanPago = keyof typeof PRECIOS
export const MIN_BASIC = 5
export const MAX_BASIC = 29 // con 30 o más el Pro sale más barato

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
  const creado = await s.prices.create({
    currency: moneda, unit_amount: p.centavos, recurring: { interval: 'month' }, lookup_key: p.lookup,
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
