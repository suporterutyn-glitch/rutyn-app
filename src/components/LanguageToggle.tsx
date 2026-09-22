import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setLang } from '@/lib/i18n'

const LANGS = ['pt', 'es', 'en'] as const
const FLAGS = { pt: '🇧🇷', es: '🇪🇸', en: '🇺🇸' }

export function LanguageToggle() {
  const { i18n } = useTranslation()
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
    if (norm !== current) {
      setCurrent(norm)
    }
  }, [i18n.language, current])

  const handleClick = () => {
    const idx = LANGS.indexOf(current)
    if (idx === -1) {
      setLang('es')
      return
    }
    const nextIdx = (idx + 1) % LANGS.length
    const next = LANGS[nextIdx]
    setLang(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 px-3 h-9 rounded-menu bg-surface-raised text-white text-rt-12 font-semibold transition active:scale-95"
      aria-label="Alternar idioma"
    >
      <span className="text-lg leading-none">{FLAGS[current]}</span>
      <span className="uppercase">{current}</span>
    </button>
  )
}
