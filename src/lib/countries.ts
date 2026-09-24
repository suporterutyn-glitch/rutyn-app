export type Country = {
  code: string
  name_pt: string
  name_es: string
  name_en: string
  dial: string
  flag: string
  lang: 'pt' | 'es'
  currency: string
  mask: string
  digits: number
  pix: boolean
}

export const COUNTRIES: Country[] = [
  { code: 'BR', name_pt: 'Brasil', name_es: 'Brasil', name_en: 'Brazil', dial: '+55', flag: '🇧🇷', lang: 'pt', currency: 'BRL', mask: 'DD 9 XXXX XXXX', digits: 11, pix: true },
  { code: 'PT', name_pt: 'Portugal', name_es: 'Portugal', name_en: 'Portugal', dial: '+351', flag: '🇵🇹', lang: 'pt', currency: 'EUR', mask: 'DDD XXX XXX', digits: 9, pix: false },
  { code: 'ES', name_pt: 'Espanha', name_es: 'España', name_en: 'Spain', dial: '+34', flag: '🇪🇸', lang: 'es', currency: 'EUR', mask: 'DDD XX XX XX', digits: 9, pix: false },
  { code: 'UY', name_pt: 'Uruguai', name_es: 'Uruguay', name_en: 'Uruguay', dial: '+598', flag: '🇺🇾', lang: 'es', currency: 'UYU', mask: 'DD XXX XXX', digits: 8, pix: false },
  { code: 'AR', name_pt: 'Argentina', name_es: 'Argentina', name_en: 'Argentina', dial: '+54', flag: '🇦🇷', lang: 'es', currency: 'ARS', mask: 'DDD XXXX XXXX', digits: 10, pix: false },
  { code: 'BO', name_pt: 'Bolívia', name_es: 'Bolivia', name_en: 'Bolivia', dial: '+591', flag: '🇧🇴', lang: 'es', currency: 'BOB', mask: 'DDDD DDDD', digits: 8, pix: false },
  { code: 'PY', name_pt: 'Paraguai', name_es: 'Paraguay', name_en: 'Paraguay', dial: '+595', flag: '🇵🇾', lang: 'es', currency: 'PYG', mask: 'DDD XXX XXX', digits: 9, pix: false },
  { code: 'CL', name_pt: 'Chile', name_es: 'Chile', name_en: 'Chile', dial: '+56', flag: '🇨🇱', lang: 'es', currency: 'CLP', mask: 'D XXXX XXXX', digits: 9, pix: false },
  { code: 'CO', name_pt: 'Colômbia', name_es: 'Colombia', name_en: 'Colombia', dial: '+57', flag: '🇨🇴', lang: 'es', currency: 'COP', mask: 'DDD XXX XXXX', digits: 10, pix: false },
  { code: 'PE', name_pt: 'Peru', name_es: 'Perú', name_en: 'Peru', dial: '+51', flag: '🇵🇪', lang: 'es', currency: 'PEN', mask: 'DDD DDD DDD', digits: 9, pix: false },
  { code: 'EC', name_pt: 'Equador', name_es: 'Ecuador', name_en: 'Ecuador', dial: '+593', flag: '🇪🇨', lang: 'es', currency: 'USD', mask: 'DD XXX XXXX', digits: 9, pix: false },
  { code: 'VE', name_pt: 'Venezuela', name_es: 'Venezuela', name_en: 'Venezuela', dial: '+58', flag: '🇻🇪', lang: 'es', currency: 'USD', mask: 'DDD XXX XXXX', digits: 10, pix: false },
]

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code)
}

/** Nombre del país en el idioma de la app. */
export function nombrePais(c: Pick<Country, 'name_pt' | 'name_es' | 'name_en'>, lang: string) {
  return lang.startsWith('es') ? c.name_es : lang.startsWith('en') ? c.name_en : c.name_pt
}
