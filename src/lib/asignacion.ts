import { supabase } from './supabase'
import { normalizarParams } from './parametros'
import { SELECT_DIETA, copiaParaAlumno, type Dieta } from '@/pages/professor/projetos/dietas/datos'
import { aviso } from '@/lib/avisos'

/**
 * Las rutinas y dietas del alumno son copias editables (routines/diets con
 * student_id). La app del alumno lee una copia en JSON (student_routines.data /
 * student_diets.data): estas funciones la regeneran después de cada cambio.
 */

type Periodo = { starts_on: string; ends_on: string | null; weekdays: number[]; frequency: number }

export function estimarTreinos(p: Periodo) {
  if (!p.ends_on) return 0
  const fin = new Date(p.ends_on + 'T00:00:00')
  let n = 0
  for (let d = new Date(p.starts_on + 'T00:00:00'); d <= fin; d.setDate(d.getDate() + 1)) if (p.weekdays.includes(d.getDay())) n++
  return n
}

export function periodoPorDefecto(): Periodo {
  const hoy = new Date()
  const fin = new Date(Date.now() + 60 * 86400000)
  return { starts_on: hoy.toISOString().slice(0, 10), ends_on: fin.toISOString().slice(0, 10), weekdays: [1, 3, 5], frequency: 3 }
}

export async function copiaDeRutina(routineId: string) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('exercise_id,exercise_name_snapshot,position,group_type,group_id,series(position,params,notes),exercises(name_pt,name_es,name_en,muscle_group,muscle_groups,thumbnail_url,video_url,media_type)')
    .eq('routine_id', routineId)
    .order('position')
  if (error) throw error
  type Fila = {
    exercise_id: string | null; exercise_name_snapshot: string | null; group_type: string; group_id: string | null
    series: { position: number; params: Record<string, string>; notes: string | null }[]
    exercises: { name_pt: string | null; name_es: string | null; name_en: string | null; muscle_group: string | null; muscle_groups: string[] | null; thumbnail_url: string | null; video_url: string | null; media_type: string | null } | null
  }
  return {
    exercises: ((data as unknown as Fila[]) ?? []).map((e) => ({
      // name es la clave estable (historial de cargas); name_xx es lo que se muestra.
      name: e.exercise_name_snapshot,
      name_pt: e.exercises?.name_pt ?? null,
      name_es: e.exercises?.name_es ?? null,
      name_en: e.exercises?.name_en ?? null,
      exercise_id: e.exercise_id,
      muscle_group: e.exercises?.muscle_group ?? null,
      muscle_groups: e.exercises?.muscle_groups ?? null,
      thumbnail_url: e.exercises?.thumbnail_url ?? null,
      video_url: e.exercises?.video_url ?? null,
      media_type: e.exercises?.media_type ?? null,
      group_type: e.group_type,
      group_id: e.group_id,
      series: e.series.slice().sort((a, b) => a.position - b.position).map((s) => {
        const p = normalizarParams(s.params)
        return { reps: p.repetition ?? '', load: p.load ?? '', rest: p.rest ?? '', params: p, notes: s.notes ?? null }
      }),
    })),
  }
}

/** Regenera lo que ve el alumno de esta rutina (nombre, objetivo y ejercicios). */
export async function sincronizarRutinaAlumno(routineId: string) {
  const { data: r } = await supabase.from('routines').select('name,objective,student_id').eq('id', routineId).single()
  if (!r?.student_id) return
  const data = await copiaDeRutina(routineId)
  await supabase.from('student_routines').update({ name: r.name, objective: r.objective, data, updated_at: new Date().toISOString() }).eq('routine_id', routineId)
}

/** Copia editable de una rutina para el alumno + su asignación con período. */
export async function asignarRutina(opts: { rutinaId: string; alumnoId: string; profesorId: string; profesorNombre: string | null; periodo?: Periodo; nombre?: string }) {
  const periodo = opts.periodo ?? periodoPorDefecto()
  const { data: nuevaId, error } = await supabase.rpc('copiar_rotina', { rotina_id: opts.rutinaId, para_alumno: opts.alumnoId, nuevo_nombre: opts.nombre ?? null })
  if (error) throw error
  const { data: r } = await supabase.from('routines').select('name,objective').eq('id', nuevaId).single()
  const { count } = await supabase.from('student_routines').select('id', { count: 'exact', head: true }).eq('student_id', opts.alumnoId)
  const { error: e2 } = await supabase.from('student_routines').insert({
    student_id: opts.alumnoId, teacher_id: opts.profesorId, source_routine_id: opts.rutinaId, routine_id: nuevaId,
    name: r?.name, objective: r?.objective, ...periodo, estimated_workouts: estimarTreinos(periodo),
    position: count ?? 0, data: await copiaDeRutina(nuevaId as string),
  })
  if (e2) throw e2
  await avisar(opts.alumnoId, aviso('newRoutine', { who: opts.profesorNombre, name: r?.name }))
  return nuevaId as string
}

/** Rutina vacía creada directamente en el alumno. */
export async function crearRutinaAlumno(opts: { alumnoId: string; profesorId: string; profesorNombre?: string | null; nombre: string; difficulty: string | null; objective: string | null; periodo: Periodo; posicion: number }) {
  const { data: r, error } = await supabase.from('routines')
    .insert({ owner_id: opts.profesorId, student_id: opts.alumnoId, name: opts.nombre, difficulty: opts.difficulty, objective: opts.objective })
    .select('id').single()
  if (error) throw error
  const { error: e2 } = await supabase.from('student_routines').insert({
    student_id: opts.alumnoId, teacher_id: opts.profesorId, routine_id: r.id, name: opts.nombre, objective: opts.objective,
    ...opts.periodo, estimated_workouts: estimarTreinos(opts.periodo), position: opts.posicion, data: { exercises: [] },
  })
  if (e2) throw e2
  // Creada directo en el alumno: también se le avisa (como al asignar una de Mis Proyectos).
  await avisar(opts.alumnoId, aviso('newRoutine', { who: opts.profesorNombre ?? null, name: opts.nombre }))
  return r.id as string
}

export async function sincronizarDietaAlumno(dietId: string) {
  const { data } = await supabase.from('diets').select(SELECT_DIETA).eq('id', dietId).single()
  const d = data as Dieta & { student_id: string | null }
  if (!d?.student_id) return
  await supabase.from('student_diets').update({ name: d.name, data: copiaParaAlumno(d), updated_at: new Date().toISOString() }).eq('diet_id', dietId)
}

/** Copia editable de una dieta (con refeições, receitas y alimentos) para el alumno. */
export async function asignarDieta(opts: { dieta: Dieta; alumnoId: string; profesorId: string; profesorNombre: string | null }) {
  const d = opts.dieta
  const { data: nueva, error } = await supabase.from('diets')
    .insert({ owner_id: opts.profesorId, student_id: opts.alumnoId, name: d.name, goal: d.goal, position: 0 })
    .select('id').single()
  if (error) throw error
  for (const m of d.meals) {
    const { data: mm, error: e1 } = await supabase.from('meals')
      .insert({ diet_id: nueva.id, name: m.name, time_of_day: m.time_of_day, meal_type: m.meal_type, position: m.position }).select('id').single()
    if (e1) throw e1
    const recetas = new Map<string, string>()
    for (const r of m.meal_recipes) {
      const { data: rr, error: e2 } = await supabase.from('meal_recipes')
        .insert({ meal_id: mm.id, recipe_id: r.recipe_id, name: r.name, steps: r.steps, tips: r.tips, cover_url: r.cover_url, position: r.position }).select('id').single()
      if (e2) throw e2
      recetas.set(r.id, rr.id)
    }
    if (m.meal_foods.length > 0) {
      const { error: e3 } = await supabase.from('meal_foods').insert(m.meal_foods.map(({ id: _i, meal_id: _m, meal_recipe_id, ...resto }) => ({
        ...resto, meal_id: mm.id, meal_recipe_id: meal_recipe_id ? recetas.get(meal_recipe_id) ?? null : null,
      })))
      if (e3) throw e3
    }
  }
  const { data: copia } = await supabase.from('diets').select(SELECT_DIETA).eq('id', nueva.id).single()
  const { error: e4 } = await supabase.from('student_diets').insert({
    student_id: opts.alumnoId, teacher_id: opts.profesorId, source_diet_id: d.id, diet_id: nueva.id, name: d.name, data: copiaParaAlumno(copia as Dieta),
  })
  if (e4) throw e4
  await avisar(opts.alumnoId, aviso('newDiet', { who: opts.profesorNombre, name: d.name }))
  return nueva.id as string
}

/** Dieta vacía creada directamente en el alumno. */
export async function crearDietaAlumno(opts: { alumnoId: string; profesorId: string; profesorNombre?: string | null; nombre: string; goal: string }) {
  const { data, error } = await supabase.from('diets')
    .insert({ owner_id: opts.profesorId, student_id: opts.alumnoId, name: opts.nombre, goal: opts.goal, position: 0 }).select('id').single()
  if (error) throw error
  const { error: e2 } = await supabase.from('student_diets').insert({
    student_id: opts.alumnoId, teacher_id: opts.profesorId, diet_id: data.id, name: opts.nombre, data: { goal: opts.goal, meals: [] },
  })
  if (e2) throw e2
  await avisar(opts.alumnoId, aviso('newDiet', { who: opts.profesorNombre ?? null, name: opts.nombre }))
  return data.id as string
}

async function avisar(alumnoId: string, texto: ReturnType<typeof aviso>) {
  await supabase.from('notifications').insert({ user_id: alumnoId, type: 'routine', ...texto })
}
