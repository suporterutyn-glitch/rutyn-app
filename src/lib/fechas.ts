import { idiomaDe } from './catalogos'

/** Locale para fechas y números según el idioma de la app. */
export function localeDe(lang: string | undefined | null) {
  const l = idiomaDe(lang)
  return l === 'es' ? 'es-ES' : l === 'en' ? 'en-US' : 'pt-BR'
}
