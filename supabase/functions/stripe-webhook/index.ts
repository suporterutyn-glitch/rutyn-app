// Edge Function: recebe webhooks do Stripe e atualiza profiles.plan / plan_expires_at
//
// URL para configurar em https://dashboard.stripe.com/webhooks:
//   https://<ref>.functions.supabase.co/stripe-webhook
//
// Eventos ouvidos:
//   - checkout.session.completed
//   - customer.subscription.created / updated / deleted
//   - invoice.payment_succeeded / invoice.payment_failed
//
// Segredos:
//   STRIPE_SECRET_KEY      — sk_live_... ou sk_test_...
//   STRIPE_WEBHOOK_SECRET  — whsec_... (do endpoint no dashboard)
//
// Deploy com --no-verify-jwt (Stripe autentica pelo signature header):
//   supabase functions deploy stripe-webhook --no-verify-jwt

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
  // @ts-ignore
  const WHSEC = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  // @ts-ignore
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' as any })
  const admin = createClient(SUPABASE_URL, SERVICE)

  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()
  let event: any
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, WHSEC)
  } catch (e) {
    return new Response(`bad sig: ${e}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as any
        const userId = s.client_reference_id ?? s.metadata?.user_id
        const plan = s.metadata?.plan as 'pro' | 'master' | 'elite' | undefined
        if (userId && plan) {
          await admin.from('profiles').update({
            plan,
            plan_expires_at: expiresIn30Days(),
          }).eq('id', userId)
          await admin.from('subscriptions').insert({
            teacher_id: userId, plan, provider: 'stripe', status: 'active',
            expires_at: expiresIn30Days(),
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const userId = sub.metadata?.user_id
        if (userId) {
          if (event.type === 'customer.subscription.deleted' || sub.status === 'canceled') {
            await admin.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', userId)
          } else if (sub.current_period_end) {
            await admin.from('profiles').update({
              plan_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
            }).eq('id', userId)
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as any
        const userId = inv.subscription_details?.metadata?.user_id
        if (userId) {
          await admin.from('notifications').insert({
            user_id: userId, type: 'warning',
            title: 'Falha no pagamento da assinatura',
            body: 'Atualize sua forma de pagamento para manter o plano ativo.',
          })
        }
        break
      }
      default:
        // ignora
        break
    }
  } catch (e) {
    console.error('handler error', e)
  }

  return new Response('ok')
})

function expiresIn30Days() {
  return new Date(Date.now() + 30 * 86400_000).toISOString()
}
