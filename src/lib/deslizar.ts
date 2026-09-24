import { useRef, useState } from 'react'

/** Card que se desliza a la izquierda y deja ver acciones de `ancho` px (mouse o dedo). */
export function useDeslizar(ancho: number, desactivado = false) {
  const [dx, setDx] = useState(0)
  const [abierto, setAbierto] = useState(false)
  const inicio = useRef<{ x: number; y: number } | null>(null)
  const arrastrando = useRef(false)

  const handlers = {
    onPointerDown(e: React.PointerEvent) {
      if (desactivado) return
      inicio.current = { x: e.clientX, y: e.clientY }
      arrastrando.current = false
    },
    onPointerMove(e: React.PointerEvent) {
      if (!inicio.current) return
      const x = e.clientX - inicio.current.x
      const y = e.clientY - inicio.current.y
      if (!arrastrando.current) {
        if (Math.abs(x) < 8 || Math.abs(x) < Math.abs(y)) return
        arrastrando.current = true
      }
      setDx(Math.min(0, Math.max(-ancho, (abierto ? -ancho : 0) + x)))
    },
    onPointerUp() {
      if (arrastrando.current) {
        const abrir = dx < -ancho / 3
        setAbierto(abrir)
        setDx(abrir ? -ancho : 0)
      }
      inicio.current = null
    },
  }
  function cerrar() { setAbierto(false); setDx(0) }
  /** El click que termina un arrastre no debe contar como toque. */
  function fueArrastre() { const a = arrastrando.current; arrastrando.current = false; return a }
  return { dx, abierto, handlers, cerrar, fueArrastre }
}
