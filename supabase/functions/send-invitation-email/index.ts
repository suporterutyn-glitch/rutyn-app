// Edge Function: avisa por correo al profesor que un alumno le mandó una propuesta.
// POST { invite_id } — solo el alumno dueño de la propuesta puede dispararlo.

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { enviarCorreo, plantilla, escapar } from '../_shared/correo.ts'

const TEXTOS = {
  pt: (alumno: string) => ({
    subject: `${alumno} quer treinar com você no Rutyn`,
    titulo: 'Nova proposta de aluno',
    parrafos: [`<strong>${alumno}</strong> te enviou uma proposta para treinar com você.`, 'Veja os detalhes e aceite, recuse ou envie outra proposta.'],
    boton: 'Ver proposta',
  }),
  es: (alumno: string) => ({
    subject: `${alumno} quiere entrenar con vos en Rutyn`,
    titulo: 'Nueva propuesta de alumno',
    parrafos: [`<strong>${alumno}</strong> te envió una propuesta para entrenar con vos.`, 'Mirá los detalles y aceptala, rechazala o enviá otra propuesta.'],
    boton: 'Ver propuesta',
  }),
  en: (alumno: string) => ({
    subject: `${alumno} wants to train with you on Rutyn`,
    titulo: 'New student proposal',
    parrafos: [`<strong>${alumno}</strong> sent you a proposal to train with you.`, 'Check the details and accept, decline or send another proposal.'],
    boton: 'View proposal',
  }),
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })
  try {
    // @ts-ignore
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ ok: false, error: 'Invalid session' }, 401)

    const { invite_id } = await req.json().catch(() => ({})) as any
    if (!invite_id) return json({ ok: false, error: 'invite_id required' }, 400)

    const { data: inv } = await admin.from('invites').select('id,student_id,teacher_id,status').eq('id', invite_id).maybeSingle()
    if (!inv || inv.student_id !== user.id) return json({ ok: false, error: 'Forbidden' }, 403)

    const { data: gente } = await admin.from('profiles').select('id,full_name,email,language').in('id', [inv.student_id, inv.teacher_id])
    const alumno = (gente ?? []).find((p: any) => p.id === inv.student_id)
    const profe = (gente ?? []).find((p: any) => p.id === inv.teacher_id)
    if (!profe?.email) return json({ ok: false, error: 'Teacher not found' }, 404)

    const idioma = (['pt', 'es', 'en'].includes(profe.language) ? profe.language : 'pt') as 'pt' | 'es' | 'en'
    const c = TEXTOS[idioma](escapar(alumno?.full_name || alumno?.email || ''))
    await enviarCorreo(profe.email, c.subject, plantilla(c.titulo, c.parrafos, c.boton, 'https://app.rutyn.com.br/professor/convites'))
    return json({ ok: true }, 200)
  } catch (e) {
    console.error('send-invitation-email', String(e))
    return json({ ok: false, error: String(e) }, 200)
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
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors() } })
}
