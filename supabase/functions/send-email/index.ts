// Edge Function: enviar emails vía Gmail SMTP
// Deploy: supabase functions deploy send-email --no-verify-jwt

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore
import { SmtpClient } from 'https://deno.land/x/smtp@v0.16.0/mod.ts'

const SMTP_HOST = 'smtp.gmail.com'
const SMTP_PORT = 465
const SMTP_USER = 'suporte.rutyn@gmail.com'
const SMTP_PASS = Deno.env.get('GMAIL_PASSWORD')!
const FROM = 'suporte.rutyn@gmail.com'
const FROM_NAME = 'Rutyn'

interface EmailOpts {
  to: string
  toName: string
  subject: string
  html: string
}

async function enviar(opts: EmailOpts): Promise<void> {
  const client = new SmtpClient()
  try {
    await client.connectTLS({ hostname: SMTP_HOST, port: SMTP_PORT })
    await client.authenticate(SMTP_USER, SMTP_PASS)
    await client.send({
      from: `${FROM_NAME} <${FROM}>`,
      to: `${opts.toName} <${opts.to}>`,
      subject: opts.subject,
      content: opts.html,
      html: true,
    })
    await client.close()
    console.log('📧 enviado a', opts.to)
  } catch (e) {
    console.error('SMTP error:', e)
    throw e
  }
}

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
    if (action === 'payment_confirmed') {
      const moneda = currency === 'BRL' ? 'R$' : '$'
      const monto = (amount / 100).toFixed(2)
      await enviar({
        to: prof.email,
        toName: prof.full_name || 'Profesor',
        subject: `Pago confirmado - Rutyn ${plan.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #445B21;">¡Hola ${prof.full_name}!</h2>
            <p>Tu pago fue procesado correctamente.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Plan:</strong> ${plan.toUpperCase()}</p>
              <p><strong>Monto:</strong> ${moneda} ${monto}</p>
            </div>
            <p>Tu plan está activo y listo para usar.</p>
            <p><a href="https://app.rutyn.com.br" style="background: #7CB342; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Ir a Rutyn</a></p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">© 2025 Rutyn. Todos los derechos reservados.</p>
          </div>
        `,
      })
    } else if (action === 'payment_failed') {
      await enviar({
        to: prof.email,
        toName: prof.full_name || 'Profesor',
        subject: '⚠️ Falló el pago de tu plan Rutyn',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D32F2F;">Hola ${prof.full_name}</h2>
            <p>No pudimos cobrar tu plan este mes.</p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p><strong>Posibles razones:</strong></p>
              <ul>
                <li>Tu tarjeta expiró</li>
                <li>Fondos insuficientes</li>
                <li>Tu banco rechazó la transacción</li>
              </ul>
            </div>
            <p>Por favor, <a href="https://app.rutyn.com.br/professor/assinatura" style="color: #7CB342; font-weight: bold;">actualiza tu método de pago</a> para no perder acceso.</p>
            <p style="font-size: 12px; color: #666;">Si el problema persiste, contactanos a suporte.rutyn@gmail.com</p>
          </div>
        `,
      })
    }
    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('send-email', action, e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
