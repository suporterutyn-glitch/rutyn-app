export const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 25, master: 50, elite: 100 }
export const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', master: 'Master', elite: 'Elite' }

// [pro, master, elite] preços por moeda
export const PLAN_PRICES: Record<string, [number, number, number]> = {
  BRL: [99.99, 149.99, 199.99],
  UYU: [699.99, 1199.99, 1399.99],
  EUR: [19.99, 29.99, 39.99],
  USD: [19.99, 29.99, 39.99],
  ARS: [29399.99, 43999.99, 58699.99],
  BOB: [221.99, 331.99, 442.99],
  PYG: [118999, 177999, 236999],
  CLP: [18399, 27599, 36799],
  COP: [62699.99, 94099.99, 125999.99],
  PEN: [66.99, 99.99, 132.99],
}

export const COUNTRY_CURRENCY: Record<string, string> = {
  BR: 'BRL', PT: 'EUR', ES: 'EUR', UY: 'UYU', AR: 'ARS', BO: 'BOB', PY: 'PYG',
  CL: 'CLP', CO: 'COP', PE: 'PEN', EC: 'USD', VE: 'USD',
}

export function currencyOf(country?: string | null) {
  return COUNTRY_CURRENCY[country ?? 'BR'] ?? 'BRL'
}

export function formatMoney(v: number, currency: string) {
  const locale = currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'pt-PT' : 'es-UY'
  const noDecimals = currency === 'PYG' || currency === 'CLP'
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
