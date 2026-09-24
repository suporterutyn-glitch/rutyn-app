/**
 * Textos de un módulo en los tres idiomas. El tipo obliga a que español e
 * inglés tengan exactamente las mismas claves que portugués: si falta una
 * traducción, no compila.
 */
type Forma<T> = { [K in keyof T]: T[K] extends string ? string : Forma<T[K]> }

export function textos<T extends Record<string, unknown>>(t: { pt: T; es: Forma<T>; en: Forma<T> }) {
  return t
}
