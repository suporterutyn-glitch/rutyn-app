type Props = { size?: number; className?: string }

export function RutynLogo({ size = 110, className = '' }: Props) {
  return (
    <div
      className={`rounded-full overflow-hidden bg-gradient-to-tr from-[#3A3A3A] to-[#050505] ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/images/logo-rutyn.png"
        alt="Rutyn"
        className="w-full h-full object-cover"
      />
    </div>
  )
}
