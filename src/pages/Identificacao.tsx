import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { RutynLogo } from '@/components/RutynLogo'
import { OfflineBanner } from '@/components/OfflineBanner'
import { IconeUsuario } from '@/components/IconeUsuario'

/**
 * Prints 003/004/005 del módulo 01. Las medidas salen de la captura y van en
 * proporciones: el logo y los botones ocupan un porcentaje del ancho, y los
 * espacios verticales van en dvh, porque en la captura la pantalla queda con
 * casi un tercio vacío abajo y con px fijos eso se rompe en cada teléfono.
 */
export function IdentificacaoPage() {
  const nav = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <OfflineBanner />
      <div className="relative z-10 flex flex-col min-h-dvh pt-[calc(env(safe-area-inset-top)+15.6dvh)] pb-[27dvh]">
        <div className="flex flex-col items-center">
          <RutynLogo className="w-[21%] aspect-square" />
          <h1 className="text-white font-bold text-rt-22 tracking-tight text-center mt-[2.4dvh]">
            {t('identification:welcome')}
          </h1>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center">
          <button
            className="w-[66%] h-[50px] rounded-[50px] bg-brand-v shadow-btn text-white font-bold text-rt-17 flex items-center px-4 transition active:scale-[0.98]"
            onClick={() => nav('/cadastro/professor')}
          >
            <IconeUsuario size={30} />
            <span className="flex-1 text-center">{t('identification:imTeacher')}</span>
            <span className="w-[30px]" />
          </button>

          <button
            className="w-[66%] h-[50px] rounded-[50px] border-[1.5px] border-white bg-transparent text-white font-semibold text-rt-17 flex items-center px-4 mt-[2dvh] transition active:scale-[0.98]"
            onClick={() => nav('/cadastro/aluno')}
          >
            <IconeUsuario size={30} />
            <span className="flex-1 text-center">{t('identification:imStudent')}</span>
            <span className="w-[30px]" />
          </button>

          <div className="mt-[3.5dvh]">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
