// Generado desde Rutyn_Documentacao/dados/enums.json (listas parametro_serie y
// series_parameter_options). No editar a mano: si cambia la documentación,
// volver a extraerlo desde ahí.

export type TipoParametro = 'number' | 'select' | 'time'

export type OpcionParametro = { id: string; pt: string; es: string }

export type Parametro = {
  id: string
  pt: string
  es: string
  tipo: TipoParametro
  unidad: string | null
  opciones?: OpcionParametro[]
}

/** Los 18 parámetros que el profesor puede poner en una serie. */
export const PARAMETROS: Parametro[] = [
  {
    id: 'repetition', pt: 'Repetição', es: 'Repetición',
    tipo: 'number', unidad: null,
  },
  {
    id: 'load', pt: 'Carga', es: 'Carga',
    tipo: 'number', unidad: 'kg',
  },
  {
    id: 'cadence', pt: 'Cadência', es: 'Cadencia',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'eccentric_slow', pt: 'Excêntrica lenta', es: 'Excéntrica lenta' }, { id: 'concentric_explosive', pt: 'Concêntrica explosiva', es: 'Concéntrica explosiva' }, { id: 'isometric_pause', pt: 'Pausa isométrica', es: 'Pausa isométrica' }, { id: 'eccentric_pause', pt: 'Excêntrica + pausa', es: 'Excéntrica + pausa' }, { id: 'fast_up_slow_down', pt: 'Subida rápida / descida lenta', es: 'Subida rápida / bajada lenta' }],
  },
  {
    id: 'rest', pt: 'Descanso', es: 'Descanso',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'time', pt: 'Tempo', es: 'Tiempo',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'intensity', pt: 'Intensidade', es: 'Intensidad',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'light', pt: 'Leve', es: 'Leve' }, { id: 'moderate', pt: 'Moderada', es: 'Moderada' }, { id: 'high', pt: 'Alta', es: 'Alta' }, { id: 'maximum', pt: 'Máxima', es: 'Máxima' }, { id: 'technique', pt: 'Técnica', es: 'Técnica' }, { id: 'regenerative', pt: 'Regenerativa', es: 'Regenerativa' }, { id: 'progressive', pt: 'Progressiva', es: 'Progresiva' }, { id: 'interval', pt: 'Intervalada', es: 'Interválica' }, { id: 'sprint', pt: 'Sprint', es: 'Sprint' }],
  },
  {
    id: 'amplitude', pt: 'Amplitude', es: 'Amplitud',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'partial', pt: 'Parcial', es: 'Parcial' }, { id: 'partial_upper', pt: 'Parcial superior', es: 'Parcial superior' }, { id: 'partial_lower', pt: 'Parcial inferior', es: 'Parcial inferior' }, { id: 'complete', pt: 'Completa', es: 'Completa' }, { id: 'max_stretch', pt: 'Alongamento máximo', es: 'Estiramiento máximo' }, { id: 'reduced_range', pt: 'Range reduzido', es: 'Rango reducido' }, { id: 'extended_range', pt: 'Range ampliado', es: 'Rango ampliado' }],
  },
  {
    id: 'movement_type', pt: 'Tipo de Movimento', es: 'Tipo de Movimiento',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'push', pt: 'Empurrar', es: 'Empujar' }, { id: 'pull', pt: 'Puxar', es: 'Tirar' }, { id: 'squat', pt: 'Agachar', es: 'Agacharse' }, { id: 'lift', pt: 'Elevar', es: 'Elevar' }, { id: 'jump', pt: 'Saltar', es: 'Saltar' }, { id: 'stabilize', pt: 'Estabilizar', es: 'Estabilizar' }, { id: 'carry', pt: 'Carregar', es: 'Cargar' }, { id: 'drag', pt: 'Arrastar', es: 'Arrastrar' }, { id: 'rotate', pt: 'Girar', es: 'Girar' }, { id: 'land', pt: 'Aterrissar', es: 'Aterrizar' }, { id: 'throw', pt: 'Arremessar', es: 'Lanzar' }],
  },
  {
    id: 'inclination', pt: 'Inclinação', es: 'Inclinación',
    tipo: 'number', unidad: '%',
  },
  {
    id: 'speed', pt: 'Velocidade', es: 'Velocidad',
    tipo: 'number', unidad: 'km/h',
  },
  {
    id: 'distance', pt: 'Distância', es: 'Distancia',
    tipo: 'number', unidad: 'km',
  },
  {
    id: 'pace', pt: 'Pace', es: 'Pace',
    tipo: 'time', unidad: 'min/km',
  },
  {
    id: 'rhythm', pt: 'Ritmo', es: 'Ritmo',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'light', pt: 'Leve', es: 'Suave' }, { id: 'moderate', pt: 'Moderado', es: 'Moderado' }, { id: 'strong', pt: 'Forte', es: 'Fuerte' }, { id: 'maximum', pt: 'Máximo', es: 'Máximo' }, { id: 'increasing', pt: 'Crescente', es: 'Creciente' }, { id: 'decreasing', pt: 'Decrescente', es: 'Decreciente' }],
  },
  {
    id: 'isometric_time', pt: 'Tempo Isométrico', es: 'Tiempo Isométrico',
    tipo: 'time', unidad: 's',
  },
  {
    id: 'rounds', pt: 'Nº Rodadas', es: 'Nº de Rondas',
    tipo: 'number', unidad: null,
  },
  {
    id: 'swim_type', pt: 'Tipo de Nado', es: 'Estilo de Nado',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'crawl', pt: 'Crawl', es: 'Crol' }, { id: 'breaststroke', pt: 'Peito', es: 'Braza' }, { id: 'backstroke', pt: 'Costas', es: 'Espalda' }, { id: 'butterfly', pt: 'Borboleta', es: 'Mariposa' }, { id: 'medley', pt: 'Medley', es: 'Combinado' }],
  },
  {
    id: 'breathing_technique', pt: 'Técnica de Respiração', es: 'Técnica de Respiración',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'diaphragmatic', pt: 'Diafragmática', es: 'Diafragmática' }, { id: 'lateral_thoracic', pt: 'Lateral torácica', es: 'Torácica lateral' }, { id: 'costal', pt: 'Costal', es: 'Costal' }, { id: '3d_breathing', pt: 'Respiração 3D', es: 'Respiración 3D' }, { id: 'synchronized', pt: 'Sincronizada com o movimento', es: 'Sincronizada con el movimiento' }, { id: 'segmented', pt: 'Respiração segmentada', es: 'Respiración segmentada' }, { id: 'four_tempo', pt: '4 tempos', es: '4 tiempos' }, { id: 'bilateral_swim', pt: 'Bilateral (natação)', es: 'Bilateral (natación)' }, { id: 'unilateral_swim', pt: 'Unilateral (natação)', es: 'Unilateral (natación)' }, { id: 'every_2_strokes', pt: 'Cada 2 braçadas', es: 'Cada 2 brazadas' }, { id: 'every_3_strokes', pt: 'Cada 3 braçadas', es: 'Cada 3 brazadas' }],
  },
  {
    id: 'workout', pt: 'Workout', es: 'Workout',
    tipo: 'select', unidad: null,
    opciones: [{ id: 'amrap', pt: 'AMRAP', es: 'AMRAP' }, { id: 'emom', pt: 'EMOM', es: 'EMOM' }, { id: 'for_time', pt: 'For Time', es: 'For Time' }, { id: 'tabata', pt: 'Tabata', es: 'Tabata' }, { id: 'chipper', pt: 'Chipper', es: 'Chipper' }, { id: 'intervals', pt: 'Intervals', es: 'Intervals' }, { id: 'ladder', pt: 'Ladder', es: 'Ladder' }, { id: 'complex', pt: 'Complex', es: 'Complex' }],
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
  return lang.startsWith('es') ? p.es : p.pt
}

/** "40" + kg -> "40kg"; una opción de lista se muestra con su etiqueta. */
export function valorFormateado(p: Parametro, valor: string, lang: string) {
  if (!valor) return '—'
  if (p.tipo === 'select') {
    const o = p.opciones?.find((x) => x.id === valor)
    return o ? (lang.startsWith('es') ? o.es : o.pt) : valor
  }
  return p.unidad ? `${valor}${p.unidad}` : valor
}
