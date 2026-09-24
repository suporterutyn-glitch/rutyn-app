import type { ReactNode } from 'react'

/**
 * El campo de las pantallas claras (prints 006/008/010 del módulo 01).
 * Tres estados, y los tres importan:
 *  - vacío: solo el placeholder gris, sin etiqueta, línea gris
 *  - con contenido: etiqueta chica en negrita arriba, valor debajo, línea verde
 *  - con error: línea roja y el mensaje en rojo debajo
 * La altura es fija y el contenido se alinea abajo, para que la línea no se
 * mueva cuando aparece la etiqueta.
 */
export function CampoUnderline({
  label,
  value,
  error,
  children,
  acessorio,
}: {
  label: string
  value: string
  error?: string | null
  children: ReactNode
  acessorio?: ReactNode
}) {
  const linea = error
    ? 'border-danger'
    : value
      ? 'border-brand'
      : 'border-ink-underline'

  return (
    <div>
      <div className={'relative h-[52px] flex flex-col justify-end border-b ' + linea}>
        {value && (
          <span className="text-rt-13 font-bold text-ink-dark leading-none mb-1">{label}</span>
        )}
        {children}
        {acessorio && <div className="absolute right-0 bottom-1.5">{acessorio}</div>}
      </div>
      {error && <div className="text-rt-13 text-danger mt-1">{error}</div>}
    </div>
  )
}
