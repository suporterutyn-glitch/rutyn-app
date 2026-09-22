import { useTranslation } from 'react-i18next'
import { setLang } from '@/lib/i18n'

const LANGS = ['pt', 'es', 'en'] as const
const FLAGS = { pt: '🇧🇷', es: '🇪🇸', en: '🇺🇸' }

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = (localStorage.getItem('rutyn.lang') || i18n.language) as any
  const currentNorm = current.startsWith('pt') ? 'pt' : current.startsWith('es') ? 'es' : current.startsWith('en') ? 'en' : 'pt'
  const idx = LANGS.indexOf(currentNorm)
  const nextIdx = (idx + 1) % LANGS.length
  const next = LANGS[nextIdx]

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="flex items-center gap-2 px-3 h-9 rounded-menu bg-surface-raised text-white text-rt-12 font-semibold transition active:scale-95"
      aria-label="Alternar idioma"
    >
      <span className="text-lg leading-none">{FLAGS[currentNorm]}</span>
      <span className="uppercase">{currentNorm}</span>
    </button>
  )
}
