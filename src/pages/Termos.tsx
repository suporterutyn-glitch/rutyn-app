import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Globe, Mail } from 'lucide-react'
import { RutynLogo } from '@/components/RutynLogo'
import { terminosEs } from '@/lib/terminos'

export function TermosPage() {
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const esEspanol = i18n.language.startsWith('es')

  return (
    <div className="min-h-dvh bg-[#1E1E1E] flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-5">
        <button onClick={() => nav(-1)} aria-label={t('back')} className="text-white">
          <ChevronLeft size={32} />
        </button>
        <h1 className="flex-1 text-center text-white font-bold text-rt-20">Rutyn App</h1>
        <RutynLogo size={44} />
      </header>

      <div className="flex-1 bg-white rounded-t-[28px] px-6 py-8">
        <h2 className="text-center text-black font-black text-rt-22 leading-tight mb-6">
          {t('terms:title')}
        </h2>

        {!esEspanol && (
          <p className="text-rt-11 text-ink-muted bg-grey-100 border border-grey-300 rounded-[12px] px-3 py-2 mb-6">
            {t('terms:onlySpanish')}
          </p>
        )}

        <div className="flex flex-col">
          {terminosEs.map((b, i) => {
            if (b.tag === 'h') {
              return (
                <h3 key={i} className="text-black font-extrabold text-rt-16 uppercase mt-6 mb-2">
                  {b.text}
                </h3>
              )
            }
            if (b.tag === 'li') {
              return (
                <div key={i} className="flex items-start gap-2 pl-1 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span className="text-rt-13 text-ink-dark leading-[1.6]">{b.text}</span>
                </div>
              )
            }
            return (
              <p
                key={i}
                className={
                  'text-rt-13 text-ink-dark leading-[1.6] mb-2 ' +
                  (b.tag === 'intro' ? 'font-semibold' : '')
                }
              >
                {b.text}
              </p>
            )
          })}
        </div>

        <div className="mt-8 rounded-[12px] bg-grey-100 border border-grey-300 p-4 flex flex-col gap-3">
          <a href="mailto:suporte.rutyn@gmail.com" className="flex items-center gap-2">
            <Mail size={18} className="text-brand shrink-0" />
            <span className="text-rt-13 text-[#1565C0] underline break-all">
              suporte.rutyn@gmail.com
            </span>
          </a>
          <a
            href="https://www.rutyn.com.br"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <Globe size={18} className="text-brand shrink-0" />
            <span className="text-rt-13 text-[#1565C0] underline">www.rutyn.com.br</span>
          </a>
        </div>
      </div>
    </div>
  )
}
