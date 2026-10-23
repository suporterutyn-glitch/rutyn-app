// Ruty: asistente que arma un BORRADOR de rutina para un alumno a partir de lo que dicta el profesor.
// Usa solo ejercicios del catálogo (base + propios del profesor) y los datos reales del alumno
// (evaluación, % de grasa, anamnesis). No guarda nada: el profesor revisa el borrador y lo guarda desde la app.
//
// POST { accion: 'estado' }                          -> { permitido, plan, limite, usados }
// POST { accion: 'rutina', alumno_id, pedido, lang } -> { plan, advertencias, segundos, costo_usd }
//                                                       o 402 { codigo: 'limite', plan } si ya no le quedan rutinas
//
// Límites (decisión del dueño, 2026-10-23): Gratis 1 rutina en total; Básico 20 por mes; Pro 200 por mes;
// administradores sin límite. El mes empieza el día 1 (hora de Brasil). Cada rutina armada queda en `ruty_usos`.
import Anthropic from 'npm:@anthropic-ai/sdk'
import { z } from 'npm:zod'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Modelo de IA: se elige con el secreto RUTY_MODELO (haiku, sonnet u opus) para poder subir de nivel sin tocar el código.
// Hoy: haiku, el más barato (decisión del dueño, 2026-10-23); opus es el que mejor razona casos de salud complejos.
const MODELOS: Record<string, { id: string; entrada: number; salida: number; cacheLeida: number; cacheEscrita: number }> = {
  haiku: { id: 'claude-haiku-5-5', entrada: 0.10, salida: 0.50, cacheLeida: 0.01, cacheEscrita: 0.125 },
  sonnet: { id: 'claude-sonnet-5-5', entrada: 2, salida: 10, cacheLeida: 0.2, cacheEscrita: 2.5 },
  opus: { id: 'claude-opus-5-5', entrada: 4, salida: 20, cacheLeida: 0.2, cacheEscrita: 5 },
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const Borrador = z.object({
  nombre_plan: z.string(),
  objetivo: z.string(),
  dias: z.array(z.object({
    nombre: z.string().describe('p. ej. "Día A - Piernas"'),
    dias_semana: z.array(z.number().int()).describe('Días sugeridos: 0 = domingo, 1 = lunes … 6 = sábado'),
    // Una línea por ejercicio (todas las series iguales): menos texto que escribir = respuesta más rápida y barata.
    ejercicios: z.array(z.object({
      ref: z.number().int().describe('Número del ejercicio en el catálogo'),
      series: z.number().int().describe('Cantidad de series'),
      tipo: z.enum(['reps', 'tiempo']).describe('reps = repeticiones; tiempo = segundos (isometrías, cardio, estiramientos)'),
      valor: z.string().describe('Repeticiones ("10", "8-12") o segundos ("30")'),
      carga_kg: z.string().describe('Carga en kg por serie (número, p. ej. "20" o "12.5"); "" en peso corporal, bandas, estiramientos o cardio'),
      carga_origen: z.enum(['historial', '1rm', 'estimada', '']).describe('De dónde sale la carga: historial del alumno, % de su 1RM, estimación inicial, o "" si no lleva'),
      intensidad: z.enum(['light', 'moderate', 'high', 'maximum', 'technique', '']).describe('Intensidad de la serie: light = leve, moderate = moderada, high = alta, maximum = máxima, technique = técnica; "" si no aplica'),
      descanso_seg: z.number().int(),
      notas: z.string().describe('Indicación breve para el alumno o ""'),
    })),
  })),
  advertencias: z.array(z.string()).describe('Riesgos, datos faltantes o cosas que el profesor debe revisar'),
})

const SISTEMA = (catalogo: string, lang: string) => `Sos Ruty, la asistente de entrenamiento de Rutyn, una app para entrenadores personales.
Un profesor te dice qué necesita para un alumno y vos armás un BORRADOR de rutina que él revisa, corrige y aprueba antes de asignarlo. La decisión final y la responsabilidad profesional son siempre del profesor.

Trabajamos con la salud de personas reales, así que:
- Usá únicamente ejercicios del catálogo de abajo, eligiéndolos por su número (ref). Nunca inventes ejercicios ni datos.
- Basate en criterios aceptados de prescripción de ejercicio (ACSM, NSCA): volumen, intensidad, frecuencia y descansos acordes al objetivo (fuerza, hipertrofia, resistencia, salud) y al nivel del alumno; progresión gradual; principiantes y adultos mayores con cargas bajas y técnica primero.
- Respetá toda lesión, enfermedad, medicación, embarazo o limitación que diga el profesor o que figure en los datos del alumno. Evitá los ejercicios contraindicados y elegí alternativas seguras del catálogo.
- No diagnostiques ni des indicaciones médicas. Si hay un riesgo de salud, una contraindicación dudosa o falta información importante, no lo adivines: anotalo en "advertencias" para que el profesor lo resuelva (por ejemplo, pedir alta médica).
- Si el profesor no aclara series, repeticiones, descansos o días, usá valores habituales para el objetivo y repartí los días con descanso entre estímulos parecidos.
- Cargas: en cada ejercicio con barra, mancuernas, kettlebell, máquina o polea poné una carga en kg. Prioridad: 1) si el alumno ya hizo ese ejercicio (historial de cargas), partí de esa carga y ajustala al nuevo rango de repeticiones (origen "historial"); 2) si hay 1RM cargado, usá un % acorde al objetivo (origen "1rm"); 3) si no hay datos, estimá una carga inicial CONSERVADORA según peso corporal, sexo, edad, nivel de experiencia y lesiones, como haría un profesor en la primera sesión (origen "estimada"): con principiantes, adultos mayores, embarazo o lesiones, elegí la carga más baja razonable. Las cargas de máquinas varían entre gimnasios: aclaralo una sola vez en advertencias si estimaste cargas. En peso corporal, bandas, estiramientos y cardio no pongas carga.
- Cada "día" del plan se guarda como una rutina separada del alumno.
- En notas y advertencias nombrá los ejercicios por su nombre, nunca por su número de catálogo.
- La intensidad elegila solo entre las opciones del campo (leve, moderada, alta, máxima, técnica); no uses siglas como RIR o RPE.
- Sé breve: notas de un renglón (solo si aportan algo), advertencias concretas de una o dos oraciones y como máximo 6.
- Escribí todo en el idioma "${lang}" (es = español, pt = portugués, en = inglés).

Catálogo (ref | nombre | grupo muscular | equipamiento | categoría):
${catalogo}`

/** Rutinas con Ruty por plan: Gratis en total; Básico y Pro por mes. */
const LIMITES = { free: 1, basic: 20, pro: 200 } as const

/** Primer instante del mes en curso (hora de Brasil, UTC-3). */
function inicioDeMes() {
  const [a, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).split('-')
  return `${a}-${m}-01T00:00:00-03:00`
}

const idioma = (l: string) => (l === 'pt' || l === 'en' ? l : 'es')
const texto = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v))

/** Resumen en texto de lo que la app sabe del alumno. */
async function datosDelAlumno(db: ReturnType<typeof createClient>, alumnoId: string, profesorId: string, lang: string) {
  const [{ data: f }, { data: grasa }, { data: anam }] = await Promise.all([
    db.from('assessments').select('*').eq('student_id', alumnoId).eq('teacher_id', profesorId).maybeSingle(),
    db.from('assessment_bodyfat').select('tested_on,weight_kg,fat_pct').eq('student_id', alumnoId).order('tested_on', { ascending: false }).limit(1).maybeSingle(),
    db.from('anamnesis_answers').select('template_name,questions,answers,comments,submitted_at').eq('student_id', alumnoId).eq('teacher_id', profesorId).eq('status', 'completed').order('created_at', { ascending: false }).limit(3),
  ])
  const l: string[] = []
  if (f) {
    const edad = f.birth_date ? Math.floor((Date.now() - new Date(f.birth_date).getTime()) / 31557600000) : f.age
    const campos: [string, unknown][] = [
      ['Edad', edad], ['Sexo', f.sex], ['Peso (kg)', f.weight_kg], ['Altura (cm)', f.height_cm], ['Objetivos', f.goals],
      ['Lesiones', f.injuries], ['Patologías', f.pathologies], ['Medicación', f.medications], ['Entrenos por semana', f.workouts_per_week],
      ['Nivel de actividad', f.activity_level], ['Tipo de trabajo', f.work_type], ['Fuma', f.smoker], ['FC en reposo', f.resting_hr],
      ['1RM banca (kg)', f.bench_1rm], ['1RM sentadilla (kg)', f.squat_1rm], ['1RM peso muerto (kg)', f.deadlift_1rm], ['Notas', f.notes],
    ]
    for (const [k, v] of campos) if (texto(v)) l.push(`${k}: ${v}`)
  }
  // Historial real: la última carga que hizo en cada ejercicio (últimos 4 meses).
  const { data: sesiones } = await db.from('workout_sessions').select('started_at,data').eq('student_id', alumnoId)
    .gte('started_at', new Date(Date.now() - 120 * 86400000).toISOString()).order('started_at', { ascending: false }).limit(60)
  const cargas = new Map<string, string>()
  for (const ses of sesiones ?? []) {
    for (const e of ((ses.data as { exercises?: { name?: string; name_es?: string; series?: { done?: boolean; load?: string; reps?: string }[] }[] })?.exercises ?? [])) {
      const nombre = e.name_es || e.name
      if (!nombre || cargas.has(nombre)) continue
      const hechas = (e.series ?? []).filter((x) => x.done && Number(String(x.load ?? '').replace(',', '.')) > 0)
      if (!hechas.length) continue
      const max = hechas.reduce((a, b) => (Number(String(b.load).replace(',', '.')) > Number(String(a.load).replace(',', '.')) ? b : a))
      cargas.set(nombre, `${max.load} kg × ${max.reps} (${String(ses.started_at).slice(0, 10)})`)
    }
  }
  if (cargas.size) l.push(`Historial de cargas (última vez que hizo cada ejercicio):\n${[...cargas].slice(0, 60).map(([n, c]) => `- ${n}: ${c}`).join('\n')}`)
  if (grasa?.fat_pct) l.push(`Último % de grasa: ${grasa.fat_pct}% (${grasa.tested_on}${grasa.weight_kg ? `, ${grasa.weight_kg} kg` : ''})`)
  for (const a of anam ?? []) {
    const preguntas = (a.questions ?? []) as { id: string; label?: string; label_pt?: string; label_es?: string; label_en?: string; type: string }[]
    const respuestas = (a.answers ?? {}) as Record<string, unknown>
    const comentarios = (a.comments ?? {}) as Record<string, unknown>
    const filas = preguntas.filter((q) => q.type !== 'image' && q.type !== 'document' && texto(respuestas[q.id]))
      .map((q) => {
        const r = respuestas[q.id]
        const c = texto(comentarios[q.id])
        return `- ${(q as Record<string, string>)[`label_${lang}`] || q.label}: ${r === true ? 'Sí' : r === false ? 'No' : r}${c ? ` (${c})` : ''}`
      })
    if (filas.length) l.push(`Anamnesis "${a.template_name}" (${String(a.submitted_at ?? '').slice(0, 10)}):\n${filas.join('\n')}`)
  }
  return l.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) return json({ error: 'sin sesión' }, 401)
  const { data: yo } = await db.from('profiles').select('role,plan,frozen_since').eq('id', user.id).maybeSingle()
  if (yo?.role !== 'teacher') return json({ error: 'solo para profesores' }, 403)
  const { data: admin } = await db.from('admins').select('id').eq('user_id', user.id).maybeSingle()
  const plan = admin ? 'admin' : yo.frozen_since ? 'free' : yo.plan === 'basic' ? 'basic' : ['pro', 'master', 'elite'].includes(yo.plan ?? '') ? 'pro' : 'free'
  const limite = plan === 'admin' ? null : LIMITES[plan]
  let consulta = db.from('ruty_usos').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id)
  if (plan === 'basic' || plan === 'pro') consulta = consulta.gte('created_at', inicioDeMes())
  const { count } = await consulta
  const usados = count ?? 0
  const permitido = limite === null || usados < limite

  const body = await req.json().catch(() => ({}))
  if (body.accion === 'estado') return json({ permitido, plan, limite, usados })
  if (!permitido) return json({ codigo: 'limite', plan, error: 'No te quedan rutinas con Ruty en tu plan' }, 402)
  if (body.accion !== 'rutina' || !body.alumno_id || !String(body.pedido ?? '').trim()) return json({ error: 'pedido incompleto' }, 400)
  const lang = idioma(body.lang)

  // Solo para alumnos del profesor que pide.
  const { data: alumno } = await db.from('profiles').select('id,full_name,teacher_id').eq('id', body.alumno_id).maybeSingle()
  if (!alumno || alumno.teacher_id !== user.id) return json({ error: 'alumno no encontrado' }, 404)

  const { data: ejercicios, error } = await db.from('exercises')
    .select('id,name,name_pt,name_es,name_en,muscle_group,equipment,category')
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`).order('name_es')
  if (error) return json({ error: error.message }, 500)
  const nombre = (e: Record<string, string | null>) => e[`name_${lang}`] || e.name_es || e.name || ''
  const catalogo = ejercicios!.map((e, i) => `${i + 1} | ${nombre(e)} | ${e.muscle_group ?? ''} | ${e.equipment ?? ''} | ${e.category ?? ''}`).join('\n')
  const datos = await datosDelAlumno(db, alumno.id, user.id, lang)

  const M = MODELOS[Deno.env.get('RUTY_MODELO') ?? ''] ?? MODELOS.haiku
  const cliente = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
  const inicio = Date.now()
  try {
    // Con Sonnet u Opus, si el modelo rechaza el pedido por sus filtros de seguridad, la API lo reintenta sola
    // con el modelo recomendado (Haiku no tiene ese respaldo).
    const respaldo = M.id === MODELOS.haiku.id ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
    const r = await cliente.beta.messages.create({
      model: M.id,
      max_tokens: 16000,
      ...respaldo,
      system: [{ type: 'text', text: SISTEMA(catalogo, lang), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Pedido del profesor:\n${body.pedido}\n\nAlumno: ${alumno.full_name ?? ''}\nDatos cargados en la app:\n${datos || '(no hay evaluación ni anamnesis cargadas)'}` }],
      output_config: { format: zodOutputFormat(Borrador), effort: 'medium' },
    } as never) as Anthropic.Beta.BetaMessage
    const segundos = Math.round((Date.now() - inicio) / 1000)
    const bloque = r.content.find((b) => b.type === 'text') as { text: string } | undefined
    if (r.stop_reason === 'refusal' || !bloque) return json({ error: 'Ruty no pudo armar esta rutina. Probá describirla de otra forma.' }, 502)
    const b = Borrador.safeParse(JSON.parse(bloque.text))
    if (!b.success) return json({ error: 'Ruty devolvió un borrador incompleto. Probá de nuevo.' }, 502)

    // Las referencias se traducen al catálogo real; una que no exista se descarta (nunca se inventa un ejercicio).
    let descartados = 0
    const dias = b.data.dias.map((d) => ({
      nombre: d.nombre,
      dias_semana: [...new Set(d.dias_semana.filter((n) => n >= 0 && n <= 6))].sort(),
      ejercicios: d.ejercicios.flatMap((x) => {
        const e = ejercicios![x.ref - 1]
        if (!e) { descartados++; return [] }
        const { ref: _ref, ...resto } = x
        return [{ ...resto, exercise_id: e.id, nombre: nombre(e), grupo: e.muscle_group }]
      }),
    })).filter((d) => d.ejercicios.length > 0)

    const u = r.usage
    const costo = (u.input_tokens * M.entrada + (u.cache_read_input_tokens ?? 0) * M.cacheLeida
      + (u.cache_creation_input_tokens ?? 0) * M.cacheEscrita + u.output_tokens * M.salida) / 1e6
    await db.from('ruty_usos').insert({ teacher_id: user.id, student_id: alumno.id, modelo: r.model, segundos, costo_usd: Number(costo.toFixed(5)) })
    console.log('ruty', JSON.stringify({ profesor: user.id, alumno: alumno.id, modelo: r.model, segundos, costo: costo.toFixed(4), descartados }))
    return json({ plan: { nombre: b.data.nombre_plan, objetivo: b.data.objetivo, dias }, advertencias: b.data.advertencias, segundos, costo_usd: Number(costo.toFixed(4)) })
  } catch (e) {
    console.error('ruty', String(e))
    return json({ error: 'Ruty no está respondiendo ahora. Probá en un momento.' }, 502)
  }
})
