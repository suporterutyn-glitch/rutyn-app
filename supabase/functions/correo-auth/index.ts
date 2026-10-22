// Send Email Hook de Supabase Auth: los correos de acceso (código de registro, cambio de contraseña, etc.)
// salen por el relay del VPS, igual que el resto de los correos de Rutyn, en el idioma del usuario.
// Así Supabase no depende de su propia configuración SMTP (que fallaba por la contraseña de Gmail).
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { enviarCorreo, plantilla } from '../_shared/correo.ts'

type Idioma = 'pt' | 'es' | 'en'
const idiomaDe = (l?: string): Idioma => (l === 'es' || l === 'en' ? l : 'pt')

const CODIGO: Record<Idioma, { asunto: string; titulo: string; texto: string; vence: string }> = {
  es: { asunto: 'Rutyn · tu código de verificación', titulo: 'Confirmá tu correo', texto: 'Escribí este código en Rutyn para terminar tu registro:', vence: 'El código vence en 1 hora. Si no creaste una cuenta en Rutyn, ignorá este correo.' },
  pt: { asunto: 'Rutyn · seu código de verificação', titulo: 'Confirme seu e-mail', texto: 'Digite este código no Rutyn para concluir seu cadastro:', vence: 'O código expira em 1 hora. Se você não criou uma conta no Rutyn, ignore este e-mail.' },
  en: { asunto: 'Rutyn · your verification code', titulo: 'Confirm your email', texto: 'Enter this code in Rutyn to finish signing up:', vence: "The code expires in 1 hour. If you didn't create a Rutyn account, ignore this email." },
}
const CLAVE: Record<Idioma, { asunto: string; titulo: string; texto: string; boton: string; pie: string }> = {
  es: { asunto: 'Rutyn · cambiá tu contraseña', titulo: 'Cambiá tu contraseña', texto: 'Recibimos un pedido para cambiar la contraseña de tu cuenta de Rutyn. Tocá el botón para elegir una nueva.', boton: 'Cambiar contraseña', pie: 'Si no lo pediste, ignorá este correo: tu contraseña no cambia.' },
  pt: { asunto: 'Rutyn · redefina sua senha', titulo: 'Redefina sua senha', texto: 'Recebemos um pedido para trocar a senha da sua conta Rutyn. Toque no botão para escolher uma nova.', boton: 'Redefinir senha', pie: 'Se você não pediu, ignore este e-mail: sua senha não muda.' },
  en: { asunto: 'Rutyn · reset your password', titulo: 'Reset your password', texto: 'We received a request to reset your Rutyn password. Tap the button to choose a new one.', boton: 'Reset password', pie: "If you didn't ask for this, ignore this email: your password stays the same." },
}
const CORREO_NUEVO: Record<Idioma, { asunto: string; titulo: string; texto: string; boton: string }> = {
  es: { asunto: 'Rutyn · confirmá tu nuevo correo', titulo: 'Confirmá tu nuevo correo', texto: 'Tocá el botón para confirmar este correo en tu cuenta de Rutyn.', boton: 'Confirmar correo' },
  pt: { asunto: 'Rutyn · confirme seu novo e-mail', titulo: 'Confirme seu novo e-mail', texto: 'Toque no botão para confirmar este e-mail na sua conta Rutyn.', boton: 'Confirmar e-mail' },
  en: { asunto: 'Rutyn · confirm your new email', titulo: 'Confirm your new email', texto: 'Tap the button to confirm this email on your Rutyn account.', boton: 'Confirm email' },
}

function correoCodigo(l: Idioma, codigo: string) {
  const c = CODIGO[l]
  return `<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
<div style="background:#fff;border-radius:12px;padding:30px;max-width:520px;margin:0 auto;text-align:center">
<h1 style="color:#7ec048;margin:0 0 20px;font-size:28px">Rutyn</h1>
<h2 style="color:#333;font-size:20px;margin:0 0 10px">${c.titulo}</h2>
<p style="color:#555;font-size:15px;line-height:1.5">${c.texto}</p>
<p style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#222;margin:22px 0">${codigo}</p>
<p style="color:#999;font-size:13px">${c.vence}</p>
</div></div>`
}

Deno.serve(async (req) => {
  const cuerpo = await req.text()
  let datos: {
    user: { email: string; new_email?: string; user_metadata?: { language?: string } }
    email_data: { token: string; token_hash: string; redirect_to: string; email_action_type: string; site_url: string; token_new?: string; token_hash_new?: string }
  }
  try {
    const secreto = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '')
    datos = new Webhook(secreto).verify(cuerpo, Object.fromEntries(req.headers)) as typeof datos
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: 'firma inválida' } }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const { user, email_data: e } = datos
  const l = idiomaDe(user.user_metadata?.language)
  const base = Deno.env.get('SUPABASE_URL')
  const enlace = (hash: string, tipo: string) =>
    `${base}/auth/v1/verify?token=${hash}&type=${tipo}&redirect_to=${encodeURIComponent(e.redirect_to || e.site_url)}`

  try {
    switch (e.email_action_type) {
      case 'signup':
      case 'reauthentication':
      case 'magiclink':
        await enviarCorreo(user.email, CODIGO[l].asunto, correoCodigo(l, e.token))
        break
      case 'recovery': {
        const c = CLAVE[l]
        await enviarCorreo(user.email, c.asunto, plantilla(c.titulo, [c.texto], c.boton, enlace(e.token_hash, 'recovery'), c.pie))
        break
      }
      case 'email_change': {
        const c = CORREO_NUEVO[l]
        // Con doble confirmación Supabase manda un enlace al correo actual y otro al nuevo.
        if (user.new_email && e.token_hash_new) await enviarCorreo(user.new_email, c.asunto, plantilla(c.titulo, [c.texto], c.boton, enlace(e.token_hash_new, 'email_change')))
        if (e.token_hash) await enviarCorreo(user.email, c.asunto, plantilla(c.titulo, [c.texto], c.boton, enlace(e.token_hash, 'email_change')))
        break
      }
      default:
        // Avisos (contraseña cambiada, etc.): no se mandan.
        break
    }
  } catch (err) {
    console.error('correo-auth', e.email_action_type, String(err))
    return new Response(JSON.stringify({ error: { http_code: 500, message: 'No se pudo enviar el correo' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
})
