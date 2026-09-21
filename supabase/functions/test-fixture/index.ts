// Edge Function: Crea perfiles de prueba para testing (solo con secret key)

//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })

  try {
    const secret = new URL(req.url).searchParams.get('secret')
    if (secret !== 'test-only-fixture-12345') {
      return json({ ok: false, error: 'Invalid secret' }, 403)
    }

    //@ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    //@ts-ignore
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Create professor profile
    await admin.from('profiles').upsert({
      id: '1bb22990-ed9b-4301-be89-d9864143499b',
      role: 'teacher',
      account_status: 'active',
      email: 'prof.test2@test.com',
      full_name: 'Prof Test',
      phone: '+5581988888888',
      country: 'BR',
      language: 'pt',
      profile_complete: true,
      plan: 'free',
    })

    // Create student profile
    await admin.from('profiles').upsert({
      id: 'ebef1a14-7bf2-4c7d-b7ca-d97e65609422',
      role: 'student',
      account_status: 'active',
      email: 'test.debug@test.com',
      full_name: 'Test Debug',
      phone: '+5581987654321',
      country: 'BR',
      language: 'pt',
      profile_complete: true,
      teacher_id: '1bb22990-ed9b-4301-be89-d9864143499b',
      link_status: 'active',
    })

    return json({ ok: true, message: 'Fixtures created' }, 200)
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
