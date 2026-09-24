import { Droplet } from 'lucide-react'

/**
 * Vaso de hidratación del diseño: el relleno sube con el porcentaje y el
 * número va encima. La barra fina anterior no comunicaba nada de un vistazo.
 */
export function VasoAgua({ pct }: { pct: number }) {
  return (
    <div className="relative w-[72px] h-[104px] shrink-0 rounded-[14px] border border-info/30 bg-black/40 overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 bg-water transition-[height] duration-500"
        style={{ height: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-rt-16 font-bold drop-shadow">{pct}%</span>
      </div>
    </div>
  )
}

export function DialogHidratacion({ titulo, cuerpo, onClose }: {
  titulo: string; cuerpo: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8" onClick={onClose}>
      <div
        className="w-full max-w-[350px] rounded-[16px] bg-[#3A3A3A] px-6 pt-7 pb-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
      >
        <div className="flex justify-center">
          <div className="w-[70px] h-[70px] rounded-full bg-water flex items-center justify-center">
            <Droplet size={34} className="text-white fill-white" />
          </div>
        </div>
        <p className="text-center text-white text-rt-20 font-bold mt-4">{titulo}</p>
        <p className="text-center text-white/80 text-rt-13 leading-[1.5] mt-2 whitespace-pre-line">{cuerpo}</p>
        <button type="button" onClick={onClose} className="block ml-auto mt-5 px-4 py-2 text-info-light text-rt-15 font-semibold">
          Ok
        </button>
      </div>
    </div>
  )
}

/** Avatar del header: foto si existe, si no la inicial sobre el anillo verde. */
export function AvatarAluno({ url, nombre }: { url: string | null | undefined; nombre: string }) {
  return (
    <div className="w-12 h-12 rounded-full border-[2.5px] border-brand overflow-hidden shrink-0 bg-alert-teal flex items-center justify-center">
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <span className="text-white text-rt-20 font-bold">{(nombre[0] ?? '?').toUpperCase()}</span>}
    </div>
  )
}
