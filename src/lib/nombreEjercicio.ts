/**
 * El catálogo global se sembró con nombres en español. Ahora cada ejercicio
 * lleva name_pt / name_es / name_en; los que creó el profesor solo tienen `name`.
 * Esta función resuelve cuál mostrar sin romper los que no están traducidos.
 */
export type ConTraducciones = {
  name: string
  name_pt?: string | null
  name_es?: string | null
  name_en?: string | null
  description?: string | null
  description_pt?: string | null
  description_es?: string | null
  description_en?: string | null
}

/** Columnas a pedir en el select cuando se vaya a mostrar el nombre. */
export const COLUMNAS_NOMBRE = 'name,name_pt,name_es,name_en'

function idioma(lang: string): 'pt' | 'es' | 'en' {
  const base = (lang || 'pt').slice(0, 2).toLowerCase()
  return base === 'es' ? 'es' : base === 'en' ? 'en' : 'pt'
}

export function nombreEjercicio(e: ConTraducciones | null | undefined, lang: string): string {
  if (!e) return ''
  const l = idioma(lang)
  return (l === 'es' ? e.name_es : l === 'en' ? e.name_en : e.name_pt) || e.name || ''
}

export function descripcionEjercicio(e: ConTraducciones | null | undefined, lang: string): string {
  if (!e) return ''
  const l = idioma(lang)
  return (
    (l === 'es' ? e.description_es : l === 'en' ? e.description_en : e.description_pt) ||
    e.description ||
    ''
  )
}
