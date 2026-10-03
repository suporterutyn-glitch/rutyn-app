import { supabase } from './supabase'
import i18n from './i18n'
import { mensajeError } from './errores'

// Clave pública de envío (la privada está en los secretos de Supabase). No es un secreto.
const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
  ?? 'BPON0aO9un5cBmeE0hNbDOa_oiLshMEQ4hodrFIsrrUwXZJNBRXfNFtXyv_rbflSGQOylhkdy0jUtx-zJnZQk6M'

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export async function currentPermission(): Promise<NotificationPermission> {
  return isPushSupported() ? Notification.permission : 'denied'
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: i18n.t('general:pushErr.unsupported') }
  if (!VAPID_PUBLIC) return { ok: false, error: i18n.t('general:pushErr.notConfigured') }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: i18n.t('general:pushErr.denied') }

  const reg = await navigator.serviceWorker.ready
  const opciones = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) }
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe(opciones)
    } catch {
      // Quedó una suscripción hecha con otra clave: se descarta y se crea de nuevo.
      await (await reg.pushManager.getSubscription())?.unsubscribe()
      sub = await reg.pushManager.subscribe(opciones)
    }
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false, error: i18n.t('general:pushErr.invalid') }
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    ua: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' })

  if (error) return { ok: false, error: mensajeError(error) }
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

/** Ya dio permiso: se asegura de que este dispositivo esté registrado, sin preguntar nada. */
export async function asegurarPush(userId: string) {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  await subscribeToPush(userId).catch(() => undefined)
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const clean = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(clean)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
