import type { ReactNode } from 'react'

/**
 * Los diálogos de estado de cuenta del módulo 01 (prints 021 a 024): tarjeta
 * clara sobre el fondo oscuro, ícono en círculo de color, título, texto y
 * acciones. Se usa para aguardando, suspenso, removido y assinatura expirada.
 */
export function DialogoEstado({
  icono,
  tonoIcono,
  titulo,
  tituloEnLinea = false,
  destacado,
  cuerpo,
  children,
  acciones,
}: {
  icono: ReactNode
  /** Color del círculo detrás del ícono. */
  tonoIcono: 'rojo' | 'naranja' | 'verde'
  titulo: string
  /** true = ícono y título en una fila (prints 021 y 024). */
  tituloEnLinea?: boolean
  destacado?: string
  cuerpo?: string
  children?: ReactNode
  acciones: ReactNode
}) {
  const fondo = tonoIcono === 'rojo' ? 'bg-[#FADBD8]'
    : tonoIcono === 'naranja' ? 'bg-[#FDEBD0]'
      : 'bg-brand/15'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6 bg-black/60">
      <div className="w-full max-w-[400px] rounded-[20px] bg-[#EDEDE6] px-6 py-7 max-h-[85dvh] overflow-y-auto">
        {tituloEnLinea ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="shrink-0">{icono}</span>
            <h2 className="text-grey-900 text-rt-20 font-semibold">{titulo}</h2>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className={'w-[74px] h-[74px] rounded-full flex items-center justify-center ' + fondo}>
                {icono}
              </span>
            </div>
            <h2 className="text-grey-900 text-rt-22 font-bold text-center mt-4">{titulo}</h2>
          </>
        )}

        {destacado && (
          <p className={'text-grey-900 text-rt-15 font-bold leading-[1.4] mt-3 ' + (tituloEnLinea ? '' : 'text-center')}>
            {destacado}
          </p>
        )}
        {cuerpo && (
          <p className={'text-grey-600 text-rt-14 leading-[1.5] mt-3 ' + (tituloEnLinea ? '' : 'text-center')}>
            {cuerpo}
          </p>
        )}

        {children}

        <div className="mt-6 flex flex-col gap-3">{acciones}</div>
      </div>
    </div>
  )
}

export function BotonVerde({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full h-[52px] rounded-btn-pill bg-brand text-white text-rt-15 font-bold flex items-center justify-center gap-2">
      {children}
    </button>
  )
}

export function BotonWhatsapp({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full h-[52px] rounded-btn-pill bg-whatsapp text-white text-rt-15 font-bold flex items-center justify-center gap-2">
      {children}
    </button>
  )
}

export function BotonSuave({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full h-[52px] rounded-btn-pill border border-grey-300 text-grey-600 text-rt-15">
      {children}
    </button>
  )
}

export function EnlaceTexto({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-grey-600 text-rt-14 underline">
      {children}
    </button>
  )
}
