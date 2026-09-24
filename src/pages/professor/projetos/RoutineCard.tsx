import { useRef, useState } from 'react'
import { ChevronLeft, Star, MoreVertical, EyeOff, BookmarkPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dificultades, objetivosTreino, etiquetaDe } from '@/lib/catalogos'

export type RoutineCardData = {
  id: string
  name: string
  objective: string | null
  difficulty: string | null
  is_favorite: boolean
}

const ANCHO_ACCIONES = 280

/**
 * Card de rotina con las acciones ocultas a la izquierda, como en el diseño:
 * el card se desliza y deja ver CLONAR / DUPLICAR / EDITAR / EXCLUIR.
 *
 * Usa Pointer Events en vez de Touch: así el mismo gesto funciona con el dedo
 * y con el mouse, y se puede probar sin un teléfono.
 */
export function RoutineCard({
  rotina,
  seleccionada,
  modoSeleccion,
  onToggleSeleccion,
  expandida,
  onExpandir,
  onFavorito,
  onClonar,
  onDuplicar,
  onEditar,
  onExcluir,
  deAlumno = false,
  progreso,
  oculta = false,
}: {
  rotina: RoutineCardData
  seleccionada: boolean
  modoSeleccion: boolean
  onToggleSeleccion: () => void
  expandida: boolean
  onExpandir: () => void
  onFavorito: () => void
  onClonar: () => void
  onDuplicar: () => void
  onEditar: () => void
  onExcluir: () => void
  /** En el perfil del alumno: REMOVER y 'salvar como modelo' en lugar de favorito. */
  deAlumno?: boolean
  progreso?: string
  oculta?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [dx, setDx] = useState(0)
  const [abierto, setAbierto] = useState(false)
  const inicio = useRef<{ x: number; y: number } | null>(null)
  const arrastrando = useRef(false)

  function onPointerDown(e: React.PointerEvent) {
    if (modoSeleccion) return
    inicio.current = { x: e.clientX, y: e.clientY }
    arrastrando.current = false
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!inicio.current) return
    const dxRaw = e.clientX - inicio.current.x
    const dyRaw = e.clientY - inicio.current.y
    // Solo tomamos el gesto si es claramente horizontal: si no, es scroll.
    if (!arrastrando.current) {
      if (Math.abs(dxRaw) < 8 || Math.abs(dxRaw) < Math.abs(dyRaw)) return
      arrastrando.current = true
    }
    const base = abierto ? -ANCHO_ACCIONES : 0
    setDx(Math.min(0, Math.max(-ANCHO_ACCIONES, base + dxRaw)))
  }
  function onPointerUp() {
    if (arrastrando.current) {
      const debeAbrir = dx < -ANCHO_ACCIONES / 3
      setAbierto(debeAbrir)
      setDx(debeAbrir ? -ANCHO_ACCIONES : 0)
    }
    inicio.current = null
  }
  function cerrar() {
    setAbierto(false)
    setDx(0)
  }
  function alternarAcciones() {
    const siguiente = !abierto
    setAbierto(siguiente)
    setDx(siguiente ? -ANCHO_ACCIONES : 0)
  }

  // En la base van los ids del catálogo; en pantalla, la etiqueta del idioma.
  const chips = [
    etiquetaDe(dificultades, rotina.difficulty, i18n.language),
    etiquetaDe(objetivosTreino, rotina.objective, i18n.language),
  ].filter(Boolean)

  return (
    <div className="relative overflow-hidden rounded-card">
      {/* Acciones detrás del card */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ANCHO_ACCIONES }}>
        <AccionSwipe label={t('projetos:rot.clone')} className="bg-grey-700" onClick={() => { cerrar(); onClonar() }} />
        <AccionSwipe label={t('projetos:rot.duplicate')} className="bg-grey-600" onClick={() => { cerrar(); onDuplicar() }} />
        <AccionSwipe label={t('projetos:rot.edit')} className="bg-grey-500" onClick={() => { cerrar(); onEditar() }} />
        <AccionSwipe label={deAlumno ? t('projetos:rot.remove') : t('projetos:rot.delete')} className="bg-[#D32F2F]" onClick={() => { cerrar(); onExcluir() }} />
      </div>

      <div
        className="relative card-dark px-3 py-3 flex items-center gap-3 touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: inicio.current ? 'none' : 'transform .2s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          onClick={onToggleSeleccion}
          aria-label={seleccionada ? t('projetos:c.unmark') : t('projetos:c.mark')}
          className={
            'w-7 h-7 rounded-[6px] border-2 shrink-0 flex items-center justify-center ' +
            (seleccionada ? 'bg-brand border-brand text-white' : 'border-grey-600')
          }
        >
          {seleccionada && <CheckIcon />}
        </button>

        <button type="button" onClick={() => (abierto ? cerrar() : onExpandir())} className="flex-1 min-w-0 text-left">
          <div className="text-white text-rt-15 font-bold truncate">{rotina.name}</div>
          {(chips.length > 0 || progreso || oculta) && (
            <div className="flex gap-1.5 mt-1 flex-wrap items-center">
              {chips.map((c) => (
                <span key={c} className="text-rt-10 px-2 py-0.5 rounded-tag bg-surface-raised text-white/70">{c}</span>
              ))}
              {progreso && <span className="text-[9px] font-bold px-2 py-0.5 rounded-tag bg-brand/20 text-brand">{progreso}</span>}
              {oculta && <EyeOff size={14} className="text-grey-500" aria-label={t('projetos:rot.hidden')} />}
            </div>
          )}
        </button>

        {deAlumno ? (
          <button type="button" onClick={onFavorito} aria-label={t('projetos:rot.saveAsTemplateLong')} title={t('projetos:rot.saveAsTemplate')} className="shrink-0 p-1">
            <BookmarkPlus size={21} className="text-brand" />
          </button>
        ) : (
          <button type="button" onClick={onFavorito} aria-label={t('projetos:c.favorite')} className="shrink-0 p-1">
            <Star size={22} className={rotina.is_favorite ? 'text-brand fill-brand' : 'text-brand'} />
          </button>
        )}
        {/* El swipe es el gesto del diseño, pero en la web no se descubre solo:
            los tres puntos abren las mismas acciones con un toque. */}
        <button
          type="button"
          onClick={alternarAcciones}
          aria-label={abierto ? t('projetos:rot.closeActions') : t('projetos:rot.openActions')}
          className="shrink-0 p-1"
        >
          <MoreVertical size={18} className={abierto ? 'text-brand' : 'text-grey-500'} />
        </button>
        <button
          type="button"
          onClick={onExpandir}
          aria-label={expandida ? t('projetos:rot.collapse') : t('projetos:rot.expand')}
          className="shrink-0 p-1"
        >
          <ChevronLeft size={20} className={'transition-transform ' + (expandida ? '-rotate-90 text-brand' : 'text-grey-500')} />
        </button>
      </div>
    </div>
  )
}

function AccionSwipe({ label, className, onClick }: { label: string; className: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'flex-1 text-white text-rt-11 font-bold tracking-[0.5px] ' + className}
    >
      {label}
    </button>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
