import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export async function currentPermission(): Promise<NotificationPermission> {
  return isPushSupported() ? Notification.permission : 'denied'
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Web Push não suportado neste navegador' }
  if (!VAPID_PUBLIC) return { ok: false, error: 'VITE_VAPID_PUBLIC_KEY não configurado' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'Permissão negada' }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  })

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false, error: 'Subscription inválida' }
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    ua: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const clean = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(clean)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
