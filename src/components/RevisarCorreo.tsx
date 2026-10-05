import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { sugerirCorreo } from '@/lib/correo'

/**
 * Antes de registrar, frena una vez si el correo parece mal escrito ("gmail.gom") y propone el correcto.
 * `revisar(correo)` devuelve true si se puede seguir. Si el usuario elige la corrección o confirma que
 * su correo está bien, se llama `seguir` para reintentar el envío.
 */
export function useRevisarCorreo(ponerCorreo: (c: string) => void, seguir: () => void) {
  const { t } = useTranslation()
  const [duda, setDuda] = useState<{ escrito: string; sugerido: string } | null>(null)
  const aceptado = useRef<string | null>(null)

  function revisar(correo: string) {
    const escrito = correo.trim().toLowerCase()
    const sugerido = sugerirCorreo(escrito)
    if (!sugerido || aceptado.current === escrito) return true
    setDuda({ escrito, sugerido })
    return false
  }

  const cerrar = (correo: string) => {
    aceptado.current = correo
    ponerCorreo(correo)
    setDuda(null)
    setTimeout(seguir, 60) // deja que el formulario tome el correo antes de reenviar
  }

  const dialogo = duda && (
    <ConfirmDialog
      message={t('general:emailCheck.title')}
      detail={t('general:emailCheck.detail', { typed: duda.escrito, fixed: duda.sugerido })}
      confirmLabel={t('general:emailCheck.use', { fixed: duda.sugerido.split('@')[1] })}
      cancelLabel={t('general:emailCheck.edit')}
      onConfirm={() => cerrar(duda.sugerido)}
      // Cancelar o tocar afuera solo cierra: el usuario corrige a mano. Nunca sigue con el correo dudoso sin querer.
      onCancel={() => setDuda(null)}
    >
      <button type="button" onClick={() => cerrar(duda.escrito)} className="w-full text-center text-white/70 underline text-rt-12">
        {t('general:emailCheck.keep')}
      </button>
    </ConfirmDialog>
  )
  return { revisar, dialogo }
}
