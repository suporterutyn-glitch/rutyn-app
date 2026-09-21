import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { COUNTRIES, type Country } from '@/lib/countries'

type Props = {
  countryCode: string
  onCountry: (code: string) => void
  value: string
  onChange: (v: string) => void
  label?: string
  lang: 'pt' | 'es'
}

export function WhatsAppInput({ countryCode, onCountry, value, onChange, label = 'WhatsApp', lang }: Props) {
  const [open, setOpen] = useState(false)
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0]

  return (
    <div>
      <label className="block text-rt-11 text-ink-placeholder font-semibold">{label}</label>
      <div className="flex items-center gap-2 border-b border-ink-underline focus-within:border-brand py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-ink-dark text-rt-13 font-medium"
        >
          <span className="text-xl leading-none">{country.flag}</span>
          <span>{country.dial}</span>
          <ChevronDown size={20} className="text-brand" />
        </button>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, country.digits))}
          className="flex-1 bg-transparent outline-none text-ink-dark text-rt-13 placeholder:text-[#CCCCCC]"
          placeholder={country.mask}
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-app mx-auto bg-white rounded-t-card max-h-[70dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white pt-3 pb-2 flex flex-col items-center border-b border-grey-200">
              <div className="w-10 h-1 rounded-full bg-grey-300" />
              <div className="flex w-full items-center justify-between px-4 mt-2">
                <span className="text-rt-16 font-bold text-black/90">
                  {lang === 'pt' ? 'Selecionar País' : 'Seleccionar País'}
                </span>
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-grey-200 flex items-center justify-center">
                  <X size={16} className="text-black/70" />
                </button>
              </div>
            </div>
            <ul>
              {COUNTRIES.map((c: Country) => (
                <li
                  key={c.code}
                  className={
                    'flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-grey-100 ' +
                    (c.code === country.code ? 'text-brand font-bold' : 'text-black/80')
                  }
                  onClick={() => {
                    onCountry(c.code)
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <span className="text-2xl leading-none">{c.flag}</span>
                  <span className="flex-1 text-rt-14">{lang === 'pt' ? c.name_pt : c.name_es}</span>
                  <span className="text-rt-12 text-grey-600">{c.dial}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
