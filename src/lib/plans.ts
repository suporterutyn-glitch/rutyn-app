import { countryByCode } from '@/lib/countries'
import { localeDe } from './fechas'

// Planes del profesor: Brasil paga en reales (Stripe BR solo cobra tarjetas
// brasileñas en BRL) y el resto en dólares. Mismos valores que
// supabase/functions/_shared/stripe.ts y la función SQL limite_alumnos.
export type PlanVisible = 'free' | 'basic' | 'pro'
// Básico: precio fijo por los primeros `incluidos` alumnos + `extra` por cada adicional.
export const BASIC = { min: 2, incluidos: 2 }
export type MonedaPlan = 'usd' | 'brl'
export const PRECIO_PLAN: Record<MonedaPlan, { base: number; extra: number; pro: number }> = {
  usd: { base: 4.99, extra: 1, pro: 49.99 },
  brl: { base: 9.99, extra: 2, pro: 149 },
}
// Hasta donde el Básico sale más barato que el Pro.
export const MAX_BASIC: Record<MonedaPlan, number> = { usd: 46, brl: 71 }
export function precioBasico(alumnos: number, moneda: MonedaPlan) {
  const p = PRECIO_PLAN[moneda]
  return Math.round((p.base + Math.max(0, alumnos - BASIC.incluidos) * p.extra) * 100) / 100
}
export function monedaPlan(pais?: string | null): MonedaPlan {
  return (pais ?? '').toUpperCase() === 'BR' ? 'brl' : 'usd'
}
export function precioPlan(v: number, moneda: MonedaPlan) {
  return moneda === 'brl' ? formatMoney(v, 'BRL') : usd(v)
}

/** master/elite son planes viejos: cuentan como Pro. */
export function planVisible(plan?: string | null): PlanVisible {
  if (plan === 'basic') return 'basic'
  if (plan === 'pro' || plan === 'master' || plan === 'elite') return 'pro'
  return 'free'
}

/** Alumnos activos que permite el plan; null = sin límite. */
export function limiteDePlan(p?: { plan?: string | null; plan_seats?: number | null } | null): number | null {
  const v = planVisible(p?.plan)
  if (v === 'pro') return null
  if (v === 'basic') return Math.max(p?.plan_seats ?? BASIC.min, BASIC.min)
  return 1
}

export function usd(v: number) {
  const n = new Intl.NumberFormat(localeDe(), { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(v)
  return `US$ ${n}`
}

/** Moneda local del país (la de las mensualidades que cobra el profesor). */
export function currencyOf(country?: string | null) {
  return countryByCode(country ?? 'BR')?.currency ?? 'BRL'
}

/** Sin centavos: para rangos de precio, donde ",00" solo agrega ruido. */
export function formatMoneyShort(v: number, currency: string) {
  return formatMoney(v, currency, true)
}

export function formatMoney(v: number, currency: string, sinDecimales = false) {
  const locale = currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'pt-PT' : 'es-UY'
  const noDecimals = sinDecimales || currency === 'PYG' || currency === 'CLP' || sinCentavos(currency)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: noDecimals ? 0 : 2,
      minimumFractionDigits: noDecimals ? 0 : 2,
    }).format(v)
  } catch {
    return `${v.toFixed(noDecimals ? 0 : 2)}`
  }
}

/** Monedas que no usan centavos (yen, won...). */
function sinCentavos(currency: string) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits === 0 } catch { return false }
}

// Faixas de preço do professor por país
export const PRICE_RANGES: Record<string, {
  hourly: { min: number; max: number; step: number };
  monthly: { min: number; max: number; step: number };
}> = {
  BR: { hourly: { min: 20, max: 500, step: 5 }, monthly: { min: 200, max: 5000, step: 50 } },
  UY: { hourly: { min: 300, max: 5000, step: 50 }, monthly: { min: 2000, max: 50000, step: 500 } },
  ES: { hourly: { min: 5, max: 100, step: 5 }, monthly: { min: 50, max: 1000, step: 25 } },
  PT: { hourly: { min: 5, max: 100, step: 5 }, monthly: { min: 50, max: 1000, step: 25 } },
  AR: { hourly: { min: 500, max: 20000, step: 500 }, monthly: { min: 5000, max: 200000, step: 1000 } },
  BO: { hourly: { min: 30, max: 300, step: 10 }, monthly: { min: 200, max: 3000, step: 50 } },
  PY: { hourly: { min: 20000, max: 300000, step: 1000 }, monthly: { min: 200000, max: 3000000, step: 10000 } },
  CL: { hourly: { min: 3000, max: 30000, step: 500 }, monthly: { min: 30000, max: 300000, step: 5000 } },
  CO: { hourly: { min: 15000, max: 200000, step: 1000 }, monthly: { min: 150000, max: 2000000, step: 10000 } },
  PE: { hourly: { min: 20, max: 300, step: 5 }, monthly: { min: 200, max: 3000, step: 50 } },
  EC: { hourly: { min: 5, max: 100, step: 5 }, monthly: { min: 50, max: 1000, step: 25 } },
  VE: { hourly: { min: 5, max: 100, step: 5 }, monthly: { min: 50, max: 1000, step: 25 } },
  MX: { hourly: { min: 100, max: 2000, step: 50 }, monthly: { min: 500, max: 10000, step: 100 } },
}

const MONEDAS_FUERTES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF']

/** Rango de precios del país; sin tabla propia, el de dólares/euros o el genérico. */
export function rangoDePrecios(country?: string | null) {
  return PRICE_RANGES[country ?? 'BR'] ?? (MONEDAS_FUERTES.includes(currencyOf(country)) ? PRICE_RANGES.EC : PRICE_RANGES.BR)
}

/** Lee un monto escrito a mano: "150", "150,50", "1.500,50" o "150.50". NaN si no es un número. */
export function leerMonto(texto: string): number {
  return Number(texto.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
}
