import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { hoyLocal } from '@/lib/fechas'
import { ChevronDown, Info, X } from 'lucide-react'
import { COLOR_CLASE, type Clase } from '@/lib/evaluacionCalculos'

/** Formulario de edición a pantalla completa con Guardar fijo abajo (patrón del módulo 06). */
export function ModalEdicion({ titulo, subtitulo, guardando, error, onGuardar, onCerrar, children, extra }: {
  titulo: string; subtitulo?: string; guardando: boolean; error: string
  onGuardar: () => void; onCerrar: () => void; children: ReactNode; extra?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex items-start justify-between gap-3 px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-4">
        <div className="min-w-0">
          <h2 className="text-white text-rt-20 font-bold">{titulo}</h2>
          {subtitulo && <div className="text-[#8BC34A]/80 text-rt-13 mt-0.5">{subtitulo}</div>}
        </div>
        <button onClick={onCerrar} aria-label={t('close')} className="w-9 h-9 shrink-0 rounded-full bg-[#333333] flex items-center justify-center text-white">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-app mx-auto px-6 pb-6 flex flex-col gap-4">
          {children}
          {error && <p className="text-[#EF5350] text-rt-13" role="alert">{error}</p>}
        </div>
      </div>
      <div className="border-t border-[#2D2D2D] px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-app mx-auto">
          <button onClick={onGuardar} disabled={guardando}
            className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] shadow-[0_4px_12px_rgba(124,179,66,0.3)] text-white text-rt-16 font-bold flex items-center justify-center">
            {guardando ? <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : t('evaluacion:save')}
          </button>
        </div>
      </div>
      {extra}
    </div>
  )
}

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-white text-rt-13 font-semibold mb-1.5">{etiqueta}</div>
      {children}
    </div>
  )
}

export function Texto({ valor, onChange, placeholder, lista }: { valor: string; onChange: (v: string) => void; placeholder: string; lista?: string }) {
  return (
    <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={lista}
      className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none placeholder:text-grey-600" />
  )
}

export function AreaTexto({ valor, onChange, placeholder, filas = 3 }: { valor: string; onChange: (v: string) => void; placeholder: string; filas?: number }) {
  return (
    <textarea rows={filas} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none resize-none placeholder:text-grey-600" />
  )
}

export function Numero({ valor, onChange, sufijo, placeholder, entero = false }: { valor: string; onChange: (v: string) => void; sufijo?: string; placeholder: string; entero?: boolean }) {
  return (
    <div className="flex items-center h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus-within:border-[#7CB342]">
      <input inputMode={entero ? 'numeric' : 'decimal'} value={valor} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(entero ? /[^\d]/g : /[^\d.,]/g, ''))}
        className="flex-1 min-w-0 bg-transparent text-white text-rt-14 outline-none placeholder:text-grey-600" />
      {sufijo && <span className="text-white/50 text-rt-13 ml-2">{sufijo}</span>}
    </div>
  )
}

export function Selector({ valor, placeholder, onClick }: { valor: string; placeholder?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] flex items-center justify-between text-left">
      <span className={valor ? 'text-white text-rt-14' : 'text-grey-600 text-rt-14'}>{valor || placeholder}</span>
      <ChevronDown size={20} className="text-[#8BC34A]" />
    </button>
  )
}

export function CampoFecha({ valor, onChange, min }: { valor: string; onChange: (v: string) => void; min: string }) {
  return (
    <input type="date" value={valor} min={min} max={hoyLocal()} onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none [color-scheme:dark]" />
  )
}

export function CajaInfo({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-[12px] bg-[#8BC34A]/10 border border-[#8BC34A]/20 p-3 text-white/80 text-rt-12">
      <Info size={18} className="text-[#8BC34A] shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function InsigniaClase({ clase }: { clase: Clase }) {
  const { t } = useTranslation()
  const c = COLOR_CLASE[clase]
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-[12px] text-rt-11 font-semibold border" style={{ color: c, background: c + '26', borderColor: c + '4D' }}>
      {t(`evaluacion:clase.${clase}`)}
    </span>
  )
}

export function Vacio({ icono: Icono, texto, accion, onAccion }: { icono: typeof Info; texto: string; accion?: string; onAccion?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Icono size={48} className="text-white/30" />
      <p className="text-white/50 text-rt-14">{texto}</p>
      {accion && onAccion && (
        <button onClick={onAccion} className="text-[#8BC34A] text-rt-14 font-semibold mt-1">+ {accion}</button>
      )}
    </div>
  )
}
