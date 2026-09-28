// Edge Function: enviar emails vía Postfix en VPS (relay Gmail)
// Deploy: supabase functions deploy send-email --no-verify-jwt

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const VPS_SMTP = Deno.env.get('VPS_SMTP_HOST') || '179.197.67.10'
const VPS_PORT = 25
const FROM = 'suporte@rutyn.com.br'
const FROM_NAME = 'Rutyn'

async function enviarSMTP(opts: { to: string; subject: string; html: string }): Promise<void> {
  // Construir email SMTP manualmente
  const headers = [
    `From: ${FROM_NAME} <${FROM}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
  ].join('\r\n')

  const body = headers + '\r\n' + opts.html

  // Conectar a Postfix en el VPS
  const conn = await Deno.connect({ hostname: VPS_SMTP, port: VPS_PORT })
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const read = async () => {
    const buf = new Uint8Array(1024)
    const n = await conn.read(buf)
    if (n === null) throw new Error('connection closed')
    return decoder.decode(buf.slice(0, n))
  }

  const write = (s: string) => conn.writeSync(encoder.encode(s + '\r\n'))

  try {
    // SMTP handshake
    let res = await read()
    if (!res.startsWith('220')) throw new Error('SMTP: ' + res)

    write(`EHLO rutyn-app`)
    res = await read()

    write(`MAIL FROM:<${FROM}>`)
    res = await read()
    if (!res.startsWith('250')) throw new Error('MAIL FROM: ' + res)

    write(`RCPT TO:<${opts.to}>`)
    res = await read()
    if (!res.startsWith('250')) throw new Error('RCPT TO: ' + res)

    write(`DATA`)
    res = await read()
    if (!res.startsWith('354')) throw new Error('DATA: ' + res)

    write(body)
    write('.')
    res = await read()
    if (!res.startsWith('250')) throw new Error('send: ' + res)

    write(`QUIT`)
    await read()
  } finally {
    conn.close()
  }

  console.log('📧 enviado a', opts.to)
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

    await enviarSMTP({ to: prof.email, subject, html })
    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('send-email', action, e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
