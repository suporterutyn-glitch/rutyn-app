import { AlertCircle, CheckCircle2 } from 'lucide-react'

/** Dialog de feedback de validación (error) o confirmación (éxito). */
export function FeedbackDialog({
  kind,
  message,
  onClose,
}: {
  kind: 'error' | 'success'
  message: string
  onClose: () => void
}) {
  const esError = kind === 'error'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8" onClick={onClose}>
      <div
        className="w-full rounded-[16px] bg-[#2D2D2D] border border-grey-700 px-6 pt-7 pb-5"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
      >
        <div className="flex justify-center">
          {esError ? (
            <AlertCircle size={56} className="text-[#E53935]" />
          ) : (
            <CheckCircle2 size={56} className="text-brand" />
          )}
        </div>
        <p className="text-center text-white text-rt-15 font-medium leading-[1.4] mt-4">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={
            'w-full h-11 rounded-[22px] text-white text-rt-14 font-semibold mt-6 ' +
            (esError ? 'bg-[#E53935]' : 'bg-brand')
          }
        >
          OK
        </button>
      </div>
    </div>
  )
}
