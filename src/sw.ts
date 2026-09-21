/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope
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
