// Edge Function: el profesor elimina para siempre la cuenta de uno de sus alumnos
// (datos, archivos y usuario). No se puede deshacer.
//
// POST { student_id }

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { cors, json } from '../_shared/stripe.ts'
import { borrarCuenta } from '../_shared/cuentas.ts'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    // @ts-ignore
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await db.auth.getUser(jwt)
    if (!user) return json({ error: 'Invalid session' }, 401)

    const { student_id } = await req.json().catch(() => ({})) as any
    if (!student_id) return json({ error: 'student_id requerido' }, 400)

    // Solo un alumno de este profesor.
    const { data: alumno } = await db.from('profiles').select('id,role,teacher_id').eq('id', student_id).maybeSingle()
    if (!alumno || alumno.role !== 'student' || alumno.teacher_id !== user.id) return json({ error: 'not_your_student' }, 403)

    await borrarCuenta(db, student_id)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
