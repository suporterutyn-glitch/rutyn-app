// Edge Function: enviar emails vía SMTP relay Python en VPS
// Deploy: supabase functions deploy send-email --no-verify-jwt

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const VPS_RELAY = Deno.env.get('VPS_RELAY_URL') || 'http://179.197.67.10:3001'
const FROM = 'suporte@rutyn.com.br'
const FROM_NAME = 'Rutyn'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE)

  const { action, userId, plan, amount, currency } = await req.json() as any

  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })

  const { data: prof } = await admin.from('profiles').select('email,full_name').eq('id', userId).maybeSingle()
  if (!prof) return new Response(JSON.stringify({ error: 'profile not found' }), { status: 404 })

  try {
    let subject = ''
    let html = ''

    if (action === 'payment_confirmed') {
      const moneda = currency === 'BRL' ? 'R$' : '$'
      const monto = (amount / 100).toFixed(2)
      subject = `Pago confirmado - Rutyn ${plan.toUpperCase()}`
      html = `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2 style="color: #445B21;">¡Hola ${prof.full_name}!</h2><p>Tu pago fue procesado correctamente.</p><div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><p><strong>Plan:</strong> ${plan.toUpperCase()}</p><p><strong>Monto:</strong> ${moneda} ${monto}</p></div><p><a href="https://app.rutyn.com.br" style="background: #7CB342; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Ir a Rutyn</a></p></div>`
    } else if (action === 'payment_failed') {
      subject = '⚠️ Falló el pago de tu plan Rutyn'
      html = `<div style="font-family: Arial, sans-serif; max-width: 600px;"><h2 style="color: #D32F2F;">Hola ${prof.full_name}</h2><p>No pudimos cobrar tu plan este mes.</p><div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;"><p><strong>Posibles razones:</strong></p><ul><li>Tu tarjeta expiró</li><li>Fondos insuficientes</li><li>Tu banco rechazó la transacción</li></ul></div><p><a href="https://app.rutyn.com.br/professor/assinatura" style="color: #7CB342; font-weight: bold;">Actualiza tu método de pago</a> para no perder acceso.</p></div>`
    }

    if (!subject || !html) return new Response(JSON.stringify({ error: 'invalid action' }), { status: 400 })

    // Llamar relay en VPS
    const res = await fetch(`${VPS_RELAY}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: prof.email, subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(err)
    }

    console.log('📧 enviado a', prof.email)
    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('send-email', action, e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
