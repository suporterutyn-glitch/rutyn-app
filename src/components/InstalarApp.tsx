import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Smartphone, X, Share, PlusSquare, MoreVertical, Download } from 'lucide-react'
import { alCambiarInstalacion, esSafariIos, instalarDirecto, plataforma, puedeInstalarDirecto, yaInstalada } from '@/lib/instalacion'

const CLAVE = 'rutyn_instalar_oculto'

/** Tarjeta en la home: cómo instalar la app en el celular. No aparece si ya está instalada. */
export function InstalarApp() {
  const { t } = useTranslation()
  const [, refrescar] = useState(0)
  const [abierto, setAbierto] = useState(false)
  const [oculto, setOculto] = useState(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  useEffect(() => alCambiarInstalacion(() => refrescar((n) => n + 1)), [])

  const so = plataforma()
  if (oculto || yaInstalada() || so === 'otro') return null
  const directo = puedeInstalarDirecto()

  function ocultar() {
    try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento: vuelve a aparecer */ }
    setOculto(true)
  }

  async function principal() {
    if (directo) { await instalarDirecto(); return }
    setAbierto(true)
  }

  return (
    <>
      <div className="relative mb-5 rounded-card border border-brand/50 bg-brand/10 p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-[12px] bg-brand flex items-center justify-center shrink-0"><Smartphone size={22} className="text-white" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-white text-rt-14 font-bold">{t('general:install.title')}</div>
          <div className="text-white/70 text-rt-12">{t('general:install.subtitle')}</div>
        </div>
        <button onClick={() => void principal()} className="shrink-0 h-9 px-4 rounded-btn-pill bg-brand text-white text-rt-12 font-bold">
          {directo ? t('general:install.now') : t('general:install.how')}
        </button>
        <button onClick={ocultar} aria-label={t('general:install.hide')} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-raised border border-surface-line flex items-center justify-center">
          <X size={12} className="text-white/70" />
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-rt-18 font-bold">{t('general:install.title')}</h2>
              <button onClick={() => setAbierto(false)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('general:install.hide')}><X size={18} /></button>
            </div>

            {so === 'ios' && !esSafariIos() && (
              <div className="mb-4 p-3 rounded-lg bg-warning/15 border border-warning text-warning text-rt-12 font-semibold">{t('general:install.iosSafari')}</div>
            )}

            <ol className="flex flex-col gap-3">
              {(so === 'ios'
                ? [
                    { icon: Share, text: t('general:install.ios1') },
                    { icon: PlusSquare, text: t('general:install.ios2') },
                    { icon: Download, text: t('general:install.ios3') },
                  ]
                : [
                    { icon: MoreVertical, text: t('general:install.and1') },
                    { icon: Download, text: t('general:install.and2') },
                    { icon: PlusSquare, text: t('general:install.and3') },
                  ]
              ).map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3 rounded-[14px] bg-surface-raised p-3">
                  <span className="w-8 h-8 rounded-full bg-brand text-white text-rt-14 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-white text-rt-13">{text}</span>
                  <Icon size={20} className="text-brand shrink-0" />
                </li>
              ))}
            </ol>
            <p className="text-white/60 text-rt-12 mt-4">{t('general:install.after')}</p>
            <button onClick={() => setAbierto(false)} className="btn-save mt-4">{t('general:install.ok')}</button>
          </div>
        </div>
      )}
    </>
  )
}
