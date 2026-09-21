// Edge Function: cria Stripe Checkout Session para uma assinatura mensal.
//
// POST /functions/v1/stripe-create-checkout
// Body: { plan: 'pro' | 'master' | 'elite' }
// Auth: JWT do professor
//
// Segredos:
//   STRIPE_SECRET_KEY     — sk_live_... ou sk_test_...
//   STRIPE_PRICE_PRO      — price_...  (mensal)
//   STRIPE_PRICE_MASTER   — price_...
//   STRIPE_PRICE_ELITE    — price_...
//
// Responder: { url: '<stripe checkout url>' }

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-ignore
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
    // @ts-ignore
    const PRICE = {
      pro: Deno.env.get('STRIPE_PRICE_PRO'),
      master: Deno.env.get('STRIPE_PRICE_MASTER'),
      elite: Deno.env.get('STRIPE_PRICE_ELITE'),
    } as Record<string, string | undefined>

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Missing bearer token' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE)
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Invalid session' }, 401)

    const { data: profile } = await admin.from('profiles').select('id,role,email').eq('id', user.id).single()
    if (!profile || profile.role !== 'teacher') return json({ error: 'Only teachers' }, 403)

    const body = await req.json().catch(() => ({}))
    const plan = (body as any).plan as string
    const priceId = PRICE[plan]
    if (!priceId) return json({ error: 'Invalid plan or price not configured' }, 400)

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' as any })

    const origin = req.headers.get('origin') ?? SUPABASE_URL
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: profile.id,
      customer_email: profile.email ?? user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/professor/assinatura?ok=1`,
      cancel_url: `${origin}/professor/assinatura?cancel=1`,
      metadata: { user_id: profile.id, plan },
      subscription_data: { metadata: { user_id: profile.id, plan } },
    })

    return json({ url: session.url })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...cors() } })
}
