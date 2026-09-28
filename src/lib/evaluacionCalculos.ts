// Cálculos de la evaluación física (módulo 06 de la especificación).

export type Sexo = 'M' | 'F'
export type Clase = 'veryWeak' | 'weak' | 'fair' | 'good' | 'excellent' | 'superior'

export const COLOR_CLASE: Record<Clase, string> = {
  veryWeak: '#EF5350', weak: '#FF7043', fair: '#FFC107', good: '#8BC34A', excellent: '#4CAF50', superior: '#00BCD4',
}

const ORDEN: Clase[] = ['veryWeak', 'weak', 'fair', 'good', 'excellent', 'superior']

/** Clase según límites ascendentes: por debajo del 1º = Muy débil; por encima del último = la clase siguiente. */
function porLimites(valor: number, limites: number[]): Clase {
  const i = limites.findIndex((l) => valor < l)
  return ORDEN[i === -1 ? limites.length : i]
}

const tramoEdad = (edad: number) => (edad < 30 ? 0 : edad < 40 ? 1 : edad < 50 ? 2 : 3)

// ---- 1RM (Epley) ----
export function rm1(cargaKg: number, reps: number) {
  if (!(cargaKg > 0) || !(reps >= 1)) return null
  return reps === 1 ? cargaKg : cargaKg * (1 + reps / 30)
}
export const PORCENTAJES_RM = [100, 50, 60, 70, 80, 90]

// ---- Resistencia aeróbica ----
export type Protocolo = 'cooper12' | 'cooper6' | 'rockport' | 'beep'
export const PROTOCOLOS: Protocolo[] = ['cooper12', 'cooper6', 'rockport', 'beep']

export type DatosAerobicos = { distance_m?: number | null; time_min?: number | null; final_hr?: number | null; weight_kg?: number | null; level?: number | null; shuttles?: number | null }

export function vo2max(p: Protocolo, d: DatosAerobicos, sexo: Sexo | null, edad: number | null): number | null {
  switch (p) {
    case 'cooper12':
      return d.distance_m ? (d.distance_m - 504.9) / 44.73 : null
    case 'cooper6':
      return d.distance_m ? (d.distance_m * 2 - 504.9) / 44.73 : null
    case 'rockport': {
      if (!d.time_min || !d.final_hr || !d.weight_kg || edad == null || !sexo) return null
      const lb = d.weight_kg * 2.20462
      return 132.853 - 0.0769 * lb - 0.3877 * edad + 6.315 * (sexo === 'M' ? 1 : 0) - 3.2649 * d.time_min - 0.1565 * d.final_hr
    }
    case 'beep': {
      // Ecuación de Flouris et al. (2005), que reproduce las tablas de Ramsbottom (1988):
      // VO₂ = 3,46 × (nivel + shuttles / (nivel × 0,4325 + 7,0048)) + 12,2
      if (!d.level) return null
      const s = Math.max(d.shuttles ?? 0, 0)
      return 3.46 * (d.level + s / (d.level * 0.4325 + 7.0048)) + 12.2
    }
  }
}

const VO2_H = [[25, 34, 43, 53, 64], [23, 31, 39, 49, 60], [20, 27, 36, 45, 55], [17, 24, 33, 42, 52]]
const VO2_M = [[24, 31, 38, 49, 58], [21, 28, 35, 45, 54], [19, 25, 32, 41, 50], [17, 22, 29, 37, 46]]

export function claseVO2(vo2: number | null, sexo: Sexo | null, edad: number | null): Clase | null {
  if (vo2 == null || !sexo || edad == null) return null
  return porLimites(vo2, (sexo === 'M' ? VO2_H : VO2_M)[tramoEdad(edad)])
}

// ---- Resistencia muscular ----
export type PruebaMuscular = 'situps' | 'plank_s' | 'pushups' | 'squats'
export const PRUEBAS_MUSCULARES: PruebaMuscular[] = ['situps', 'plank_s', 'pushups', 'squats']

const ABD_H = [[20, 30, 40, 50], [15, 25, 35, 45], [10, 20, 30, 40], [8, 15, 25, 35]]
const ABD_M = [[12, 20, 30, 40], [8, 15, 25, 35], [5, 10, 20, 30], [3, 8, 15, 25]]
const FLEX_H = [[17, 25, 35, 45], [13, 20, 30, 40], [10, 15, 25, 35], [8, 12, 20, 30]]
const FLEX_M = [[6, 12, 20, 30], [4, 8, 15, 25], [2, 6, 12, 20], [1, 4, 8, 15]]

/** Hasta 'excellent' (la resistencia muscular no tiene 'superior'). Prancha y sentadillas no dependen de la edad. */
export function claseMuscular(prueba: PruebaMuscular, valor: number | null, sexo: Sexo | null, edad: number | null): Clase | null {
  if (valor == null || !sexo) return null
  if (prueba === 'plank_s') return porLimites(valor, sexo === 'M' ? [20, 40, 60, 90] : [15, 30, 45, 75])
  if (prueba === 'squats') return porLimites(valor, sexo === 'M' ? [20, 30, 40, 50] : [15, 22, 32, 42])
  if (edad == null) return null
  const tabla = prueba === 'situps' ? (sexo === 'M' ? ABD_H : ABD_M) : (sexo === 'M' ? FLEX_H : FLEX_M)
  return porLimites(valor, tabla[tramoEdad(edad)])
}

/** 45 → "45 seg"; 95 → "1:35". */
export function formatoPlancha(seg: number, sufijoSeg: string) {
  if (seg < 60) return `${seg} ${sufijoSeg}`
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}

// ---- Perimetría ----
export const MEDIDAS = [
  { id: 'neck', color: '#78909C' }, { id: 'shoulders', color: '#FFA726' },
  { id: 'chest', color: '#E53935' }, { id: 'waist', color: '#FF7043' },
  { id: 'abdomen', color: '#FFEE58' }, { id: 'hips', color: '#AB47BC' },
  { id: 'biceps_relaxed_l', color: '#8BC34A' }, { id: 'biceps_relaxed_r', color: '#66BB6A' },
  { id: 'biceps_contracted_l', color: '#1E88E5' }, { id: 'biceps_contracted_r', color: '#42A5F5' },
  { id: 'forearm_l', color: '#5C6BC0' }, { id: 'forearm_r', color: '#7986CB' },
  { id: 'thigh_l', color: '#26C6DA' }, { id: 'thigh_r', color: '#4DD0E1' },
  { id: 'calf_l', color: '#EC407A' }, { id: 'calf_r', color: '#F48FB1' },
] as const
export type Medida = typeof MEDIDAS[number]['id']

/** Riesgo por relación cintura/cadera. */
export function riesgoCinturaCadera(cintura: number | null, cadera: number | null, sexo: Sexo | null) {
  if (!cintura || !cadera || !sexo) return null
  const r = cintura / cadera
  const [bajo, moderado] = sexo === 'M' ? [0.9, 1.0] : [0.8, 0.85]
  return { relacion: r, riesgo: (r < bajo ? 'low' : r < moderado ? 'moderate' : 'high') as 'low' | 'moderate' | 'high' }
}

// ---- % de grasa ----
export type ProtocoloGrasa = 'pollock3' | 'pollock7' | 'jp3m' | 'jp3f' | 'bia' | 'manual'
export const PROTOCOLOS_GRASA: ProtocoloGrasa[] = ['pollock3', 'pollock7', 'jp3m', 'jp3f', 'bia', 'manual']
export type Pliegue = 'chest' | 'midaxillary' | 'triceps' | 'subscapular' | 'abdomen' | 'suprailiac' | 'thigh'
export type ClaseGrasa = 'essential' | 'athlete' | 'fitness' | 'acceptable' | 'obesity'
export const COLOR_GRASA: Record<ClaseGrasa, string> = { essential: '#EF5350', athlete: '#4CAF50', fitness: '#8BC34A', acceptable: '#FFC107', obesity: '#EF5350' }

/** Sexo que usa la fórmula: Jackson-Pollock 3 fija el sexo; Pollock 3 usa el de la ficha. */
export function sexoFormula(p: ProtocoloGrasa, sexo: Sexo | null): Sexo | null {
  return p === 'jp3m' ? 'M' : p === 'jp3f' ? 'F' : sexo
}

export function pliegues(p: ProtocoloGrasa, sexo: Sexo | null): Pliegue[] {
  if (p === 'bia' || p === 'manual') return []
  if (p === 'pollock7') return ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdomen', 'suprailiac', 'thigh']
  return sexoFormula(p, sexo) === 'F' ? ['triceps', 'suprailiac', 'thigh'] : ['chest', 'abdomen', 'thigh']
}

/** % de grasa. Pliegues por Pollock/Jackson-Pollock + Siri; bioimpedancia/manual = valor informado. */
export function porcentajeGrasa(p: ProtocoloGrasa, valores: Partial<Record<Pliegue, number | null>>, manual: number | null, sexo: Sexo | null, edad: number | null): number | null {
  if (p === 'bia' || p === 'manual') return manual && manual > 0 ? manual : null
  const s = sexoFormula(p, sexo)
  if (!s || edad == null) return null
  const lista = pliegues(p, sexo).map((k) => valores[k])
  if (lista.some((v) => !v || v <= 0)) return null
  const S = (lista as number[]).reduce((a, b) => a + b, 0)
  const dc = p === 'pollock7'
    ? (s === 'M' ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * edad : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * edad)
    : (s === 'M' ? 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * edad : 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * edad)
  return 495 / dc - 450
}

export function claseGrasa(pct: number | null, sexo: Sexo | null): ClaseGrasa | null {
  if (pct == null || !sexo) return null
  const lim = sexo === 'M' ? [6, 14, 18, 25] : [14, 21, 25, 32]
  const orden: ClaseGrasa[] = ['essential', 'athlete', 'fitness', 'acceptable', 'obesity']
  const i = lim.findIndex((l) => pct < l)
  return orden[i === -1 ? 4 : i]
}
