import { useRef, useState } from 'react'

/**
 * Reordenar arrastrando, con Pointer Events para que sirva igual con el dedo
 * y con el mouse (prints 009, 024, 025 y 029 del módulo 07).
 *
 * El hook no mueve nada solo: avisa a dónde cayó el elemento y quien lo usa
 * decide cómo persistirlo.
 */
export function useArrastreLista<T extends string>(
  onSoltar: (desde: T, hasta: T) => void,
) {
  const [arrastrando, setArrastrando] = useState<T | null>(null)
  const [encima, setEncima] = useState<T | null>(null)
  const contenedores = useRef(new Map<T, HTMLElement>())
  // En una ref y no solo en el estado: los primeros pointermove llegan antes
  // de que React vuelva a renderizar, y se perdían.
  const arrastrandoRef = useRef<T | null>(null)
  const encimaRef = useRef<T | null>(null)

  function registrar(id: T, el: HTMLElement | null) {
    if (el) contenedores.current.set(id, el)
    else contenedores.current.delete(id)
  }

  function alBajar(id: T) {
    return (e: React.PointerEvent) => {
      // El arrastre nace en la manija, no en toda la tarjeta: así el scroll
      // vertical de la lista sigue funcionando.
      e.preventDefault()
      try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* sin captura igual funciona */ }
      arrastrandoRef.current = id
      setArrastrando(id)
    }
  }

  function alMover(e: React.PointerEvent) {
    if (!arrastrandoRef.current) return
    let destino: T | null = null
    for (const [id, el] of contenedores.current) {
      const r = el.getBoundingClientRect()
      if (e.clientY >= r.top && e.clientY <= r.bottom) { destino = id; break }
    }
    encimaRef.current = destino
    setEncima(destino)
  }

  function alSoltar() {
    const desde = arrastrandoRef.current
    const hasta = encimaRef.current
    if (desde && hasta && desde !== hasta) onSoltar(desde, hasta)
    arrastrandoRef.current = null
    encimaRef.current = null
    setArrastrando(null)
    setEncima(null)
  }

  return { arrastrando, encima, registrar, alBajar, alMover, alSoltar }
}

/** Mueve un elemento de una posición a otra y devuelve la lista nueva. */
export function moverEnLista<T>(lista: T[], desde: number, hasta: number): T[] {
  const copia = lista.slice()
  const [item] = copia.splice(desde, 1)
  copia.splice(hasta, 0, item)
  return copia
}
