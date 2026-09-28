import { idiomaDe } from './catalogos'
import i18n from './i18n'

/** Locale para fechas y números según el idioma de la app (sin argumento, el actual). */
export function localeDe(lang: string | undefined | null = i18n.language) {
  const l = idiomaDe(lang)
  return l === 'es' ? 'es-ES' : l === 'en' ? 'en-US' : 'pt-BR'
}

/** Nombres cortos de los días, de domingo a sábado, en el idioma de la app. */
export function diasCortos(lang: string | undefined | null): string[] {
  const loc = localeDe(lang)
  // 2024-01-07 fue domingo.
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i).toLocaleDateString(loc, { weekday: 'short' }).replace('.', '')
    return d.charAt(0).toUpperCase() + d.slice(1)
  })
}

/** Fecha de hoy "aaaa-mm-dd" en la hora del usuario (toISOString daría el día UTC). */
export function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
