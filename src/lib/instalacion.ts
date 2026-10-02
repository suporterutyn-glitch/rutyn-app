// Instalar la PWA: Android/Chrome avisa con "beforeinstallprompt" (hay que guardarlo
// apenas carga la página); iPhone no tiene aviso y se instala a mano desde Safari.
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let pendiente: EventoInstalar | null = null
const oyentes = new Set<() => void>()

export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pendiente = e as EventoInstalar
    oyentes.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => { pendiente = null; oyentes.forEach((f) => f()) })
}

export function alCambiarInstalacion(f: () => void) {
  oyentes.add(f)
  return () => { oyentes.delete(f) }
}

export const puedeInstalarDirecto = () => pendiente !== null

export async function instalarDirecto(): Promise<boolean> {
  if (!pendiente) return false
  await pendiente.prompt()
  const { outcome } = await pendiente.userChoice
  pendiente = null
  oyentes.forEach((f) => f())
  return outcome === 'accepted'
}

export function yaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export function plataforma(): 'ios' | 'android' | 'otro' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'otro'
}

/** En iPhone solo Safari puede agregar a la pantalla de inicio. */
export function esSafariIos() {
  const ua = navigator.userAgent
  return plataforma() === 'ios' && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/i.test(ua)
}
