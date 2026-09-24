/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Una versión nueva se activa en cuanto llega: sin esto quedaba esperando a
// que se cerraran todas las ventanas y el celular seguía con la app vieja.
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting()
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
precacheAndRoute((self as any).__WB_MANIFEST || [])

self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {}
  try { data = event.data ? event.data.json() : {} } catch { /* ignore */ }
  const title = data.title ?? 'Rutyn'
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? '/'
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of list) {
      if ('focus' in c) {
        await (c as WindowClient).navigate(url).catch(() => {})
        return (c as WindowClient).focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})

export {}
