// Edge Function: manda al celular (web push) una fila de `notifications`.
// La dispara el trigger `notifications_push` por pg_net, con CRON_SECRET.
//
// POST { notification_id }
// El texto se traduce en el celular (service worker) con data.key + params y el idioma del usuario;
// title/body van como respaldo.
//
// Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore
import webpush from 'npm:web-push@3.6.7'

// A dónde lleva tocar la notificación, según el aviso y si la recibe el profesor o el alumno.
function destino(clave: string | undefined, rol: string) {
  const profe = rol === 'teacher'
  const k = clave ?? ''
  if (/^(charge|payment|change|weekSummary)/.test(k)) return profe ? '/professor/financeiro' : '/aluno/mensalidade'
  if (/^(newInvite|counterAccepted)/.test(k)) return '/professor/convites'
  if (k === 'joinedByLink') return '/professor/alunos'
  if (/^(plan|paymentFailed)/.test(k)) return '/professor/assinatura'
  if (/^newRoutine/.test(k)) return '/aluno/treinos'
  if (/^newDiet/.test(k)) return '/aluno/nutricao'
  if (/^anamnesis/.test(k)) return profe ? '/professor' : '/aluno/anamneses'
  return profe ? '/professor/notificacoes' : '/aluno/notificacoes'
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const CRON = Deno.env.get('CRON_SECRET')
  if (!CRON || (req.headers.get('Authorization') ?? '') !== `Bearer ${CRON}`) return new Response('unauthorized', { status: 401 })
  // @ts-ignore
  const PUB = Deno.env.get('VAPID_PUBLIC_KEY'), PRIV = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!PUB || !PRIV) return json({ error: 'VAPID keys not configured' }, 500)
  // @ts-ignore
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:suporte@rutyn.com.br', PUB, PRIV)

  const { notification_id } = await req.json().catch(() => ({})) as any
  if (!notification_id) return json({ error: 'notification_id required' }, 400)

  // @ts-ignore
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: n } = await db.from('notifications').select('id,user_id,title,body,data').eq('id', notification_id).maybeSingle()
  if (!n) return json({ ok: true, sent: 0, reason: 'not found' })
  const { data: subs } = await db.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', n.user_id)
  if (!subs?.length) return json({ ok: true, sent: 0 })
  const { data: p } = await db.from('profiles').select('language,role').eq('id', n.user_id).maybeSingle()

  const clave = n.data?.key as string | undefined
  const payload = JSON.stringify({
    title: n.title, body: n.body ?? '', key: clave, params: n.data?.params ?? {},
    lang: p?.language ?? 'pt', url: destino(clave, p?.role ?? 'student'), tag: n.id,
  })
  const vencidas: string[] = []
  let sent = 0
  await Promise.all(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 })
      sent++
    } catch (e: any) {
      // 404/410: el dispositivo ya no existe (desinstaló o revocó el permiso).
      if (e?.statusCode === 404 || e?.statusCode === 410) vencidas.push(s.endpoint)
      else console.error('push', e?.statusCode, String(e?.body ?? e?.message ?? e).slice(0, 200))
    }
  }))
  if (vencidas.length) await db.from('push_subscriptions').delete().in('endpoint', vencidas)
  return json({ ok: true, sent, removed: vencidas.length })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
