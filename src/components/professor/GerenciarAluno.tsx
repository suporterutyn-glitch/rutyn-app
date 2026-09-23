import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'

type Props = {
  nome: string
  suspenso: boolean
  onSuspender: () => void
  onReativar: () => void
  onExcluir: () => void
  onClose: () => void
}

/** Menú de acciones administrativas del alumno (módulo 05, prints 021 y 022). */
export function GerenciarAlunoDialog({ nome, suspenso, onSuspender, onReativar, onExcluir, onClose }: Props) {
  const { t } = useTranslation()
  const [confirmando, setConfirmando] = useState<'suspender' | 'excluir' | null>(null)

  const pill = 'w-full rounded-[25px] py-3.5 text-rt-14 font-semibold'

  if (confirmando) {
    const esExcluir = confirmando === 'excluir'
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8" onClick={onClose}>
        <div
          className="w-full max-w-[350px] rounded-[20px] bg-[#2D2D2D] p-6 text-center"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
        >
          <p className="text-white text-rt-15 leading-[1.4] mb-6">
            {t(esExcluir ? 'students:manage.confirmDelete' : 'students:manage.confirmSuspend', { name: nome })}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => (esExcluir ? onExcluir() : onSuspender())}
              className={pill + (esExcluir ? ' bg-[#F44336] text-white' : ' bg-warning text-white')}
            >
              {t('confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className={pill + ' border-2 border-brand text-brand'}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8" onClick={onClose}>
      <div
        className="w-full max-w-[350px] rounded-[20px] bg-[#2D2D2D] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex justify-center">
          <div className="w-[60px] h-[60px] rounded-full bg-brand/15 flex items-center justify-center">
            <Settings size={32} className="text-brand" />
          </div>
        </div>

        <h2 className="text-white text-rt-18 font-bold mt-4">{t('students:manage.title')}</h2>
        <p className="text-brand text-rt-14 font-semibold mt-1">{nome}</p>

        <div className="flex flex-col gap-3 mt-5">
          {suspenso ? (
            <button type="button" onClick={onReativar} className={pill + ' bg-brand text-white'}>
              {t('students:manage.reactivate')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando('suspender')}
              className={pill + ' bg-warning text-white'}
            >
              {t('students:manage.suspend')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmando('excluir')}
            className={pill + ' bg-[#F44336] text-white'}
          >
            {t('students:manage.delete')}
          </button>

          <button type="button" onClick={onClose} className={pill + ' border-2 border-brand text-brand'}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
