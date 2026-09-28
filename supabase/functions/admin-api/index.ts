// Edge Function del panel de administración. Solo responde a usuarios de la tabla admins.
//
// POST { action, ... }
//   'user.update'    { id, fields }   edita un perfil (incluye plan, vínculo y estado de cuenta)
//   'user.delete'    { id }           borra la cuenta (auth + perfil en cascada)
//   'row.save'       { table, row }   crea/edita una fila del catálogo o contenido global
//   'row.delete'     { table, id }
//   'stripe.summary'                  ingresos por mes, pagos fallidos y suscripciones de Stripe
//   'stripe.cancel'  { id, now? }     cancela una suscripción (al final del período o ya)
//   'stripe.resume'  { id }

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, cors, json } from '../_shared/stripe.ts'

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
        const { error } = await db.auth.admin.deleteUser(b.id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
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
