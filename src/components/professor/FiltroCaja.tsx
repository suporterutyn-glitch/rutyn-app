import { ChevronDown } from 'lucide-react'

/** Caja de filtro compacta: muestra el valor elegido o la etiqueta si no hay. */
export function FiltroCaja({ etiqueta, valor, onClick }: { etiqueta: string; valor: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'flex-1 min-w-0 h-10 px-3 rounded-[12px] bg-[#252525] border flex items-center gap-1 ' + (valor ? 'border-brand' : 'border-[#333333]')}
    >
      <span className={'flex-1 truncate text-left text-rt-12 ' + (valor ? 'text-white' : 'text-[#757575]')}>{valor || etiqueta}</span>
      <ChevronDown size={16} className="text-[#757575] shrink-0" />
    </button>
  )
}
