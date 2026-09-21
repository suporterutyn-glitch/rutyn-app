// Edge Function: Create student with known password

//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })

  try {
    //@ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    //@ts-ignore
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    const body = await req.json()
    const { email, full_name, password, teacher_id } = body

    if (!email || !password || !teacher_id) {
      return json({ ok: false, error: 'Missing email, password, or teacher_id' }, 400)
    }

    // Create user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', full_name: full_name || email },
    })

    if (createErr) return json({ ok: false, error: `Create error: ${createErr.message}` }, 400)
    if (!created?.user?.id) return json({ ok: false, error: 'No user ID returned' }, 400)

    // Create profile linked to teacher
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: created.user.id,
      role: 'student',
      account_status: 'active',
      link_status: 'active',
      email,
      full_name: full_name || email,
      country: 'BR',
      language: 'pt',
      profile_complete: true,
      teacher_id,
    })

    if (profileErr) {
      return json({ ok: false, error: `Profile error: ${profileErr.message}` }, 400)
    }

    return json({
      ok: true,
      student_id: created.user.id,
      email,
      message: 'Student created successfully',
    }, 200)
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
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
