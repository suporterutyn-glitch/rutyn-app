// Edge Function: cria auth.user do aluno

// deno-lint-ignore-file
// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

    // Create user with auto-generate password
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8),
      email_confirm: false,
      // El idioma del alumno (el de su país) decide en qué idioma le llegan los correos.
      user_metadata: {
        role: 'student', full_name: full_name || email,
        language: ['pt', 'es', 'en'].includes(language) ? language : (teacher.language ?? 'pt'),
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

    return json({ ok: true, student_id: userId, student_email: email }, 200)
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
