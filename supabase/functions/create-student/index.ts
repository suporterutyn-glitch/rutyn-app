// Edge Function: cria auth.user do aluno

// deno-lint-ignore-file
// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { enviarCorreo, plantilla, escapar } from '../_shared/correo.ts'

// @ts-ignore Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ ok: false, error: 'Missing env vars' }, 200)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Parse body
    const body = await req.json()
    const { email, full_name, language } = body
    let teacher_id = body.teacher_id as string | undefined

    if (!email) return json({ ok: false, error: 'No email' }, 200)

    // El profesor es quien llama, no lo que venga en el body.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user: caller } } = await admin.auth.getUser(jwt)
    if (!caller) return json({ ok: false, error: 'Invalid session' }, 401)
    if (teacher_id && teacher_id !== caller.id) return json({ ok: false, error: 'permission denied' }, 403)

    teacher_id = caller.id
    // Get teacher
    const { data: teacher, error: teachErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', teacher_id)
      .single()

    if (teachErr) return json({ ok: false, error: `Teacher fetch error: ${teachErr.message}` }, 200)
    if (!teacher || teacher.role !== 'teacher') return json({ ok: false, error: 'Only teachers' }, 403)

    // Límite del plan antes de crear la cuenta, para no dejar alumnos huérfanos.
    const [{ data: lim }, { data: act }] = await Promise.all([
      admin.rpc('limite_alumnos', { p_teacher: teacher.id }),
      admin.rpc('alumnos_activos', { p_teacher: teacher.id }),
    ])
    if (lim !== null && (act ?? 0) >= lim) return json({ ok: false, error: 'student_limit' }, 200)

    const idioma = ['pt', 'es', 'en'].includes(language) ? language : (['pt', 'es', 'en'].includes(teacher.language) ? teacher.language : 'pt')

    // Contraseña al azar que nadie conoce: el alumno crea la suya con el enlace del correo de bienvenida.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: false,
      // El idioma del alumno (el de su país) decide en qué idioma le llegan los correos.
      user_metadata: {
        role: 'student', full_name: full_name || email,
        language: idioma,
      },
    })

    if (createErr) return json({ ok: false, error: `Create error: ${createErr.message}` }, 200)
    if (!created?.user?.id) return json({ ok: false, error: 'No user ID returned' }, 200)

    const userId = created.user.id

    // Link
    const { error: linkErr } = await admin
      .from('profiles')
      .update({ teacher_id, link_status: 'active' })
      .eq('id', userId)

    if (linkErr) return json({ ok: false, error: `Link error: ${linkErr.message}` }, 200)

    // Bienvenida con enlace para crear la contraseña. Si falla, el alumno sigue pudiendo usar "Olvidé mi contraseña".
    let email_sent = false
    try {
      const { data: link, error: linkErr2 } = await admin.auth.admin.generateLink({
        type: 'recovery', email, options: { redirectTo: 'https://app.rutyn.com.br/redefinir-senha' },
      })
      if (linkErr2 || !link?.properties?.action_link) throw linkErr2 ?? new Error('no link')
      const c = BIENVENIDA[idioma as 'pt' | 'es' | 'en'](escapar(full_name || ''), escapar(teacher.full_name || 'Rutyn'))
      await enviarCorreo(email, c.subject, plantilla(c.titulo, c.parrafos, c.boton, link.properties.action_link, c.pie))
      email_sent = true
    } catch (e) {
      console.error('bienvenida', email, String(e))
    }

    return json({ ok: true, student_id: userId, student_email: email, email_sent }, 200)
  } catch (e) {
    return json({ ok: false, error: `Exception: ${String(e)}` }, 200)
  }
})

const BIENVENIDA = {
  pt: (alumno: string, prof: string) => ({
    subject: `${prof} te adicionou no Rutyn`,
    titulo: alumno ? `Olá, ${alumno}!` : 'Olá!',
    parrafos: [`<strong>${prof}</strong> criou sua conta no <strong>Rutyn</strong>, o app onde você vai ver seus treinos, sua dieta e sua evolução.`, 'Para entrar, crie sua senha no botão abaixo.'],
    boton: 'Criar minha senha',
    pie: 'Se o link expirar, abra app.rutyn.com.br e toque em "Esqueceu a senha?".',
  }),
  es: (alumno: string, prof: string) => ({
    subject: `${prof} te agregó en Rutyn`,
    titulo: alumno ? `¡Hola, ${alumno}!` : '¡Hola!',
    parrafos: [`<strong>${prof}</strong> creó tu cuenta en <strong>Rutyn</strong>, la app donde vas a ver tus rutinas, tu dieta y tu progreso.`, 'Para entrar, creá tu contraseña con el botón de abajo.'],
    boton: 'Crear mi contraseña',
    pie: 'Si el enlace vence, abrí app.rutyn.com.br y tocá "¿Olvidaste tu contraseña?".',
  }),
  en: (alumno: string, prof: string) => ({
    subject: `${prof} added you on Rutyn`,
    titulo: alumno ? `Hi, ${alumno}!` : 'Hi!',
    parrafos: [`<strong>${prof}</strong> created your <strong>Rutyn</strong> account, the app where you'll see your workouts, your diet and your progress.`, 'To sign in, create your password with the button below.'],
    boton: 'Create my password',
    pie: 'If the link expires, open app.rutyn.com.br and tap "Forgot your password?".',
  }),
}

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
