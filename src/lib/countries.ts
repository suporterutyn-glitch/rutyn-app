export type Country = {
  code: string
  name_pt: string
  name_es: string
  dial: string
  flag: string
  lang: 'pt' | 'es'
  currency: string
  mask: string
  digits: number
  pix: boolean
}

export const COUNTRIES: Country[] = [
  { code: 'BR', name_pt: 'Brasil', name_es: 'Brasil', dial: '+55', flag: '🇧🇷', lang: 'pt', currency: 'BRL', mask: 'DD 9 XXXX XXXX', digits: 11, pix: true },
  { code: 'PT', name_pt: 'Portugal', name_es: 'Portugal', dial: '+351', flag: '🇵🇹', lang: 'pt', currency: 'EUR', mask: 'DDD XXX XXX', digits: 9, pix: false },
  { code: 'ES', name_pt: 'Espanha', name_es: 'España', dial: '+34', flag: '🇪🇸', lang: 'es', currency: 'EUR', mask: 'DDD XX XX XX', digits: 9, pix: false },
  { code: 'UY', name_pt: 'Uruguai', name_es: 'Uruguay', dial: '+598', flag: '🇺🇾', lang: 'es', currency: 'UYU', mask: 'DD XXX XXX', digits: 8, pix: false },
  { code: 'AR', name_pt: 'Argentina', name_es: 'Argentina', dial: '+54', flag: '🇦🇷', lang: 'es', currency: 'ARS', mask: 'DDD XXXX XXXX', digits: 10, pix: false },
  { code: 'BO', name_pt: 'Bolívia', name_es: 'Bolivia', dial: '+591', flag: '🇧🇴', lang: 'es', currency: 'BOB', mask: 'DDDD DDDD', digits: 8, pix: false },
  { code: 'PY', name_pt: 'Paraguai', name_es: 'Paraguay', dial: '+595', flag: '🇵🇾', lang: 'es', currency: 'PYG', mask: 'DDD XXX XXX', digits: 9, pix: false },
  { code: 'CL', name_pt: 'Chile', name_es: 'Chile', dial: '+56', flag: '🇨🇱', lang: 'es', currency: 'CLP', mask: 'D XXXX XXXX', digits: 9, pix: false },
  { code: 'CO', name_pt: 'Colômbia', name_es: 'Colombia', dial: '+57', flag: '🇨🇴', lang: 'es', currency: 'COP', mask: 'DDD XXX XXXX', digits: 10, pix: false },
  { code: 'PE', name_pt: 'Peru', name_es: 'Perú', dial: '+51', flag: '🇵🇪', lang: 'es', currency: 'PEN', mask: 'DDD DDD DDD', digits: 9, pix: false },
  { code: 'EC', name_pt: 'Equador', name_es: 'Ecuador', dial: '+593', flag: '🇪🇨', lang: 'es', currency: 'USD', mask: 'DD XXX XXXX', digits: 9, pix: false },
  { code: 'VE', name_pt: 'Venezuela', name_es: 'Venezuela', dial: '+58', flag: '🇻🇪', lang: 'es', currency: 'USD', mask: 'DDD XXX XXXX', digits: 10, pix: false },
]

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code)
}
