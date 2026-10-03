// La landing (rutyn.com.br) muestra el registro de profesor dentro de un iframe.
// Dentro de ese iframe solo puede verse ese formulario: todo lo demás abre la app completa.
// Otros marcos (por ejemplo una extensión que simula un celular) no cuentan: ahí la app funciona normal.

const CLAVE = 'rutyn.embed'
const LANDING = /^https:\/\/(www\.)?rutyn\.com\.br$/

function dentroDeUnMarco() {
  try { return window.self !== window.top } catch { return true }
}

function marcoDeLaLanding() {
  // Chrome y Safari dicen quién contiene la página; el resto se guía por el referrer.
  const origenes = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins
  if (origenes && origenes.length) return LANDING.test(origenes[0])
  try { return LANDING.test(new URL(document.referrer).origin) } catch { return false }
}

/** true cuando la app está incrustada en la landing (no en cualquier iframe). */
export function enIframe() {
  if (!dentroDeUnMarco()) return false
  try {
    // La landing abre el formulario con ?embed=1: se recuerda mientras dure ese marco.
    if (new URLSearchParams(window.location.search).get('embed') === '1') sessionStorage.setItem(CLAVE, '1')
    if (sessionStorage.getItem(CLAVE) === '1') return true
  } catch { /* sin almacenamiento: decide el origen del marco */ }
  return marcoDeLaLanding()
}

/** Abre una URL de la app en la ventana principal, fuera del iframe. */
export function abrirFuera(url: string) {
  const destino = url.startsWith('http') ? url : window.location.origin + url
  try { window.top!.location.href = destino } catch { window.open(destino, '_top') }
}

/** Rutas que pueden mostrarse dentro del iframe de la landing. */
export const RUTA_EMBEBIBLE = '/cadastro/professor'
