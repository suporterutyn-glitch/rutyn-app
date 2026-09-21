// Edge Function: envia push notification para um user_id.
//
// Uso:
//   POST /functions/v1/send-push
//   Body: { user_id: "uuid", title: "...", body: "...", url?: "/rota" }
//   Auth: SERVICE_ROLE (só backend / cron / triggers)
//
// Requer segredos:
//   VAPID_PUBLIC_KEY  — chave pública VAPID
//   VAPID_PRIVATE_KEY — chave privada VAPID
//   VAPID_SUBJECT     — mailto:seu@email.com
//
// Gerar chaves VAPID:
//   npx web-push generate-vapid-keys

// deno-lint-ignore-file
// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore
import * as webpush from 'https://esm.sh/web-push@3.6.7?target=deno'

// @ts-ignore
Deno.serve(async (req: Request) => {
  const auth = req.headers.get('Authorization') ?? ''
  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!auth.includes(SERVICE)) return new Response('unauthorized', { status: 401 })

  // @ts-ignore
  const VAPID_PUB = Deno.env.get('VAPID_PUBLIC_KEY')
  // @ts-ignore
  const VAPID_PRIV = Deno.env.get('VAPID_PRIVATE_KEY')
  // @ts-ignore
  const VAPID_SUB = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@rutyn.app'
  if (!VAPID_PUB || !VAPID_PRIV) return json({ error: 'VAPID keys not configured' }, 500)

  ;(webpush as any).setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV)

  const body = await req.json().catch(() => ({}))
  const { user_id, title, body: msg, url } = body as { user_id?: string; title?: string; body?: string; url?: string }
  if (!user_id) return json({ error: 'user_id required' }, 400)

  // @ts-ignore
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE)
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', user_id)
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 })

  const payload = JSON.stringify({ title: title ?? 'Rutyn', body: msg ?? '', url: url ?? '/' })
  const stale: string[] = []
  let sent = 0

  await Promise.all(subs.map(async (s: any) => {
    try {
      await (webpush as any).sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
    } catch (e: any) {
      // 404/410 = subscription expirada
      if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.endpoint)
    }
  }))

  if (stale.length) await admin.from('push_subscriptions').delete().in('endpoint', stale)

  return json({ ok: true, sent, removed: stale.length })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
