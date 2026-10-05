// Edge Function del panel de administración. Solo responde a usuarios de la tabla admins.
//
// POST { action, ... }
//   'user.update'    { id, fields }   edita un perfil (incluye plan, vínculo y estado de cuenta)
//   'user.delete'    { id }           borra la cuenta (auth + perfil en cascada) y cancela su suscripción de Stripe
//   'users.bulk'     { ids, op }      op: 'block' | 'unblock' | 'delete' sobre varias cuentas
//   'users.auth'                      correo confirmado y último ingreso de cada cuenta
//   'user.detail'    { id }           profesor: sus alumnos y lo que hace con cada uno; alumno: su actividad
//   'row.save'       { table, row }   crea/edita una fila del catálogo o contenido global
//   'row.delete'     { table, id }
//   'stripe.summary'                  ingresos por mes, pagos fallidos y suscripciones de Stripe
//   'stripe.cancel'  { id, now? }     cancela una suscripción (al final del período o ya)
//   'stripe.resume'  { id }

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, cors, json } from '../_shared/stripe.ts'
import { borrarCuenta } from '../_shared/cuentas.ts'

const CAMPOS_PERFIL = [
  'full_name', 'email', 'phone', 'country', 'state', 'city', 'language', 'gender', 'account_status',
  'link_status', 'teacher_id', 'plan', 'plan_seats', 'plan_status', 'plan_expires_at', 'marketplace_visible', 'bio',
]

// Solo filas globales: el catálogo propio de cada profesor no se toca desde acá.
const TABLAS: Record<string, { dueño?: string }> = {
  foods: { dueño: 'trainer_id' },
  exercises: { dueño: 'trainer_id' },
  announcements: {},
  anamnesis_templates: { dueño: 'owner_id' },
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // @ts-ignore
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await db.auth.getUser(jwt)
    if (!user) return json({ error: 'Invalid session' }, 401)
    const { data: esAdmin } = await db.from('admins').select('id').eq('user_id', user.id).maybeSingle()
    if (!esAdmin) return json({ error: 'Forbidden' }, 403)

    const b = await req.json().catch(() => ({})) as any

    switch (b.action) {
      case 'user.update': {
        const fields: Record<string, unknown> = {}
        for (const k of CAMPOS_PERFIL) if (k in (b.fields ?? {})) fields[k] = b.fields[k] === '' ? null : b.fields[k]
        const { error } = await db.from('profiles').update(fields).eq('id', b.id)
        if (error) return json({ error: error.message }, 400)
        if (typeof fields.email === 'string') {
          const { error: e2 } = await db.auth.admin.updateUserById(b.id, { email: fields.email, email_confirm: true })
          if (e2) return json({ error: e2.message }, 400)
        }
        return json({ ok: true })
      }

      case 'user.delete': {
        if (b.id === user.id) return json({ error: 'No podés borrar tu propia cuenta' }, 400)
        await eliminarUsuario(db, b.id)
        return json({ ok: true })
      }

      case 'users.bulk': {
        const ids: string[] = Array.isArray(b.ids) ? [...new Set(b.ids as string[])] : []
        if (!ids.length || ids.length > 200) return json({ error: 'Elegí entre 1 y 200 cuentas' }, 400)
        if (!['block', 'unblock', 'delete'].includes(b.op)) return json({ error: 'Operación desconocida' }, 400)
        // Las cuentas de administrador (incluida la propia) nunca entran en una acción en lote.
        const { data: adm } = await db.from('admins').select('user_id').in('user_id', ids)
        const protegidas = new Set((adm ?? []).map((a: any) => a.user_id))
        const objetivo = ids.filter((id) => !protegidas.has(id))
        const fallos: { id: string; error: string }[] = []
        let hechas = 0
        if (b.op === 'delete') {
          for (const id of objetivo) {
            try { await eliminarUsuario(db, id); hechas++ } catch (e) { fallos.push({ id, error: String((e as Error)?.message ?? e) }) }
          }
        } else if (objetivo.length) {
          const { error, count } = await db.from('profiles')
            .update({ account_status: b.op === 'block' ? 'deactivated' : 'active' }, { count: 'exact' }).in('id', objetivo)
          if (error) return json({ error: error.message }, 400)
          hechas = count ?? objetivo.length
        }
        return json({ ok: true, done: hechas, skipped: protegidas.size, failed: fallos })
      }

      case 'users.auth': {
        // Qué cuentas confirmaron su correo y cuándo entraron por última vez (eso vive en auth, no en profiles).
        const out: Record<string, { c: boolean; l: string | null }> = {}
        for (let pagina = 1; pagina <= 20; pagina++) {
          const { data: lote, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 })
          if (error) return json({ error: error.message }, 400)
          for (const u of lote.users) out[u.id] = { c: !!u.email_confirmed_at, l: u.last_sign_in_at ?? null }
          if (lote.users.length < 1000) break
        }
        return json({ users: out })
      }

      case 'user.detail': {
        const { data: p } = await db.from('profiles').select('id,role,full_name,email,teacher_id').eq('id', b.id).maybeSingle()
        if (!p) return json({ error: 'Usuario no encontrado' }, 404)
        if (p.role === 'student') return json({ students: await actividadAlumnos(db, [p.id]) })

        const { data: alumnos } = await db.from('profiles').select('id').eq('teacher_id', p.id).eq('role', 'student')
        const ids = (alumnos ?? []).map((a: any) => a.id)
        const cuenta = async (tabla: string, col: string) =>
          (await db.from(tabla).select('id', { count: 'exact', head: true }).eq(col, p.id)).count ?? 0
        const [rutinas, dietas, ejercicios, alimentos, propuestas] = await Promise.all([
          cuenta('routines', 'owner_id'), cuenta('diets', 'owner_id'), cuenta('exercises', 'trainer_id'), cuenta('foods', 'trainer_id'),
          db.from('invites').select('id', { count: 'exact', head: true }).eq('teacher_id', p.id).in('status', ['pending', 'countered']).then((r: any) => r.count ?? 0),
        ])
        return json({
          students: await actividadAlumnos(db, ids, p.id),
          library: { routines: rutinas, diets: dietas, exercises: ejercicios, foods: alimentos, pending_invites: propuestas },
        })
      }

      case 'row.list': {
        const cfg = TABLAS[b.table]
        if (!cfg) return json({ error: 'Tabla no permitida' }, 400)
        let q = db.from(b.table).select('*').order('created_at', { ascending: false }).limit(1000)
        if (cfg.dueño) q = q.is(cfg.dueño, null)
        const { data, error } = await q
        if (error) return json({ error: error.message }, 400)
        return json({ rows: data })
      }

      case 'row.save':
      case 'row.delete': {
        const cfg = TABLAS[b.table]
        if (!cfg) return json({ error: 'Tabla no permitida' }, 400)
        const id = b.action === 'row.delete' ? b.id : b.row?.id
        if (id && cfg.dueño) {
          const { data: actual } = await db.from(b.table).select(cfg.dueño).eq('id', id).maybeSingle()
          if (actual && (actual as any)[cfg.dueño]) return json({ error: 'Esa fila es de un profesor, no del catálogo global' }, 400)
        }
        if (b.action === 'row.delete') {
          const { error } = await db.from(b.table).delete().eq('id', id)
          if (error) return json({ error: error.message }, 400)
          return json({ ok: true })
        }
        const row = { ...b.row }
        if (cfg.dueño) row[cfg.dueño] = null
        if (!row.id) delete row.id
        const { data, error } = await db.from(b.table).upsert(row).select().single()
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true, row: data })
      }

      case 'stripe.summary': {
        const s = stripe()
        const desde = Math.floor(Date.now() / 1000) - 365 * 86400
        // La cuenta de Stripe es compartida con otros productos: solo cuenta lo que usa precios de Rutyn.
        const subs: any[] = []
        for await (const sub of s.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] })) {
          if (sub.items?.data?.some((it: any) => String(it.price?.lookup_key ?? '').startsWith('rutyn_'))) subs.push(sub)
        }
        const idsRutyn = new Set(subs.map((x) => x.id))
        const invoices: any[] = []
        for await (const inv of s.invoices.list({ created: { gte: desde }, limit: 100 })) {
          const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id
          if (subId && idsRutyn.has(subId)) invoices.push(inv)
        }
        return json({
          invoices: invoices.map((i) => ({
            id: i.id, number: i.number, status: i.status, currency: i.currency,
            amount_paid: i.amount_paid, amount_due: i.amount_due, created: i.created,
            email: i.customer_email, url: i.hosted_invoice_url, attempts: i.attempt_count,
          })),
          subscriptions: subs.map((x) => ({
            id: x.id, status: x.status, email: x.customer?.email ?? null,
            cancel_at_period_end: x.cancel_at_period_end, current_period_end: x.current_period_end ?? x.items?.data?.[0]?.current_period_end,
            quantity: x.items?.data?.[0]?.quantity ?? 1, amount: x.items?.data?.[0]?.price?.unit_amount ?? null,
            currency: x.currency, profile_id: x.metadata?.user_id ?? null,
          })),
        })
      }

      case 'stripe.cancel':
      case 'stripe.resume': {
        const s = stripe()
        const sub = await s.subscriptions.retrieve(b.id)
        if (!sub.items?.data?.some((it: any) => String(it.price?.lookup_key ?? '').startsWith('rutyn_'))) {
          return json({ error: 'Esa suscripción no es de Rutyn' }, 400)
        }
        if (b.action === 'stripe.resume') await s.subscriptions.update(b.id, { cancel_at_period_end: false })
        else if (b.now) await s.subscriptions.cancel(b.id)
        else await s.subscriptions.update(b.id, { cancel_at_period_end: true })
        return json({ ok: true })
      }
    }
    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})

// Antes de borrar se cancela la suscripción: si no, Stripe seguiría cobrando una cuenta que ya no existe.
async function eliminarUsuario(db: any, id: string) {
  const { data: p } = await db.from('profiles').select('stripe_subscription_id').eq('id', id).maybeSingle()
  if (p?.stripe_subscription_id) {
    await stripe().subscriptions.cancel(p.stripe_subscription_id).catch((e: any) => {
      if (e?.code !== 'resource_missing') throw new Error('No se pudo cancelar la suscripción de Stripe: ' + (e?.message ?? e))
    })
  }
  // Los alumnos de un profesor borrado quedan libres para elegir otro (no "activos" sin profesor).
  await db.from('profiles').update({ link_status: 'none' }).eq('teacher_id', id).eq('role', 'student')
  await borrarCuenta(db, id)
}

/** Qué tiene y qué hace cada alumno: rutinas, dietas, entrenamientos, evaluaciones, cobros y chat. */
async function actividadAlumnos(db: any, ids: string[], profesorId?: string) {
  if (!ids.length) return []
  const de = (tabla: string, cols: string) => db.from(tabla).select(cols).in('student_id', ids).limit(5000).then((r: any) => r.data ?? [])
  const [perfiles, rutinas, dietas, sesiones, evals, grasa, perim, anam, cobros, charlas, citas] = await Promise.all([
    db.from('profiles').select('id,full_name,email,phone,link_status,account_status,created_at,teacher_id').in('id', ids).then((r: any) => r.data ?? []),
    de('student_routines', 'student_id,name,completed_workouts,updated_at'),
    de('student_diets', 'student_id,name,updated_at'),
    de('workout_sessions', 'student_id,started_at'),
    de('assessments', 'student_id,taken_at'),
    de('assessment_bodyfat', 'student_id,tested_on'),
    de('assessment_perimetry', 'student_id,measured_on'),
    de('anamnesis_answers', 'student_id,status'),
    de('charges', 'student_id,amount,due_date,status,format'),
    de('conversations', 'student_id,last_message_at'),
    de('appointments', 'student_id,starts_at'),
  ])
  const por = (filas: any[]) => {
    const m = new Map<string, any[]>()
    for (const f of filas) { if (!m.has(f.student_id)) m.set(f.student_id, []); m.get(f.student_id)!.push(f) }
    return (id: string) => m.get(id) ?? []
  }
  const R = por(rutinas), D = por(dietas), S = por(sesiones), E = por(evals), G = por(grasa), P = por(perim), A = por(anam), C = por(cobros), H = por(charlas), T = por(citas)
  const max = (xs: (string | null)[]) => xs.filter(Boolean).sort().pop() ?? null
  const ahora = new Date().toISOString()
  return perfiles.map((p: any) => {
    const cobrosAlumno = C(p.id).sort((a: any, b: any) => (a.due_date < b.due_date ? 1 : -1))
    return {
      id: p.id, full_name: p.full_name, email: p.email, phone: p.phone,
      link_status: p.link_status, account_status: p.account_status, created_at: p.created_at,
      routines: R(p.id).map((r: any) => r.name),
      diets: D(p.id).map((d: any) => d.name),
      workouts: S(p.id).length,
      last_workout: max(S(p.id).map((x: any) => x.started_at)),
      assessments: E(p.id).length + G(p.id).length + P(p.id).length,
      last_assessment: max([...E(p.id).map((x: any) => x.taken_at), ...G(p.id).map((x: any) => x.tested_on), ...P(p.id).map((x: any) => x.measured_on)]),
      anamnesis: A(p.id).length,
      charge: cobrosAlumno[0] ? { amount: Number(cobrosAlumno[0].amount), due_date: cobrosAlumno[0].due_date, status: cobrosAlumno[0].status, format: cobrosAlumno[0].format } : null,
      charges_overdue: cobrosAlumno.filter((c: any) => c.status === 'suspended').length,
      last_message: max(H(p.id).map((x: any) => x.last_message_at)),
      next_appointments: T(p.id).filter((x: any) => x.starts_at > ahora).length,
    }
  }).sort((a: any, b: any) => String(a.full_name ?? '').localeCompare(String(b.full_name ?? '')))
}
