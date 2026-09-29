// La landing manda al profesor a la app con el plan elegido (?comprar=1&plan=&seats=).
// Si todavía no tiene sesión, el registro/login lo desvía: se guarda acá y se retoma
// cuando entra al panel del profesor.
const CLAVE = 'rutyn_compra'
const VIGENCIA_MS = 24 * 60 * 60 * 1000

export type IntencionCompra = { plan: 'basic' | 'pro'; seats: number }

export function guardarIntencionDesdeUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('comprar') !== '1') return
    const plan = q.get('plan') === 'pro' ? 'pro' : 'basic'
    const seats = Number(q.get('seats')) || 2
    localStorage.setItem(CLAVE, JSON.stringify({ plan, seats, t: Date.now() }))
  } catch { /* sin almacenamiento: se pierde la preselección, no la compra */ }
}

export function tomarIntencion(): IntencionCompra | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? 'null')
    localStorage.removeItem(CLAVE)
    if (!v || Date.now() - v.t > VIGENCIA_MS) return null
    return { plan: v.plan === 'pro' ? 'pro' : 'basic', seats: Number(v.seats) || 2 }
  } catch {
    return null
  }
}
