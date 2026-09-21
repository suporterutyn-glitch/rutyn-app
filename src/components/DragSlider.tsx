import { useRef, useState, type PointerEvent } from 'react'
import { ChevronRight } from 'lucide-react'

type Props = {
  label: string
  onConfirm: () => void
  variant?: 'brand' | 'danger'
}

export function DragSlider({ label, onConfirm, variant = 'brand' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [maxX, setMaxX] = useState(0)
  const [dragging, setDragging] = useState(false)

  function start(e: PointerEvent<HTMLDivElement>) {
    if (!trackRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = trackRef.current.getBoundingClientRect()
    setMaxX(rect.width - 48)
    setDragging(true)
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!dragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(maxX, e.clientX - rect.left - 24))
    setX(nx)
  }
  function end() {
    if (!dragging) return
    setDragging(false)
    if (maxX > 0 && x / maxX > 0.85) {
      setX(maxX)
      onConfirm()
      setTimeout(() => setX(0), 300)
    } else {
      setX(0)
    }
  }

  const bg = variant === 'danger' ? 'bg-danger' : 'bg-save'
  const thumbBg = variant === 'danger' ? 'bg-danger-strong' : 'bg-brand-light'

  return (
    <div className="relative w-full h-14 rounded-btn-pill bg-surface-raised overflow-hidden select-none">
      <div className={'absolute inset-y-0 left-0 ' + bg} style={{ width: `${x + 24}px` }} />
      <div className="absolute inset-0 flex items-center justify-center text-white text-rt-16 font-semibold pointer-events-none">
        {label}
      </div>
      <div
        ref={trackRef}
        className="absolute inset-0"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
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
