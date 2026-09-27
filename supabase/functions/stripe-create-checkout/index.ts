// Edge Function: todo lo del plan del profesor con Stripe.
//
// POST { action: 'checkout', plan: 'basic' | 'pro', seats?: number }
//   Sin suscripción: devuelve { url } del Checkout de Stripe.
//   Con suscripción: cambia plan/cantidad ya mismo, cobrando la diferencia
//   proporcional; devuelve { updated: true }.
// POST { action: 'cancel' }   -> se cancela al final del período pagado.
// POST { action: 'resume' }   -> deshace la cancelación.
// POST { action: 'portal' }   -> { url } del portal de Stripe (tarjeta y facturas).
//
// Secreto: STRIPE_SECRET_KEY. Los precios se crean solos (ver _shared/stripe.ts).

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, precioDe, monedaDePais, cors, json, MIN_BASIC, MAX_BASIC, type PlanPago, type Moneda } from '../_shared/stripe.ts'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // @ts-ignore
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Invalid session' }, 401)

    const { data: prof } = await admin.from('profiles')
      .select('id,role,email,full_name,country,plan,plan_seats,stripe_customer_id,stripe_subscription_id')
      .eq('id', user.id).single()
    if (!prof || prof.role !== 'teacher') return json({ error: 'Only teachers' }, 403)

    const body = await req.json().catch(() => ({})) as any
    const action = body.action ?? 'checkout'
    const s = stripe()
    const origin = req.headers.get('origin') ?? 'https://app.rutyn.com.br'

    const sub = prof.stripe_subscription_id
      ? await s.subscriptions.retrieve(prof.stripe_subscription_id).catch(() => null)
      : null
    const subViva = sub && ['active', 'trialing', 'past_due'].includes(sub.status) ? sub : null

    if (action === 'portal') {
      if (!prof.stripe_customer_id) return json({ error: 'no_customer' }, 400)
      const p = await s.billingPortal.sessions.create({ customer: prof.stripe_customer_id, return_url: `${origin}/professor/assinatura` })
      return json({ url: p.url })
    }
    if (action === 'cancel' || action === 'resume') {
      if (!subViva) return json({ error: 'no_subscription' }, 400)
      await s.subscriptions.update(subViva.id, { cancel_at_period_end: action === 'cancel' })
      await admin.from('profiles').update({ plan_cancel_at_period_end: action === 'cancel' }).eq('id', prof.id)
      return json({ updated: true })
    }
    if (action !== 'checkout') return json({ error: 'bad_action' }, 400)

    const plan = body.plan as PlanPago
    if (plan !== 'basic' && plan !== 'pro') return json({ error: 'bad_plan' }, 400)
    const { data: activos } = await admin.rpc('alumnos_activos', { p_teacher: prof.id })
    let seats = 1
    if (plan === 'basic') {
      seats = Math.round(Number(body.seats) || MIN_BASIC)
      if (seats < MIN_BASIC || seats > MAX_BASIC) return json({ error: 'bad_seats' }, 400)
      if (seats < (activos ?? 0)) return json({ error: 'seats_below_active', active: activos }, 400)
    }
    // Una suscripción no cambia de moneda: si ya existe, se sigue en la suya.
    const moneda: Moneda = subViva ? (subViva.currency as Moneda) : monedaDePais(prof.country)
    const price = await precioDe(s, plan, moneda)
    const meta = { user_id: prof.id, plan }

    if (subViva) {
      const item = subViva.items.data[0]
      await s.subscriptions.update(subViva.id, {
        items: [{ id: item.id, price, quantity: seats }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
        cancel_at_period_end: false,
        metadata: meta,
      })
      return json({ updated: true })
    }

    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: prof.id,
      ...(prof.stripe_customer_id ? { customer: prof.stripe_customer_id } : { customer_email: prof.email ?? user.email ?? undefined }),
      line_items: [{ price, quantity: seats }],
      allow_promotion_codes: true,
      success_url: `${origin}/professor/assinatura?ok=1`,
      cancel_url: `${origin}/professor/assinatura`,
      metadata: meta,
      subscription_data: { metadata: meta },
    })
    return json({ url: session.url })
  } catch (e) {
    const msg = String((e as any)?.message ?? e)
    return json({ error: msg }, msg === 'stripe_not_configured' ? 503 : 500)
  }
})
