import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

type Opcion = { id: string; label: string }

function Manija() {
  return (
    <div className="flex justify-center pt-3">
      <span className="w-10 h-1 rounded-full bg-grey-500" />
    </div>
  )
}

/** Seletor escuro de opção única, con búsqueda opcional para listas largas. */
export function DarkSelectSheet({
  label,
  title,
  value,
  options,
  onChange,
  searchable = false,
  placeholder,
}: {
  label: string
  title: string
  value: string
  options: Opcion[]
  onChange: (id: string) => void
  searchable?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = options.find((o) => o.id === value)
  const visibles = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  return (
    <div>
      <label className="block text-rt-11 text-grey-400 font-semibold mb-1">{label}</label>
      <button
        type="button"
        onClick={() => { setQ(''); setOpen(true) }}
        className="w-full flex items-center justify-between input-dark text-left"
      >
        <span className={selected ? 'text-white' : 'text-grey-500'}>
          {selected ? selected.label : placeholder ?? '—'}
        </span>
        <ChevronDown size={20} className="text-brand shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-app mx-auto bg-[#1E1E1E] rounded-t-[16px] flex flex-col"
            style={{ height: searchable ? '65dvh' : undefined, maxHeight: '70dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Manija />
            <div className="text-center text-white font-bold text-rt-16 p-4">{title}</div>

            {searchable && (
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2 rounded-[12px] bg-[#252525] border border-[#333333] focus-within:border-brand px-3 h-11">
                  <Search size={20} className="text-brand shrink-0" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-white text-rt-14 outline-none placeholder:text-grey-500"
                  />
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+12px)]">
              {visibles.length === 0 && (
                <li className="text-center text-rt-13 text-grey-500 py-6">Nenhum dado encontrado</li>
              )}
              {visibles.map((o) => {
                const sel = o.id === value
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => { onChange(o.id); setOpen(false) }}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left"
                    >
                      <span
                        className={
                          'w-5 h-5 rounded-full border-2 shrink-0 ' +
                          (sel ? 'border-brand' : 'border-grey-700')
                        }
                      >
                        {sel && <span className="block w-2.5 h-2.5 rounded-full bg-brand m-[3px]" />}
                      </span>
                      <span className={'text-rt-14 ' + (sel ? 'text-brand font-semibold' : 'text-white')}>
                        {o.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

/** Seletor múltiplo con checkboxes y botón Confirmar. */
export function DarkMultiSheet({
  label,
  title,
  values,
  options,
  onChange,
  confirmLabel,
}: {
  label: string
  title: string
  values: string[]
  options: Opcion[]
  onChange: (ids: string[]) => void
  confirmLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(values)
  const elegidos = options.filter((o) => values.includes(o.id)).map((o) => o.label)

  function abrir() {
    setDraft(values)
    setOpen(true)
  }

  function alternar(id: string) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))
  }

  return (
    <div>
      <label className="block text-rt-11 text-grey-400 font-semibold mb-1">{label}</label>
      <button type="button" onClick={abrir} className="w-full flex items-center justify-between input-dark text-left">
        <span className={elegidos.length ? 'text-white' : 'text-grey-500'}>
          {elegidos.length ? elegidos.join(', ') : '—'}
        </span>
        <ChevronDown size={20} className="text-brand shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-app mx-auto bg-[#1E1E1E] rounded-t-[16px] flex flex-col max-h-[70dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Manija />
            <div className="text-center text-white font-bold text-rt-16 p-4">{title}</div>

            <ul className="flex-1 overflow-y-auto">
              {options.map((o) => {
                const marcado = draft.includes(o.id)
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => alternar(o.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left"
                    >
                      <span
                        className={
                          'w-5 h-5 rounded-[4px] border-2 shrink-0 flex items-center justify-center ' +
                          (marcado ? 'bg-brand border-brand' : 'border-grey-600')
                        }
                      >
                        {marcado && <span className="block w-2 h-2 bg-white rounded-[1px]" />}
                      </span>
                      <span className="text-rt-14 text-white">{o.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <button
                type="button"
                onClick={() => { onChange(draft); setOpen(false) }}
                className="w-full h-12 rounded-[24px] bg-gradient-to-r from-[#91C145] to-[#5A8F2F] text-white text-rt-14 font-bold"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
