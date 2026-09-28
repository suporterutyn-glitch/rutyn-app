// Períodos de los gráficos de evolución: 30 días agrupa por día, 90 por semana y 180 (o más) por mes.
import { hoyLocal } from '@/lib/fechas'

export type Periodo = { tipo: '30' | '90' | '180' | 'custom'; desde: string; hasta: string }
export type Granularidad = 'day' | 'week' | 'month'

const aFecha = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d) }
const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const diasEntre = (a: string, b: string) => Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / 86400000)

export function periodoFijo(tipo: '30' | '90' | '180'): Periodo {
  const hasta = hoyLocal()
  const d = aFecha(hasta); d.setDate(d.getDate() - Number(tipo) + 1)
  return { tipo, desde: aTexto(d), hasta }
}

export function granularidad(p: Periodo): Granularidad {
  const dias = diasEntre(p.desde, p.hasta) + 1
  return dias <= 30 ? 'day' : dias <= 90 ? 'week' : 'month'
}

/** Clave del corte al que pertenece una fecha: el día, el lunes de su semana o "aaaa-mm". */
export function corteDe(fecha: string, g: Granularidad) {
  if (g === 'day') return fecha
  if (g === 'month') return fecha.slice(0, 7)
  const d = aFecha(fecha); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return aTexto(d)
}

export function cortesDe(p: Periodo, g: Granularidad): string[] {
  const out: string[] = []
  const d = aFecha(p.desde), fin = aFecha(p.hasta)
  while (d <= fin) {
    const k = corteDe(aTexto(d), g)
    if (out[out.length - 1] !== k) out.push(k)
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function etiquetaCorte(k: string, g: Granularidad, locale: string) {
  if (g === 'month') return aFecha(k + '-01').toLocaleDateString(locale, { month: 'short' }).replace('.', '')
  const d = aFecha(k)
  return g === 'day'
    ? d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
    : d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '')
}

/**
 * Agrupa filas por corte: dentro de cada corte vale la medición más reciente (filas en orden de fecha)
 * o, con modo 'max', el valor más alto.
 */
export function agrupar<T extends Record<string, unknown>>(filas: T[], campoFecha: keyof T, campo: keyof T, p: Periodo, modo: 'ultimo' | 'max' = 'ultimo') {
  const g = granularidad(p)
  const cortes = cortesDe(p, g)
  const pos = new Map(cortes.map((k, i) => [k, i]))
  const porCorte = new Map<number, number>()
  for (const f of filas) {
    const fecha = String(f[campoFecha])
    if (fecha < p.desde || fecha > p.hasta) continue
    const v = f[campo]
    if (v == null) continue
    const i = pos.get(corteDe(fecha, g))
    if (i != null) porCorte.set(i, modo === 'max' ? Math.max(porCorte.get(i) ?? -Infinity, Number(v)) : Number(v))
  }
  return { cortes, g, puntos: [...porCorte.entries()].map(([x, y]) => ({ x, y })).sort((a, b) => a.x - b.x) }
}
