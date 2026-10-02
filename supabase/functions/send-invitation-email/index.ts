import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ ok: false, error: 'Missing env vars' }, 200)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Parse body
    const body = await req.json()
    const { invite_id, student_email, student_name, teacher_name, language = 'pt' } = body

    if (!invite_id || !student_email) {
      return json({ ok: false, error: 'Missing invite_id or student_email' }, 200)
    }

    // Generar link de invitación
    const inviteLink = `https://app.rutyn.com.br/convites`

    // Templates por idioma
    const templates: Record<string, { subject: string; html: string }> = {
      pt: {
        subject: `${teacher_name} te convidou para treinar no Rutyn`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7ec048; margin: 0; font-size: 28px;">Rutyn</h1>
              </div>
              
              <h2 style="color: #333; font-size: 24px;">Olá, ${student_name}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>${teacher_name}</strong> te convidou para treinar no <strong>Rutyn</strong>.
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Você pode ver os detalhes da proposta e aceitar ou recusar na sua conta.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background: #7ec048; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Ver proposta
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px;">
                Se você não esperava este e-mail, pode ignorá-lo.
              </p>
            </div>
          </div>
        `,
      },
      es: {
        subject: `${teacher_name} te invitó a entrenar en Rutyn`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7ec048; margin: 0; font-size: 28px;">Rutyn</h1>
              </div>
              
              <h2 style="color: #333; font-size: 24px;">¡Hola ${student_name}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>${teacher_name}</strong> te ha invitado a entrenar en <strong>Rutyn</strong>.
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Puedes ver los detalles de la propuesta y aceptar o rechazar en tu cuenta.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background: #7ec048; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Ver propuesta
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px;">
                Si no esperabas este email, puedes ignorarlo.
              </p>
            </div>
          </div>
        `,
      },
      en: {
        subject: `${teacher_name} invited you to train at Rutyn`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7ec048; margin: 0; font-size: 28px;">Rutyn</h1>
              </div>
              
              <h2 style="color: #333; font-size: 24px;">Hi ${student_name}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>${teacher_name}</strong> has invited you to train at <strong>Rutyn</strong>.
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You can see the proposal details and accept or reject it on your account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background: #7ec048; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  View proposal
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px;">
                If you didn't expect this email, you can ignore it.
              </p>
            </div>
          </div>
        `,
      },
    }

    const template = templates[language] || templates.pt
    const to = student_email
    const subject = template.subject
    const html = template.html

    // Llamar al relay SMTP en el VPS
    const relayResponse = await fetch('http://179.197.67.10:3001/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })

    if (!relayResponse.ok) {
      return json({ ok: false, error: `Relay error: ${relayResponse.statusText}` }, 200)
    }

    return json({ ok: true, message: 'Invitation email sent' }, 200)
  } catch (e) {
    return json({ ok: false, error: `Exception: ${String(e)}` }, 200)
  }
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}
