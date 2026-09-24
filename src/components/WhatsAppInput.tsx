import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import { COUNTRIES, nombrePais, type Country } from '@/lib/countries'

type Props = {
  countryCode: string
  onCountry: (code: string) => void
  value: string
  onChange: (v: string) => void
  label?: string
  lang: string
  /**
   * 'light' = subrayado sobre tarjeta clara (cadastros).
   * 'dark' = caja oscura (app interna).
   * 'dark-underline' = subrayado sobre fondo oscuro (Meu Perfil).
   */
  variant?: 'light' | 'dark' | 'dark-underline'
}

export function WhatsAppInput({ countryCode, onCountry, value, onChange, label = 'WhatsApp', lang, variant = 'light' }: Props) {
  const { t } = useTranslation()
  const caja = variant === 'dark'
  const textoClaro = variant !== 'light'
  const [open, setOpen] = useState(false)
  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0]

  return (
    <div>
      <label className={'block text-rt-11 font-semibold ' + (textoClaro ? 'text-white/60 mb-1' : 'text-ink-placeholder')}>{label}</label>
      <div className={
        caja ? 'flex items-center gap-2 h-[52px] px-4 rounded-[12px] bg-surface-input border border-surface-line focus-within:border-brand'
          : textoClaro ? 'flex items-center gap-2 border-b border-brand py-2'
            : 'flex items-center gap-2 border-b border-ink-underline focus-within:border-brand py-2'}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={'flex items-center gap-1 text-rt-13 font-medium ' + (textoClaro ? 'text-white' : 'text-ink-dark')}
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
          className={'flex-1 bg-transparent outline-none text-rt-13 ' + (textoClaro ? 'text-white placeholder:text-grey-600' : 'text-ink-dark placeholder:text-[#CCCCCC]')}
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
                  {t('settings:chooseCountry')}
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
                  <span className="flex-1 text-rt-14">{nombrePais(c, lang)}</span>
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
