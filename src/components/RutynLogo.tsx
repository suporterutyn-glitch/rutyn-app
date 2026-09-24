type Props = { size?: number; className?: string }

/**
 * Sin `size` el tamaño lo pone el className (ej. `w-[21%] aspect-square`), que
 * es lo que necesitan las pantallas donde el logo escala con el ancho.
 */
export function RutynLogo({ size, className = '' }: Props) {
  return (
    <div
      className={`rounded-full overflow-hidden bg-gradient-to-tr from-[#3A3A3A] to-[#050505] ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src="/assets/images/logo-rutyn.png"
        alt="Rutyn"
        className="w-full h-full object-cover"
      />
    </div>
  )
}
