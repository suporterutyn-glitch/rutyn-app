// Generado desde Rutyn_Documentacao/dados/enums.json (listas parametro_serie y
// series_parameter_options). No editar a mano: si cambia la documentación,
// volver a extraerlo desde ahí.

import { etiqueta } from './catalogos'

export type TipoParametro = 'number' | 'select' | 'time'

export type OpcionParametro = { id: string; pt: string; es: string; en?: string }

export type Parametro = {
  id: string
  pt: string
  es: string
  en?: string
  tipo: TipoParametro
  unidad: string | null
  opciones?: OpcionParametro[]
}

/** Los 18 parámetros que el profesor puede poner en una serie. */
export const PARAMETROS: Parametro[] = [
  {
    id: 'repetition', pt: 'Repetição', es: 'Repetición', en: 'Reps',
    tipo: 'number', unidad: null,
  },
  {
    id: 'load', pt: 'Carga', es: 'Carga', en: 'Load',
    tipo: 'number', unidad: 'kg',
  },
  {
    id: 'cadence', pt: 'Cadência', es: 'Cadencia', en: 'Tempo',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'eccentric_slow', pt: 'Excêntrica lenta', es: 'Excéntrica lenta', en: 'Slow eccentric' }, { id: 'concentric_explosive', pt: 'Concêntrica explosiva', es: 'Concéntrica explosiva', en: 'Explosive concentric' }, { id: 'isometric_pause', pt: 'Pausa isométrica', es: 'Pausa isométrica', en: 'Isometric pause' }, { id: 'eccentric_pause', pt: 'Excêntrica + pausa', es: 'Excéntrica + pausa', en: 'Eccentric + pause' }, { id: 'fast_up_slow_down', pt: 'Subida rápida / descida lenta', es: 'Subida rápida / bajada lenta', en: 'Fast up / slow down' }],
  },
  {
    id: 'rest', pt: 'Descanso', es: 'Descanso', en: 'Rest',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'time', pt: 'Tempo', es: 'Tiempo', en: 'Time',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'intensity', pt: 'Intensidade', es: 'Intensidad', en: 'Intensity',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'light', pt: 'Leve', es: 'Leve', en: 'Light' }, { id: 'moderate', pt: 'Moderada', es: 'Moderada', en: 'Moderate' }, { id: 'high', pt: 'Alta', es: 'Alta', en: 'High' }, { id: 'maximum', pt: 'Máxima', es: 'Máxima', en: 'Maximum' }, { id: 'technique', pt: 'Técnica', es: 'Técnica', en: 'Technique' }, { id: 'regenerative', pt: 'Regenerativa', es: 'Regenerativa', en: 'Recovery' }, { id: 'progressive', pt: 'Progressiva', es: 'Progresiva', en: 'Progressive' }, { id: 'interval', pt: 'Intervalada', es: 'Interválica', en: 'Interval' }, { id: 'sprint', pt: 'Sprint', es: 'Sprint', en: 'Sprint' }],
  },
  {
    id: 'amplitude', pt: 'Amplitude', es: 'Amplitud', en: 'Range of Motion',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'partial', pt: 'Parcial', es: 'Parcial', en: 'Partial' }, { id: 'partial_upper', pt: 'Parcial superior', es: 'Parcial superior', en: 'Upper partial' }, { id: 'partial_lower', pt: 'Parcial inferior', es: 'Parcial inferior', en: 'Lower partial' }, { id: 'complete', pt: 'Completa', es: 'Completa', en: 'Full' }, { id: 'max_stretch', pt: 'Alongamento máximo', es: 'Estiramiento máximo', en: 'Maximum stretch' }, { id: 'reduced_range', pt: 'Range reduzido', es: 'Rango reducido', en: 'Reduced range' }, { id: 'extended_range', pt: 'Range ampliado', es: 'Rango ampliado', en: 'Extended range' }],
  },
  {
    id: 'movement_type', pt: 'Tipo de Movimento', es: 'Tipo de Movimiento', en: 'Movement Type',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'push', pt: 'Empurrar', es: 'Empujar', en: 'Push' }, { id: 'pull', pt: 'Puxar', es: 'Tirar', en: 'Pull' }, { id: 'squat', pt: 'Agachar', es: 'Agacharse', en: 'Squat' }, { id: 'lift', pt: 'Elevar', es: 'Elevar', en: 'Raise' }, { id: 'jump', pt: 'Saltar', es: 'Saltar', en: 'Jump' }, { id: 'stabilize', pt: 'Estabilizar', es: 'Estabilizar', en: 'Stabilize' }, { id: 'carry', pt: 'Carregar', es: 'Cargar', en: 'Carry' }, { id: 'drag', pt: 'Arrastar', es: 'Arrastrar', en: 'Drag' }, { id: 'rotate', pt: 'Girar', es: 'Girar', en: 'Rotate' }, { id: 'land', pt: 'Aterrissar', es: 'Aterrizar', en: 'Land' }, { id: 'throw', pt: 'Arremessar', es: 'Lanzar', en: 'Throw' }],
  },
  {
    id: 'inclination', pt: 'Inclinação', es: 'Inclinación', en: 'Incline',
    tipo: 'number', unidad: '%',
  },
  {
    id: 'speed', pt: 'Velocidade', es: 'Velocidad', en: 'Speed',
    tipo: 'number', unidad: 'km/h',
  },
  {
    id: 'distance', pt: 'Distância', es: 'Distancia', en: 'Distance',
    tipo: 'number', unidad: 'km',
  },
  {
    id: 'pace', pt: 'Pace', es: 'Pace', en: 'Pace',
    tipo: 'time', unidad: 'min/km',
  },
  {
    id: 'rhythm', pt: 'Ritmo', es: 'Ritmo', en: 'Rhythm',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'light', pt: 'Leve', es: 'Suave', en: 'Light' }, { id: 'moderate', pt: 'Moderado', es: 'Moderado', en: 'Moderate' }, { id: 'strong', pt: 'Forte', es: 'Fuerte', en: 'Strong' }, { id: 'maximum', pt: 'Máximo', es: 'Máximo', en: 'Maximum' }, { id: 'increasing', pt: 'Crescente', es: 'Creciente', en: 'Increasing' }, { id: 'decreasing', pt: 'Decrescente', es: 'Decreciente', en: 'Decreasing' }],
  },
  {
    id: 'isometric_time', pt: 'Tempo Isométrico', es: 'Tiempo Isométrico', en: 'Isometric Time',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'rounds', pt: 'Nº Rodadas', es: 'Nº de Rondas', en: 'Rounds',
    tipo: 'number', unidad: null,
  },
  {
    id: 'swim_type', pt: 'Tipo de Nado', es: 'Estilo de Nado', en: 'Swim Stroke',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'crawl', pt: 'Crawl', es: 'Crol', en: 'Freestyle' }, { id: 'breaststroke', pt: 'Peito', es: 'Braza', en: 'Breaststroke' }, { id: 'backstroke', pt: 'Costas', es: 'Espalda', en: 'Backstroke' }, { id: 'butterfly', pt: 'Borboleta', es: 'Mariposa', en: 'Butterfly' }, { id: 'medley', pt: 'Medley', es: 'Combinado', en: 'Medley' }],
  },
  {
    id: 'breathing_technique', pt: 'Técnica de Respiração', es: 'Técnica de Respiración', en: 'Breathing Technique',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'diaphragmatic', pt: 'Diafragmática', es: 'Diafragmática', en: 'Diaphragmatic' }, { id: 'lateral_thoracic', pt: 'Lateral torácica', es: 'Torácica lateral', en: 'Lateral thoracic' }, { id: 'costal', pt: 'Costal', es: 'Costal', en: 'Costal' }, { id: '3d_breathing', pt: 'Respiração 3D', es: 'Respiración 3D', en: '3D breathing' }, { id: 'synchronized', pt: 'Sincronizada com o movimento', es: 'Sincronizada con el movimiento', en: 'Synced with movement' }, { id: 'segmented', pt: 'Respiração segmentada', es: 'Respiración segmentada', en: 'Segmented breathing' }, { id: 'four_tempo', pt: '4 tempos', es: '4 tiempos', en: '4-count' }, { id: 'bilateral_swim', pt: 'Bilateral (natação)', es: 'Bilateral (natación)', en: 'Bilateral (swimming)' }, { id: 'unilateral_swim', pt: 'Unilateral (natação)', es: 'Unilateral (natación)', en: 'Unilateral (swimming)' }, { id: 'every_2_strokes', pt: 'Cada 2 braçadas', es: 'Cada 2 brazadas', en: 'Every 2 strokes' }, { id: 'every_3_strokes', pt: 'Cada 3 braçadas', es: 'Cada 3 brazadas', en: 'Every 3 strokes' }],
  },
  {
    id: 'workout', pt: 'Workout', es: 'Workout', en: 'Workout',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'amrap', pt: 'AMRAP', es: 'AMRAP', en: 'AMRAP' }, { id: 'emom', pt: 'EMOM', es: 'EMOM', en: 'EMOM' }, { id: 'for_time', pt: 'For Time', es: 'For Time', en: 'For Time' }, { id: 'tabata', pt: 'Tabata', es: 'Tabata', en: 'Tabata' }, { id: 'chipper', pt: 'Chipper', es: 'Chipper', en: 'Chipper' }, { id: 'intervals', pt: 'Intervals', es: 'Intervals', en: 'Intervals' }, { id: 'ladder', pt: 'Ladder', es: 'Ladder', en: 'Ladder' }, { id: 'complex', pt: 'Complex', es: 'Complex', en: 'Complex' }],
  },
]

export const PARAMETRO_POR_ID = new Map(PARAMETROS.map((p) => [p.id, p]))

/** Máximo por serie, según la especificación del módulo 07. */
export const MAX_PARAMETROS_POR_SERIE = 10

/**
 * Las series viejas guardaban { reps, load, rest } con la unidad pegada al
 * valor ("90s"). El catálogo usa 'repetition' y la unidad va aparte, así que
 * al leer se traduce la clave y se limpia el valor: sin esto se ve "90ss".
 */
export function normalizarParams(params: Record<string, string> | null | undefined): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const [clave, valor] of Object.entries(params ?? {})) {
    const id = clave === 'reps' ? 'repetition' : clave
    const p = PARAMETRO_POR_ID.get(id)
    if (!p) continue
    let v = String(valor ?? '').trim()
    if (v === '') continue
    if (p.tipo !== 'select' && p.unidad && v.toLowerCase().endsWith(p.unidad.toLowerCase())) {
      v = v.slice(0, -p.unidad.length).trim()
    }
    if (p.tipo === 'time' && /^\d+\s*s$/i.test(valor)) v = valor.replace(/\s*s$/i, '')
    salida[id] = v
  }
  return salida
}

export function etiquetaParametro(p: Parametro, lang: string) {
  return etiqueta(p, lang)
}

/** "40" + kg -> "40kg"; una opción de lista se muestra con su etiqueta. */
export function valorFormateado(p: Parametro, valor: string, lang: string) {
  if (!valor) return '—'
  if (p.tipo === 'select') {
    const o = p.opciones?.find((x) => x.id === valor)
    return o ? etiqueta(o, lang) : valor
  }
  return p.unidad ? `${valor}${p.unidad}` : valor
}
