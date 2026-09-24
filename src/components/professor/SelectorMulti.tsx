import { useTranslation } from 'react-i18next'
import { type Catalogo, etiqueta } from '@/lib/catalogos'
import { ChevronDown, X } from 'lucide-react'

/** Caja que muestra los elegidos y abre una hoja con casillas. */
export function CajaMulti({ label, valores, placeholder, lista, lang, onAbrir }: {
  label: string
  valores: string[]
  placeholder: string
  lista: Catalogo[]
  lang: string
  onAbrir: () => void
}) {
  const elegidos = lista.filter((x) => valores.includes(x.id))
  return (
    <div>
      <label className="block text-white text-rt-15 font-bold mb-2">{label}</label>
      <button
        type="button"
        onClick={onAbrir}
        className="w-full min-h-[60px] px-4 py-3 rounded-[14px] bg-surface-input border border-surface-line flex items-center justify-between gap-2 text-left"
      >
        {elegidos.length === 0 ? (
          <span className="text-grey-500 text-rt-15">{placeholder}</span>
        ) : (
          <span className="flex flex-wrap gap-1.5 flex-1">
            {elegidos.map((e) => (
              <span key={e.id} className="text-rt-11 px-2 py-1 rounded-btn-pill bg-brand/20 text-brand">
                {etiqueta(e, lang)}
              </span>
            ))}
          </span>
        )}
        <ChevronDown size={20} className="text-grey-500 shrink-0" />
      </button>
    </div>
  )
}

export function HojaMulti({ titulo, lista, valores, lang, onCambiar, onCerrar }: {
  titulo: string
  lista: Catalogo[]
  valores: string[]
  lang: string
  onCambiar: (ids: string[]) => void
  onCerrar: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div
        className="w-full max-w-app rounded-t-[20px] bg-surface-raised px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] max-h-[70dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-rt-16 font-bold">{titulo}</h2>
          <button onClick={onCerrar} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('projetos:ser.close')}>
            <X size={18} />
          </button>
        </div>
        <ul className="flex flex-col">
          {lista.map((o) => {
            const on = valores.includes(o.id)
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onCambiar(on ? valores.filter((x) => x !== o.id) : [...valores, o.id])}
                  className="w-full flex items-center gap-3 py-3 border-b border-surface-line last:border-0 text-left"
                >
                  <span className={
                    'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 text-rt-12 ' +
                    (on ? 'bg-brand border-brand text-white' : 'border-grey-600')
                  }>
                    {on && '✓'}
                  </span>
                  <span className="flex-1 text-white text-rt-14">{etiqueta(o, lang)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <button onClick={onCerrar} className="btn-save mt-5">{t('projetos:ser.done')}</button>
      </div>
    </div>
  )
}
