import { useTranslation } from 'react-i18next'
import { setLang } from '@/lib/i18n'

const LANGS = ['pt', 'es', 'en'] as const

/** Los tres idiomas a la vista (igual que en la landing), para las pantallas sin sesión. */
export function SelectorIdioma({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const actual = LANGS.find((l) => i18n.language.startsWith(l)) ?? 'pt'
  return (
    <div className={'flex gap-0.5 p-[3px] rounded-full border border-white/20 ' + className}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => void setLang(l)}
          aria-pressed={l === actual}
          className={'px-2.5 py-1.5 rounded-full text-rt-12 font-semibold leading-none uppercase transition ' + (l === actual ? 'bg-brand text-black' : 'text-white/70')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
