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
  'customer.subscription.deleted', 'invoice.payment_failed',
]

// Avisos con clave + datos (se traducen en la app); title/body en PT de respaldo.
const AVISOS: Record<string, { title: string; body: string }> = {
  planActive: { title: 'Plano ativado', body: 'Seu plano {{plan}} está ativo.' },
  paymentFailed: { title: 'Falha no pagamento', body: 'Não conseguimos cobrar seu plano. Atualize o cartão para não perder alunos.' },
  planEnded: { title: 'Seu plano terminou', body: 'Voltou ao plano Grátis. {{n}} aluno(s) ficaram suspensos.' },
}
function aviso(key: string, params: Record<string, unknown>) {
  const r = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''))
  return { type: 'info', title: r(AVISOS[key].title), body: r(AVISOS[key].body), data: { key, params } }
}

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
    if ((req.headers.get('Authorization') ?? '') !== `Bearer ${SERVICE}`) return json({ error: 'forbidden' }, 403)
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
    } else if (event.type === 'invoice.payment_failed') {
      const inv = event.data.object
      const { data: p } = await admin.from('profiles').select('id').eq('stripe_customer_id', inv.customer).maybeSingle()
      if (p) await admin.from('notifications').insert({ user_id: p.id, ...aviso('paymentFailed', {}), type: 'warning' })
    }
  } catch (e) {
    console.error('webhook', event.type, e)
    return new Response('error', { status: 500 }) // Stripe reintenta
  }
  return new Response('ok')
})

async function sincronizar(admin: any, sub: any, refId?: string | null) {
  const userId = sub.metadata?.user_id ?? refId
  const q = admin.from('profiles').select('id,plan,stripe_subscription_id')
  const { data: prof } = userId ? await q.eq('id', userId).maybeSingle() : await q.eq('stripe_customer_id', sub.customer).maybeSingle()
  if (!prof) return
  // Un evento viejo de otra suscripción no pisa la actual.
  if (prof.stripe_subscription_id && prof.stripe_subscription_id !== sub.id && sub.status !== 'active') return

  const item = sub.items?.data?.[0]
  const plan = planDePrecio(item?.price)
  const viva = ['active', 'trialing', 'past_due'].includes(sub.status)

  if (viva && plan) {
    await admin.from('profiles').update({
      plan, plan_seats: plan === 'basic' ? item.quantity : null, plan_status: sub.status,
      plan_expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      plan_cancel_at_period_end: !!sub.cancel_at_period_end,
      stripe_customer_id: sub.customer, stripe_subscription_id: sub.id,
    }).eq('id', prof.id)
    if (prof.plan !== plan) {
      await admin.from('notifications').insert({ user_id: prof.id, ...aviso('planActive', { plan }) })
      await admin.from('subscriptions').insert({ teacher_id: prof.id, plan, provider: 'stripe', status: sub.status,
        expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null })
    }
  } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
    await admin.from('profiles').update({
      plan: 'free', plan_seats: null, plan_status: sub.status, plan_expires_at: null,
      plan_cancel_at_period_end: false, stripe_customer_id: sub.customer, stripe_subscription_id: null,
    }).eq('id', prof.id)
    const { data: n } = await admin.rpc('ajustar_alumnos_al_plan', { p_teacher: prof.id })
    if (prof.plan !== 'free') await admin.from('notifications').insert({ user_id: prof.id, ...aviso('planEnded', { n: n ?? 0 }), type: 'warning' })
  }
}
