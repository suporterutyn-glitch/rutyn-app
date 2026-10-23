import { supabase } from './supabase'
import { crearRutinaAlumno, periodoPorDefecto, sincronizarRutinaAlumno } from './asignacion'

/** Ruty: asistente que arma borradores de rutina (Edge Function `ruty`). Por ahora solo para algunas cuentas. */

export type SerieRuty = { tipo: 'reps' | 'tiempo'; valor: string; carga_kg: string; intensidad: string; descanso_seg: number }
export type DiaRuty = {
  nombre: string
  dias_semana: number[]
  ejercicios: { exercise_id: string; nombre: string; grupo: string | null; series: SerieRuty[]; notas: string }[]
}
export type BorradorRuty = { plan: { nombre: string; objetivo: string; dias: DiaRuty[] }; advertencias: string[]; segundos: number }

const activoPorCuenta = new Map<string, Promise<boolean>>()
/** Si esta cuenta puede usar Ruty (lo decide el servidor). Se consulta con la sesión ya cargada, una vez por cuenta. */
export async function rutyActivo(userId: string) {
  if (!activoPorCuenta.has(userId)) {
    activoPorCuenta.set(userId, supabase.functions.invoke('ruty', { body: { accion: 'estado' } })
      .then(({ data }) => Boolean(data?.activo)).catch(() => false))
  }
  return activoPorCuenta.get(userId)!
}

export async function pedirRutina(alumnoId: string, pedido: string, lang: string): Promise<BorradorRuty> {
  const { data, error } = await supabase.functions.invoke('ruty', { body: { accion: 'rutina', alumno_id: alumnoId, pedido, lang } })
  if (error) {
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null)
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
      const series = e.series.map((s, n) => {
        const params: Record<string, string> = s.tipo === 'tiempo' ? { time: s.valor.replace(/[^\d]/g, '') } : { repetition: s.valor }
        if (/^\d+([.,]\d+)?$/.test(s.carga_kg.trim())) params.load = s.carga_kg.trim().replace(',', '.')
        params.rest = String(s.descanso_seg)
        return { routine_exercise_id: re.id, position: n, params, notes: s.intensidad || null }
      })
      const { error: e2 } = await supabase.from('series').insert(series)
      if (e2) throw e2
    }
    await sincronizarRutinaAlumno(routineId)
  }
}
