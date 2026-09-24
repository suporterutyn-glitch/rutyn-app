import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { countryByCode } from '@/lib/countries'

type Teacher = {
  full_name: string | null
  bank_holder: string | null
  bank_name: string | null
  bank_agency: string | null
  bank_account: string | null
  bank_account_type: string | null
  pix_key_type: string | null
  pix_key: string | null
  country: string | null
}

/**
 * Los datos para pagar al profesor. El alumno paga fuera de la app, así que
 * cada dato tiene su botón de copiar: es lo único que hace con ellos.
 *
 * PIX solo aparece donde existe (Brasil); ver `pix` en lib/countries.
 */
export function DadosProfessorSheet({ teacherId, textos, onClose }: {
  teacherId: string
  textos: {
    titulo: string; banco: string; agencia: string; conta: string; tipoConta: string
    tipoChave: string; chavePix: string; sinDatos: string; copiado: string
  }
  onClose: () => void
}) {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [cargando, setCargando] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name,bank_holder,bank_name,bank_agency,bank_account,bank_account_type,pix_key_type,pix_key,country')
        .eq('id', teacherId)
        .maybeSingle()
      setTeacher(data as Teacher | null)
      setCargando(false)
    })()
  }, [teacherId])

  async function copiar(valor: string, campo: string) {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(campo)
      setTimeout(() => setCopiado(null), 1500)
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: el dato está a la vista.
    }
  }

  const usaPix = countryByCode(teacher?.country ?? 'BR')?.pix ?? false
  const filas: { label: string; valor: string | null }[] = teacher
    ? [
      { label: textos.banco, valor: teacher.bank_name },
      { label: textos.agencia, valor: teacher.bank_agency },
      { label: textos.conta, valor: teacher.bank_account },
      { label: textos.tipoConta, valor: teacher.bank_account_type },
    ]
    : []
  const filasPix: { label: string; valor: string | null }[] = teacher && usaPix
    ? [
      { label: textos.tipoChave, valor: teacher.pix_key_type },
      { label: textos.chavePix, valor: teacher.pix_key },
    ]
    : []

  const hayAlgo = [...filas, ...filasPix].some((f) => f.valor)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)] max-h-[80dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
        <h2 className="text-white text-rt-22 font-bold">{textos.titulo}</h2>
        <p className="text-white/60 text-rt-14 mb-5">{teacher?.bank_holder || teacher?.full_name || ''}</p>

        {cargando ? (
          <div className="text-white/60 text-rt-13 py-6 text-center">…</div>
        ) : !hayAlgo ? (
          <div className="text-white/60 text-rt-13 py-6">{textos.sinDatos}</div>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {filas.filter((f) => f.valor).map((f) => (
                <Fila key={f.label} label={f.label} valor={f.valor!} copiado={copiado === f.label} onCopiar={() => copiar(f.valor!, f.label)} etiquetaCopiado={textos.copiado} />
              ))}
            </ul>
            {filasPix.some((f) => f.valor) && (
              <>
                <div className="h-px bg-surface-line my-5" />
                <ul className="flex flex-col gap-4">
                  {filasPix.filter((f) => f.valor).map((f) => (
                    <Fila key={f.label} label={f.label} valor={f.valor!} copiado={copiado === f.label} onCopiar={() => copiar(f.valor!, f.label)} etiquetaCopiado={textos.copiado} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Fila({ label, valor, copiado, onCopiar, etiquetaCopiado }: {
  label: string; valor: string; copiado: boolean; onCopiar: () => void; etiquetaCopiado: string
}) {
  return (
    <li className="flex items-end gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-white/50 text-rt-12">{label}</div>
        <div className="text-white text-rt-16 font-bold break-words">{valor}</div>
      </div>
      <button
        type="button"
        onClick={onCopiar}
        aria-label={copiado ? etiquetaCopiado : label}
        className="w-11 h-11 rounded-[10px] bg-surface-raised flex items-center justify-center shrink-0"
      >
        {copiado ? <Check size={20} className="text-brand" /> : <Copy size={20} className="text-brand" />}
      </button>
    </li>
  )
}
