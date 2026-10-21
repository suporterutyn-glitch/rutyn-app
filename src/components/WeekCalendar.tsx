import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { diasCortos, localeDe } from '@/lib/fechas'

type Props = {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  /** Fechas con compromisos, como Date.toDateString(). */
  datesWithEvents?: Set<string>
  /** Botones a la derecha del mes (por ejemplo: avisar a alumnos y nuevo compromiso). */
  acciones?: ReactNode
}

// Semanas que se pueden recorrer deslizando (hacia atrás y hacia adelante desde la actual).
const ANTES = 12
const DESPUES = 26

function inicioSemana(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

/** Semana deslizable: se cambia de semana arrastrando con el dedo (o el mouse), sin flechas. */
export function WeekCalendar({ selectedDate, onSelectDate, datesWithEvents = new Set(), acciones }: Props) {
  const { i18n } = useTranslation()
  const tira = useRef<HTMLDivElement>(null)
  const semanas = useMemo(() => {
    const base = inicioSemana(new Date())
    return Array.from({ length: ANTES + DESPUES + 1 }, (_, i) => {
      const ini = new Date(base)
      ini.setDate(ini.getDate() + (i - ANTES) * 7)
      return Array.from({ length: 7 }, (_, k) => { const d = new Date(ini); d.setDate(d.getDate() + k); return d })
    })
  }, [])
  const indiceDe = (d: Date) => {
    const i = semanas.findIndex((s) => s.some((x) => x.toDateString() === d.toDateString()))
    return i < 0 ? ANTES : i
  }
  const [visible, setVisible] = useState(() => indiceDe(selectedDate))

  // Al abrir, la tira queda en la semana del día elegido.
  useLayoutEffect(() => {
    const el = tira.current
    if (el) el.scrollLeft = indiceDe(selectedDate) * el.clientWidth
  }, [])

  function alDeslizar() {
    const el = tira.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== visible) setVisible(i)
  }

  // Arrastre con el mouse en computadora (en el celular desliza el dedo).
  const arrastre = useRef<{ x: number; left: number; movio: boolean } | null>(null)
  function bajar(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !tira.current) return
    arrastre.current = { x: e.clientX, left: tira.current.scrollLeft, movio: false }
  }
  function mover(e: React.PointerEvent) {
    const a = arrastre.current, el = tira.current
    if (!a || !el) return
    const dx = e.clientX - a.x
    if (Math.abs(dx) > 4) a.movio = true
    el.style.scrollSnapType = 'none'
    el.scrollLeft = a.left - dx
  }
  function soltar() {
    const a = arrastre.current, el = tira.current
    arrastre.current = null
    if (!a || !el) return
    const i = Math.max(0, Math.min(semanas.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    setTimeout(() => { el.style.scrollSnapType = '' }, 350)
    if (a.movio) { const frenar = (ev: Event) => { ev.stopPropagation(); ev.preventDefault() }; el.addEventListener('click', frenar, { capture: true, once: true }) }
  }

  // El mes que se muestra es el del día elegido si está a la vista; si no, el de la semana visible.
  const semana = semanas[visible] ?? semanas[ANTES]
  const referencia = semana.some((d) => d.toDateString() === selectedDate.toDateString()) ? selectedDate : semana[3]
  const monthYear = referencia.toLocaleDateString(localeDe(i18n.language), { month: 'long', year: 'numeric' })
  const hoy = new Date().toDateString()

  return (
    <div className="bg-surface-card rounded-card p-4 mb-2">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="text-white text-rt-15 font-bold capitalize">{monthYear}</div>
        {acciones && <div className="flex gap-2">{acciones}</div>}
      </div>

      <div className="flex mb-2 text-white/60 text-rt-12 font-semibold">
        {diasCortos(i18n.language).map((day, i) => (
          <div key={i} className="flex-1 text-center">{day}</div>
        ))}
      </div>

      <div
        ref={tira}
        onScroll={alDeslizar}
        onPointerDown={bajar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain select-none"
      >
        {semanas.map((dias, i) => (
          <div key={i} className="w-full shrink-0 snap-start flex gap-1">
            {dias.map((date) => {
              const selected = date.toDateString() === selectedDate.toDateString()
              const today = date.toDateString() === hoy
              const hasEvent = datesWithEvents.has(date.toDateString())
              return (
                <button
                  key={date.toDateString()}
                  onClick={() => onSelectDate(new Date(date))}
                  className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-md transition active:scale-95 ${
                    selected ? 'bg-brand' : today ? 'border-2 border-brand' : 'hover:bg-surface-input'
                  }`}
                >
                  <div className={`text-rt-14 font-bold ${selected ? 'text-white' : today ? 'text-brand' : 'text-white'}`}>{date.getDate()}</div>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasEvent ? (selected ? 'bg-white' : 'bg-brand') : 'bg-transparent'}`} />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
