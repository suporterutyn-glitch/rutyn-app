import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export type SelectOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  title: string
  value: T | ''
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
}

export function SelectSheet<T extends string>({
  label,
  title,
  value,
  options,
  onChange,
  placeholder,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <div>
      <label className="block text-rt-11 text-ink-placeholder font-semibold">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="select-row w-full flex items-center justify-between border-b border-ink-underline py-3 text-left"
      >
        <span className={selected ? 'text-rt-13 text-ink-dark' : 'text-rt-13 text-ink-placeholder'}>
          {selected ? selected.label : placeholder ?? label}
        </span>
        <ChevronDown size={20} className="text-brand" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 popup-fondo bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="popup-caja bg-white pb-3 max-h-[75dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-rt-15 font-semibold text-ink-dark py-4">{title}</div>
            <ul>
              {options.map((o) => {
                const isSelected = o.value === value
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value)
                        setOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-6 py-3.5 text-left"
                    >
                      <span
                        className={
                          'text-rt-14 text-ink-dark ' + (isSelected ? 'font-semibold' : '')
                        }
                      >
                        {o.label}
                      </span>
                      {isSelected && <Check size={20} className="text-brand" />}
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
