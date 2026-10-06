// Imagen para compartir un entrenamiento terminado en Instagram (historia 9:16 o feed 4:5).
// Se dibuja en un canvas: no depende de servidores y funciona sin conexión.

export const INSTAGRAM_RUTYN = '@rutynapp'

export type DatosTreino = {
  titulo: string            // "Entrenamiento concluido"
  fecha: string             // "Martes · 6 de octubre"
  rutina: string | null
  kg: string                // "12.450"
  kgEtiqueta: string        // "kg levantados"
  stats: { valor: string; etiqueta: string }[]   // ejercicios, series, tiempo
  grupos: string | null     // "Pecho, Tríceps"
  alumno: string | null
  pie: string               // "Entrená con Rutyn"
}
export type Formato = 'story' | 'feed'

const TAM: Record<Formato, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, feed: { w: 1080, h: 1350 } }
const VERDE = '#91C145'

function cargarImagen(src: string) {
  return new Promise<HTMLImageElement | null>((ok) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = src
  })
}

function caja(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** Achica la letra hasta que el texto entre en el ancho (para nombres largos de rutina). */
function textoQueEntra(c: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, peso: number, tam: number, min = 28) {
  let t = tam
  do { c.font = `${peso} ${t}px Montserrat, system-ui, sans-serif`; t -= 2 } while (c.measureText(texto).width > ancho && t > min)
  let s = texto
  while (c.measureText(s).width > ancho && s.length > 4) s = s.slice(0, -2)
  c.fillText(s === texto ? s : s.trimEnd() + '…', x, y)
}

export async function crearImagenTreino(formato: Formato, d: DatosTreino): Promise<Blob> {
  const { w, h } = TAM[formato]
  const story = formato === 'story'
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const c = cv.getContext('2d')!
  try { await Promise.all([document.fonts.load('900 100px Montserrat'), document.fonts.load('600 40px Montserrat')]) } catch { /* usa la fuente del sistema */ }
  const logo = await cargarImagen('/assets/images/logo-rutyn.png')

  // Fondo: negro con dos luces verdes.
  c.fillStyle = '#070707'; c.fillRect(0, 0, w, h)
  const luz = (x: number, y: number, r: number, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(145,193,69,${a})`); g.addColorStop(1, 'rgba(145,193,69,0)')
    c.fillStyle = g; c.fillRect(0, 0, w, h)
  }
  luz(w * 0.9, h * 0.12, w * 0.9, 0.34)
  luz(w * 0.05, h * 0.9, w * 0.8, 0.2)

  const m = 84                         // margen lateral
  const ancho = w - m * 2
  let y = story ? 250 : 96             // en historia, Instagram tapa arriba y abajo
  c.textBaseline = 'alphabetic'

  // Logo + marca
  if (logo) { c.save(); caja(c, m, y, 132, 132, 30); c.clip(); c.drawImage(logo, m, y, 132, 132); c.restore() }
  c.fillStyle = '#fff'; c.font = '800 46px Montserrat, system-ui, sans-serif'; c.textAlign = 'left'
  c.fillText('Rutyn', m + 160, y + 62)
  c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 32px Montserrat, system-ui, sans-serif'
  c.fillText(INSTAGRAM_RUTYN, m + 160, y + 108)
  y += story ? 210 : 180

  // Título y fecha
  c.fillStyle = VERDE; c.font = '700 34px Montserrat, system-ui, sans-serif'
  c.fillText(d.fecha.toUpperCase(), m, y)
  y += story ? 96 : 84
  c.fillStyle = '#fff'
  const palabras = d.titulo.toUpperCase().split(' ')
  const mitad = Math.ceil(palabras.length / 2)
  for (const linea of palabras.length > 1 ? [palabras.slice(0, mitad).join(' '), palabras.slice(mitad).join(' ')] : [d.titulo.toUpperCase()]) {
    textoQueEntra(c, linea, m, y, ancho, 900, story ? 104 : 92, 56)
    y += story ? 108 : 96
  }
  if (d.rutina) {
    y += 6
    c.fillStyle = 'rgba(255,255,255,.75)'
    textoQueEntra(c, d.rutina, m, y, ancho, 600, 44)
    y += 30
  }
  y += story ? 50 : 34

  // Bloque principal: peso levantado
  const altoPeso = story ? 330 : 270
  c.fillStyle = 'rgba(255,255,255,.06)'; caja(c, m, y, ancho, altoPeso, 44); c.fill()
  c.strokeStyle = 'rgba(145,193,69,.55)'; c.lineWidth = 3; caja(c, m, y, ancho, altoPeso, 44); c.stroke()
  c.textAlign = 'center'
  c.fillStyle = VERDE
  textoQueEntra(c, d.kg, w / 2, y + altoPeso * 0.56, ancho - 80, 900, story ? 190 : 160, 80)
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '700 40px Montserrat, system-ui, sans-serif'
  c.fillText(d.kgEtiqueta.toUpperCase(), w / 2, y + altoPeso * 0.82)
  y += altoPeso + 26

  // Tres datos
  const n = d.stats.length, sep = 24, bw = (ancho - sep * (n - 1)) / n, bh = story ? 190 : 170
  d.stats.forEach((s, i) => {
    const x = m + i * (bw + sep)
    c.fillStyle = 'rgba(255,255,255,.06)'; caja(c, x, y, bw, bh, 34); c.fill()
    c.fillStyle = '#fff'
    textoQueEntra(c, s.valor, x + bw / 2, y + bh * 0.52, bw - 30, 800, 66, 36)
    c.fillStyle = 'rgba(255,255,255,.6)'
    textoQueEntra(c, s.etiqueta, x + bw / 2, y + bh * 0.8, bw - 24, 600, 28, 20)
  })
  y += bh + (story ? 62 : 46)

  if (d.grupos) {
    c.fillStyle = 'rgba(255,255,255,.75)'
    textoQueEntra(c, d.grupos, w / 2, y, ancho, 600, 36, 24)
  }

  // Pie: quién entrenó y cómo encontrar Rutyn
  const pieY = h - (story ? 300 : 84)
  c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(m, pieY - 74, ancho, 2)
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '700 36px Montserrat, system-ui, sans-serif'
  if (d.alumno) textoQueEntra(c, d.alumno, m, pieY, ancho * 0.5, 700, 36, 24)
  c.textAlign = 'right'; c.fillStyle = VERDE; c.font = '800 38px Montserrat, system-ui, sans-serif'
  c.fillText(INSTAGRAM_RUTYN, w - m, pieY - 6)
  c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 26px Montserrat, system-ui, sans-serif'
  c.fillText(d.pie, w - m, pieY + 34)

  return new Promise<Blob>((ok, mal) => cv.toBlob((b) => (b ? ok(b) : mal(new Error('canvas'))), 'image/png'))
}

/** true si el dispositivo puede mandar la imagen directo a otra app (el celular; casi ninguna computadora). */
export function puedeCompartirArchivo(archivo: File) {
  try { return !!navigator.canShare && navigator.canShare({ files: [archivo] }) } catch { return false }
}
