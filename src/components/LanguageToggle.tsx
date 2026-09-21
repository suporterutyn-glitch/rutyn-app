import { useTranslation } from 'react-i18next'
import { setLang } from '@/lib/i18n'

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('es') ? 'es' : 'pt'
  const next = current === 'pt' ? 'es' : 'pt'
  const flag = current === 'pt' ? '🇧🇷' : '🇪🇸'
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="flex items-center gap-2 px-3 h-9 rounded-menu bg-surface-raised text-white text-rt-12 font-semibold transition active:scale-95"
      aria-label="Alternar idioma"
    >
      <span className="text-lg leading-none">{flag}</span>
      <span className="uppercase">{current}</span>
    </button>
  )
}
