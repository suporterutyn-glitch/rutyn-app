// Edge Function: webhook de Stripe. Mantiene profiles.plan en sincronía.
//
// No usa firma: con el id recibido vuelve a pedir el evento a la API de
// Stripe, así solo cuenta lo que Stripe realmente registró.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// El endpoint en Stripe lo crea la acción 'setup' de esta misma función.

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, planDePrecio, json } from '../_shared/stripe.ts'

const EVENTOS = [
  'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted', 'invoice.payment_succeeded', 'invoice.payment_failed',
  'charge.dispute.created',
]

// Avisos con clave + datos (se traducen en la app); title/body en PT de respaldo.
const AVISOS: Record<string, { title: string; body: string }> = {
  planActive: { title: 'Plano ativado', body: 'Seu plano {{plan}} está ativo.' },
  paymentFailed: { title: 'Falha no pagamento', body: 'Não conseguimos cobrar seu plano. Atualize o cartão para não perder alunos.' },
  planEnded: { title: 'Seu plano terminou', body: 'Voltou ao plano Grátis. {{n}} aluno(s) ficaram suspensos.' },
  cardCountry: { title: 'Pagamento devolvido', body: 'O preço em reais é só para cartões do Brasil. Devolvemos o valor: assine de novo com o país certo no seu perfil.' },
}
function aviso(key: string, params: Record<string, unknown>) {
  const r = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''))
  return { type: 'info', title: r(AVISOS[key].title), body: r(AVISOS[key].body), data: { key, params } }
}

// Las suscripciones anteriores a este control no se revisan.
const DESDE_CONTROL_PAIS = 1790690000 // 2026-09-29

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // @ts-ignore
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE)
  let s: any
  try { s = stripe() } catch { return json({ error: 'stripe_not_configured' }, 503) }
  const body = await req.json().catch(() => ({})) as any

  // Configuración inicial (solo con la service key): endpoint del webhook y portal.
  if (body.action === 'setup') {
    // Solo con una service key real: se prueba contra la API de admin.
    const clave = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    // @ts-ignore
    const prueba = await createClient(Deno.env.get('SUPABASE_URL')!, clave).auth.admin.listUsers({ perPage: 1 })
    if (!clave || prueba.error) return json({ error: 'forbidden' }, 403)
    // @ts-ignore
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`
    const { data: eps } = await s.webhookEndpoints.list({ limit: 100 })
    const ep = eps.find((e: any) => e.url === url)
      ?? await s.webhookEndpoints.create({ url, enabled_events: EVENTOS, description: 'Rutyn' })
    const { data: cfgs } = await s.billingPortal.configurations.list({ limit: 1, is_default: true })
    if (!cfgs[0]) {
      await s.billingPortal.configurations.create({
        business_profile: { headline: 'Rutyn' },
        features: { payment_method_update: { enabled: true }, invoice_history: { enabled: true } },
      })
    }
    return json({ ok: true, webhook: ep.id })
  }

  if (!body.id) return new Response('no id', { status: 400 })
  let event: any
  try { event = await s.events.retrieve(body.id) } catch { return new Response('unknown event', { status: 400 }) }

  try {
    if (event.type === 'checkout.session.completed') {
      const cs = event.data.object
      if (cs.subscription) await sincronizar(admin, await s.subscriptions.retrieve(cs.subscription), cs.client_reference_id)
    } else if (event.type.startsWith('customer.subscription.')) {
      await sincronizar(admin, await s.subscriptions.retrieve(event.data.object.id).catch(() => event.data.object))
    } else if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object
      const { data: p } = await admin.from('profiles').select('id,plan,frozen_since').eq('stripe_customer_id', inv.customer).maybeSingle()
      if (p?.frozen_since && inv.amount_paid > 0) await descongelar(admin, p.id)
      if (p && p.plan !== 'free') {
        await admin.from('notifications').insert({ user_id: p.id, ...aviso('planActive', { plan: p.plan }), type: 'success' })
        // Enviar email de confirmación
        const url = new URL(Deno.env.get('SUPABASE_URL')! + '/functions/v1/send-email')
        await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` },
          body: JSON.stringify({ action: 'payment_confirmed', userId: p.id, plan: p.plan, amount: inv.total, currency: inv.currency })
        }).catch(e => console.error('send-email failed', e))
      }
    } else if (event.type === 'invoice.payment_failed') {
      const inv = event.data.object
      const { data: p } = await admin.from('profiles').select('id,frozen_since').eq('stripe_customer_id', inv.customer).maybeSingle()
      if (p && !p.frozen_since) await admin.from('profiles').update({ frozen_since: new Date().toISOString() }).eq('id', p.id)
      if (p) {
        await admin.from('notifications').insert({ user_id: p.id, ...aviso('paymentFailed', {}), type: 'warning' })
        // Enviar email de alerta
        const url = new URL(Deno.env.get('SUPABASE_URL')! + '/functions/v1/send-email')
        await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` },
          body: JSON.stringify({ action: 'payment_failed', userId: p.id })
        }).catch(e => console.error('send-email failed', e))
      }
    } else if (event.type === 'charge.dispute.created') {
      const charge = event.data.object
      console.warn('dispute', charge.id, charge.amount, charge.currency)
      const { data: p } = await admin.from('profiles').select('id,plan').eq('stripe_customer_id', charge.customer).maybeSingle()
      if (p && p.plan !== 'free') {
        await admin.from('notifications').insert({ user_id: p.id, type: 'warning', title: 'Disputa en tu tarjeta', body: 'Stripe reportó una disputa. Revisa tu bandeja de correo.', data: {} })
      }
    }
  } catch (e) {
    console.error('webhook error', event.type, event.id, e)
    return new Response('error', { status: 500 }) // Stripe reintenta
  }
  return new Response('ok')
})

async function sincronizar(admin: any, sub: any, refId?: string | null) {
  const userId = sub.metadata?.user_id ?? refId
  const q = admin.from('profiles').select('id,plan,stripe_subscription_id,plan_pending_plan,plan_pending_seats,frozen_since')
  const { data: prof } = userId ? await q.eq('id', userId).maybeSingle() : await q.eq('stripe_customer_id', sub.customer).maybeSingle()
  if (!prof) return
  // Un evento viejo de otra suscripción no pisa la actual.
  if (prof.stripe_subscription_id && prof.stripe_subscription_id !== sub.id && sub.status !== 'active') return

  const item = sub.items?.data?.[0]
  const plan = planDePrecio(item?.price)
  const viva = ['active', 'trialing', 'past_due'].includes(sub.status)

  // El precio en reales es solo para Brasil: el país de la tarjeta lo informa Stripe,
  // no el perfil (que declara el propio profesor). Si no coincide, se cancela y se devuelve.
  if (viva && sub.currency === 'brl' && sub.created >= DESDE_CONTROL_PAIS) {
    const pais = await paisDeTarjeta(sub)
    if (pais && pais !== 'BR') {
      await rechazarPorPais(sub)
      await admin.from('notifications').insert({ user_id: prof.id, ...aviso('cardCountry', {}), type: 'warning' })
      console.warn('brl con tarjeta de', pais, 'sub', sub.id, 'perfil', prof.id)
      return
    }
  }

  if (viva && plan) {
    // Stripe manda varios eventos a la vez: solo el que efectivamente cambia el plan avisa.
    const { data: cambio } = await admin.from('profiles').update({ plan }).eq('id', prof.id).neq('plan', plan).select('id')
    await admin.from('profiles').update({
      plan, plan_seats: plan === 'basic' ? item.quantity : null, plan_status: sub.status,
      plan_expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      plan_cancel_at_period_end: !!sub.cancel_at_period_end,
      stripe_customer_id: sub.customer, stripe_subscription_id: sub.id,
    }).eq('id', prof.id)
    if (prof.frozen_since && sub.status === 'active') await descongelar(admin, prof.id)
    // La bajada agendada ya entró en vigor.
    if (prof.plan_pending_plan && prof.plan_pending_plan === plan && (plan !== 'basic' || prof.plan_pending_seats === item.quantity)) {
      await admin.from('profiles').update({ plan_pending_plan: null, plan_pending_seats: null, plan_pending_at: null }).eq('id', prof.id)
    }
    if (cambio?.length) {
      await admin.from('notifications').insert({ user_id: prof.id, ...aviso('planActive', { plan }) })
      await admin.from('subscriptions').insert({ teacher_id: prof.id, plan, provider: 'stripe', status: sub.status,
        expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null })
    }
  } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
    await admin.from('profiles').update({
      plan: 'free', plan_seats: null, plan_status: sub.status, plan_expires_at: null,
      plan_cancel_at_period_end: false, stripe_customer_id: sub.customer, stripe_subscription_id: null,
    }).eq('id', prof.id)
    // Si terminó por falta de pago la cuenta sigue congelada (frozen_since) hasta que pague o pasen 60 días.
    const { data: n } = await admin.rpc('ajustar_alumnos_al_plan', { p_teacher: prof.id })
    if (prof.plan !== 'free') await admin.from('notifications').insert({ user_id: prof.id, ...aviso('planEnded', { n: n ?? 0 }), type: 'warning' })
  }
}

async function paisDeTarjeta(sub: any): Promise<string | null> {
  const s = stripe()
  let pm = sub.default_payment_method
  if (!pm && sub.latest_invoice) {
    const inv = await s.invoices.retrieve(typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id, { expand: ['payment_intent'] })
    pm = inv.payment_intent?.payment_method
  }
  if (!pm) return null
  const metodo = typeof pm === 'string' ? await s.paymentMethods.retrieve(pm) : pm
  return metodo?.card?.country ?? null
}

async function rechazarPorPais(sub: any) {
  const s = stripe()
  if (sub.latest_invoice) {
    const inv = await s.invoices.retrieve(typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id)
    if (inv.payment_intent && inv.amount_paid > 0) {
      await s.refunds.create({ payment_intent: typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent.id, reason: 'requested_by_customer' }).catch((e: any) => console.error('refund', e?.message))
    }
  }
  if (sub.status !== 'canceled') await s.subscriptions.cancel(sub.id).catch((e: any) => console.error('cancel', e?.message))
}

async function descongelar(admin: any, profId: string) {
  await admin.from('profiles').update({ frozen_since: null }).eq('id', profId)
}
