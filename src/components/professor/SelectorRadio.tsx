import { type Catalogo, etiqueta } from '@/lib/catalogos'
import { ChevronDown } from 'lucide-react'

/**
 * Caja con etiqueta y chevron que abre una hoja de opciones con radios,
 * como los selectores de Dificuldade y Objetivo (capturas 043 y 044).
 */
export function CajaSelector({ label, valor, placeholder, lista, lang, onAbrir }: {
  label: string
  valor: string
  placeholder: string
  lista: Catalogo[]
  lang: string
  onAbrir: () => void
}) {
  const elegido = lista.find((x) => x.id === valor)
  return (
    <div>
      <label className="block text-white text-rt-15 font-bold mb-2">{label}</label>
      <button
        type="button"
        onClick={onAbrir}
        className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line flex items-center justify-between text-left"
      >
        <span className={elegido ? 'text-white text-rt-15' : 'text-grey-500 text-rt-15'}>
          {elegido ? etiqueta(elegido, lang) : placeholder}
        </span>
        <ChevronDown size={20} className="text-grey-500 shrink-0" />
      </button>
    </div>
  )
}

export function HojaRadio({ lista, valor, lang, onElegir, onCerrar }: {
  lista: Catalogo[]
  valor: string
  lang: string
  onElegir: (id: string) => void
  onCerrar: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] popup-fondo bg-black/60" onClick={onCerrar}>
      <div
        className="popup-caja bg-surface-raised py-2 max-h-[75dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="flex flex-col">
          {lista.map((o) => {
            const on = o.id === valor
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onElegir(o.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left"
                >
                  <span className={
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ' +
                    (on ? 'border-brand' : 'border-grey-500')
                  }>
                    {on && <span className="w-3 h-3 rounded-full bg-brand" />}
                  </span>
                  <span className={'text-rt-16 ' + (on ? 'text-white font-bold' : 'text-white/85')}>
                    {etiqueta(o, lang)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
