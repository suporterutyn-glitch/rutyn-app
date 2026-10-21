import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setLang } from '@/lib/i18n'

const LANGS = ['pt', 'es', 'en'] as const
const FLAGS = { pt: '🇧🇷', es: '🇪🇸', en: '🇺🇸' }

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const [current, setCurrent] = useState<'pt' | 'es' | 'en'>(() => {
    const stored = localStorage.getItem('rutyn.lang')
    return (stored === 'pt' || stored === 'es' || stored === 'en') ? stored : 'pt'
  })

  useEffect(() => {
    const listener = () => {
      const stored = localStorage.getItem('rutyn.lang')
      const norm = (stored === 'pt' || stored === 'es' || stored === 'en') ? stored : 'pt'
      setCurrent(norm)
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }, [])

  useEffect(() => {
    const norm = i18n.language.startsWith('pt') ? 'pt' : i18n.language.startsWith('es') ? 'es' : i18n.language.startsWith('en') ? 'en' : 'pt'
    setCurrent(norm)
  }, [i18n.language])

  const handleClick = async () => {
    const stored = localStorage.getItem('rutyn.lang')
    const currentLang = (stored === 'pt' || stored === 'es' || stored === 'en') ? stored : 'pt'
    const idx = LANGS.indexOf(currentLang)
    const nextIdx = (idx + 1) % LANGS.length
    const next = LANGS[nextIdx]
    await setLang(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center transition active:scale-95"
      aria-label={t('general:ui.switchLang')}
      title={current.toUpperCase()}
    >
      <span className="text-xl leading-none">{FLAGS[current]}</span>
    </button>
  )
}
