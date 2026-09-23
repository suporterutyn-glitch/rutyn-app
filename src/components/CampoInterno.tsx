import type { ReactNode } from 'react'

/**
 * Caja con la etiqueta adentro: en reposo solo se ve el marcador de posición,
 * y al haber valor la etiqueta sube en pequeño y verde sobre el contenido.
 * Es el patrón de "Complete seu perfil" (módulo 04, print 029).
 */
export function CampoInterno({
  label,
  filled,
  children,
  className = '',
}: {
  label: string
  filled: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={
        'w-full rounded-[12px] bg-surface-input border border-surface-line focus-within:border-brand px-4 ' +
        (filled ? 'pt-2 pb-2.5' : 'py-3.5') +
        ' ' +
        className
      }
    >
      {filled && <div className="text-brand text-rt-11 font-medium mb-0.5">{label}</div>}
      {children}
    </div>
  )
}

/** Entrada de texto con la etiqueta adentro. */
export function InputInterno({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <CampoInterno label={label} filled={!!value}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={value ? '' : label}
        className="w-full bg-transparent outline-none text-white text-rt-15 placeholder:text-grey-500"
      />
    </CampoInterno>
  )
}
