import { localeDe } from './fechas'

// Planes del profesor, en USD para todos los países (mismos valores que
// supabase/functions/_shared/stripe.ts y la función SQL limite_alumnos).
export type PlanVisible = 'free' | 'basic' | 'pro'
export const BASIC = { min: 5, max: 29, usdPorAlumno: 1 }
export const PRO_USD = 29.99

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

export const COUNTRY_CURRENCY: Record<string, string> = {
  BR: 'BRL', PT: 'EUR', ES: 'EUR', UY: 'UYU', AR: 'ARS', BO: 'BOB', PY: 'PYG',
  CL: 'CLP', CO: 'COP', PE: 'PEN', EC: 'USD', VE: 'USD',
}

export function currencyOf(country?: string | null) {
  return COUNTRY_CURRENCY[country ?? 'BR'] ?? 'BRL'
}

/** Sin centavos: para rangos de precio, donde ",00" solo agrega ruido. */
export function formatMoneyShort(v: number, currency: string) {
  return formatMoney(v, currency, true)
}

export function formatMoney(v: number, currency: string, sinDecimales = false) {
  const locale = currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'pt-PT' : 'es-UY'
  const noDecimals = sinDecimales || currency === 'PYG' || currency === 'CLP'
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
}
