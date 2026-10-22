import { useRef, useState, type PointerEvent } from 'react'
import { ChevronRight } from 'lucide-react'

type Props = {
  label: string
  onConfirm: () => void
  /** 'light' = sobre fondo claro (resumo, esforço). */
  variant?: 'brand' | 'danger' | 'light'
}

export function DragSlider({ label, onConfirm, variant = 'brand' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  // Posición y estado en refs: al soltar se lee el valor real (con el estado de React
  // a veces llegaba uno viejo y no confirmaba aunque la bolita estuviera al final).
  const xRef = useRef(0)
  const maxRef = useRef(0)
  const activo = useRef(false)
  const offset = useRef(24)

  function mover(nx: number) {
    xRef.current = nx
    setX(nx)
  }

  function start(e: PointerEvent<HTMLDivElement>) {
    if (!trackRef.current) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* sigue funcionando sin captura */ }
    const rect = trackRef.current.getBoundingClientRect()
    maxRef.current = rect.width - 56
    // Si agarra la bolita, se respeta dónde la tomó; si toca la pista, la bolita va al dedo.
    const dentro = e.clientX - rect.left - xRef.current
    offset.current = dentro >= 0 && dentro <= 56 ? dentro : 28
    activo.current = true
    setDragging(true)
    window.getSelection?.()?.removeAllRanges()
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!activo.current || !trackRef.current) return
    e.preventDefault()
    const rect = trackRef.current.getBoundingClientRect()
    mover(Math.max(0, Math.min(maxRef.current, e.clientX - rect.left - offset.current)))
  }
  function end() {
    if (!activo.current) return
    activo.current = false
    setDragging(false)
    if (maxRef.current > 0 && xRef.current / maxRef.current > 0.75) {
      mover(maxRef.current)
      onConfirm()
      setTimeout(() => mover(0), 300)
    } else {
      mover(0)
    }
  }

  const bg = variant === 'danger' ? 'bg-danger' : 'bg-save'
  const thumbBg = variant === 'danger' ? 'bg-danger-strong' : 'bg-brand-light'
  const pista = variant === 'light' ? 'bg-grey-900' : 'bg-surface-raised'

  return (
    <div className={'relative w-full h-14 rounded-btn-pill overflow-hidden select-none ' + pista}>
      <div className={'absolute inset-y-0 left-0 ' + bg} style={{ width: `${x + 24}px` }} />
      <div className="absolute inset-0 flex items-center justify-center text-white text-rt-16 font-semibold pointer-events-none">
        {label}
      </div>
      <div
        ref={trackRef}
        // touch-none: sin esto el iPhone toma el gesto como scroll y cancela el arrastre.
        className="absolute inset-0 touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <div
          className={
            'absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center transition-shadow ' +
            thumbBg + (dragging ? ' shadow-glow-active' : ' shadow-glow')
          }
          style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : 'transform 200ms' }}
        >
          <ChevronRight size={26} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}
