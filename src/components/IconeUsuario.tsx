/**
 * El ícono de los botones de identificación: aro blanco con la persona maciza
 * adentro. `lucide` solo trae la versión de contorno, y en la captura la figura
 * está rellena, así que va a mano.
 */
export function IconeUsuario({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="16" cy="16" r="14.6" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="16" cy="12.6" r="4.9" fill="currentColor" />
      <path
        d="M16 18.6c-4.3 0-7.8 2.5-8.6 5.9a14.5 14.5 0 0 0 17.2 0c-.8-3.4-4.3-5.9-8.6-5.9Z"
        fill="currentColor"
      />
    </svg>
  )
}
