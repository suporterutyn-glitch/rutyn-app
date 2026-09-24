import { useState, type ReactNode } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'

/**
 * Reemplaza a confirm() del navegador, que se ve como una alerta del sistema
 * y no como la app. Mismo lenguaje visual que FeedbackDialog.
 *
 * `tone` 'danger' para lo que no tiene vuelta atrás (remover, excluir cuenta).
 */
export function ConfirmDialog({
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'normal',
  children,
  onConfirm,
  onCancel,
}: {
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'normal' | 'danger'
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  const peligro = tone === 'danger'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8" onClick={onCancel}>
      <div
        className="w-full max-w-[350px] rounded-[16px] bg-[#2D2D2D] border border-grey-700 px-6 pt-7 pb-5"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
      >
        <div className="flex justify-center">
          {peligro ? (
            <AlertTriangle size={56} className="text-[#E53935]" />
          ) : (
            <HelpCircle size={56} className="text-brand" />
          )}
        </div>
        <p className="text-center text-white text-rt-15 font-medium leading-[1.4] mt-4">{message}</p>
        {detail && <p className="text-center text-white/60 text-rt-12 leading-[1.4] mt-2">{detail}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-[22px] border border-grey-700 text-white/80 text-rt-14 font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              'flex-1 h-11 rounded-[22px] text-white text-rt-14 font-semibold ' +
              (peligro ? 'bg-[#E53935]' : 'bg-brand')
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** confirm() + prompt() en un solo paso: el motivo es opcional. */
export function ConfirmConMotivo({
  message,
  detail,
  placeholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  message: string
  detail?: string
  placeholder: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (motivo: string) => void
  onCancel: () => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <ConfirmDialog
      message={message}
      detail={detail}
      tone="danger"
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => onConfirm(motivo.trim())}
      onCancel={onCancel}
    >
      <input
        className="input-dark"
        placeholder={placeholder}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        autoFocus
      />
    </ConfirmDialog>
  )
}
