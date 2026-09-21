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
    const { email, full_name, teacher_id } = body

    if (!email) return json({ ok: false, error: 'No email' }, 200)
    if (!teacher_id) return json({ ok: false, error: 'No teacher_id' }, 200)

    // Get teacher
    const { data: teacher, error: teachErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', teacher_id)
      .single()

    if (teachErr) return json({ ok: false, error: `Teacher fetch error: ${teachErr.message}` }, 200)
    if (!teacher) return json({ ok: false, error: 'Teacher not found' }, 200)

    // Create user with auto-generate password
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8),
      email_confirm: false,
      user_metadata: { role: 'student', full_name: full_name || email },
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
