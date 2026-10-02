// La landing (rutyn.com.br) muestra el registro de profesor dentro de un iframe.
// Dentro del iframe solo puede verse ese formulario: todo lo demás abre la app completa.

export function enIframe() {
  try { return window.self !== window.top } catch { return true }
}

/** Abre una URL de la app en la ventana principal, fuera del iframe. */
export function abrirFuera(url: string) {
  const destino = url.startsWith('http') ? url : window.location.origin + url
  try { window.top!.location.href = destino } catch { window.open(destino, '_top') }
}

/** Rutas que pueden mostrarse dentro del iframe de la landing. */
export const RUTA_EMBEBIBLE = '/cadastro/professor'
