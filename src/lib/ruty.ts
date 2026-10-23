import { supabase } from './supabase'
import { crearRutinaAlumno, periodoPorDefecto, sincronizarRutinaAlumno } from './asignacion'

/** Ruty: asistente que arma borradores de rutina (Edge Function `ruty`). Gratis 1 rutina; Básico 20 y Pro 200 por mes; admin sin límite. */

export type EjercicioRuty = {
  exercise_id: string; nombre: string; grupo: string | null
  series: number; tipo: 'reps' | 'tiempo'; valor: string; carga_kg: string; carga_origen: 'historial' | '1rm' | 'estimada' | ''; intensidad: '' | 'light' | 'moderate' | 'high' | 'maximum' | 'technique'; descanso_seg: number; notas: string
}
export type DiaRuty = { nombre: string; dias_semana: number[]; ejercicios: EjercicioRuty[] }
export type BorradorRuty = { plan: { nombre: string; objetivo: string; dias: DiaRuty[] }; advertencias: string[]; segundos: number }

export type PlanRuty = 'free' | 'basic' | 'pro' | 'admin'
export type EstadoRuty = { permitido: boolean; plan: PlanRuty; limite: number | null; usados: number }

const estadoPorCuenta = new Map<string, Promise<EstadoRuty>>()
/** Si esta cuenta puede usar Ruty ahora (lo decide el servidor según el plan). Se consulta con la sesión ya cargada. */
export function estadoRuty(userId: string, refrescar = false) {
  if (refrescar || !estadoPorCuenta.has(userId)) {
    estadoPorCuenta.set(userId, supabase.functions.invoke('ruty', { body: { accion: 'estado' } })
      .then(({ data }) => ({ permitido: Boolean(data?.permitido), plan: (data?.plan ?? 'free') as PlanRuty, limite: data?.limite ?? null, usados: Number(data?.usados ?? 0) }))
      .catch(() => ({ permitido: false, plan: 'free' as PlanRuty, limite: 1, usados: 0 })))
  }
  return estadoPorCuenta.get(userId)!
}

/** Error de Ruty cuando el plan ya no tiene rutinas disponibles (Gratis usada, o límite del mes). */
export class RutyUpgrade extends Error {}

export async function pedirRutina(alumnoId: string, pedido: string, lang: string): Promise<BorradorRuty> {
  const { data, error } = await supabase.functions.invoke('ruty', { body: { accion: 'rutina', alumno_id: alumnoId, pedido, lang } })
  if (error) {
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null)
    if (detalle?.codigo === 'limite') throw new RutyUpgrade(detalle.error)
    throw new Error(detalle?.error ?? error.message)
  }
  return data as BorradorRuty
}

/** Guarda el borrador en el alumno: una rutina por día, con sus ejercicios y series (mismo camino que crearla a mano). */
export async function guardarBorrador(b: BorradorRuty, o: { alumnoId: string; profesorId: string; profesorNombre: string | null; posicion: number; diasContrato?: number[] }) {
  const base = periodoPorDefecto()
  for (const [i, dia] of b.plan.dias.entries()) {
    const weekdays = dia.dias_semana.length ? dia.dias_semana : (o.diasContrato?.length ? o.diasContrato : base.weekdays)
    const routineId = await crearRutinaAlumno({
      alumnoId: o.alumnoId, profesorId: o.profesorId, profesorNombre: o.profesorNombre,
      nombre: dia.nombre, difficulty: null, objective: b.plan.objetivo,
      periodo: { ...base, weekdays, frequency: weekdays.length }, posicion: o.posicion + i,
    })
    for (const [pos, e] of dia.ejercicios.entries()) {
      const { data: re, error } = await supabase.from('routine_exercises')
        .insert({ routine_id: routineId, exercise_id: e.exercise_id, exercise_name_snapshot: e.nombre, position: pos, group_type: 'single', notes: e.notas || null })
        .select('id').single()
      if (error) throw error
      const params: Record<string, string> = e.tipo === 'tiempo' ? { time: e.valor.replace(/[^\d]/g, '') } : { repetition: e.valor }
      if (/^\d+([.,]\d+)?$/.test(e.carga_kg.trim())) params.load = e.carga_kg.trim().replace(',', '.')
      params.rest = String(e.descanso_seg)
      // La intensidad va a su parámetro de la serie; la observación queda libre para el profesor.
      if (e.intensidad) params.intensity = e.intensidad
      const series = Array.from({ length: Math.max(1, e.series) }, (_, n) => ({ routine_exercise_id: re.id, position: n, params, notes: null }))
      const { error: e2 } = await supabase.from('series').insert(series)
      if (e2) throw e2
    }
    await sincronizarRutinaAlumno(routineId)
  }
}
