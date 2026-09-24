import { etiqueta } from '@/lib/catalogos'
import { useState } from 'react'
import { Trash2, GripVertical, X } from 'lucide-react'
import {
  PARAMETROS, PARAMETRO_POR_ID, MAX_PARAMETROS_POR_SERIE,
  etiquetaParametro, valorFormateado, type Parametro,
} from '@/lib/parametros'

/** Lo que se guarda en series.params: { repetition: '12', load: '40', ... } */
export type ParamsSerie = Record<string, string>

/**
 * Una serie con sus parámetros, como en las capturas 026/027: la fila de
 * acciones, la tira horizontal de tarjetas de parámetro y la observación.
 */
export function FilaSerie({
  numero,
  params,
  observacion,
  lang,
  arrastre,
  id,
  onParams,
  onObservacion,
  onDuplicar,
  onEliminar,
}: {
  numero: number
  params: ParamsSerie
  observacion: string
  lang: string
  /** Manija de arrastre; sin esto la serie no se puede reordenar. */
  arrastre?: {
    arrastrando: string | null
    encima: string | null
    registrar: (id: string, el: HTMLElement | null) => void
    alBajar: (id: string) => (e: React.PointerEvent) => void
    alMover: (e: React.PointerEvent) => void
    alSoltar: () => void
  }
  id?: string
  onParams: (p: ParamsSerie) => void
  onObservacion: (v: string) => void
  onDuplicar: () => void
  onEliminar: () => void
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const [editando, setEditando] = useState<Parametro | null>(null)

  const puestos = PARAMETROS.filter((p) => p.id in params)
  const vacia = puestos.length === 0

  return (
    <div
      ref={(el) => { if (arrastre && id) arrastre.registrar(id, el) }}
      onPointerMove={arrastre?.alMover}
      onPointerUp={arrastre?.alSoltar}
      className={
        'flex gap-3 transition ' +
        (arrastre && id && arrastre.arrastrando === id ? 'opacity-50 ' : '') +
        (arrastre && id && arrastre.encima === id && arrastre.arrastrando !== id ? 'ring-1 ring-brand rounded-lg ' : '')
      }
    >
      <div className="flex flex-col items-center shrink-0 w-8 pt-1">
        <button
          type="button"
          onPointerDown={arrastre && id ? arrastre.alBajar(id) : undefined}
          aria-label="Arrastar série"
          className="touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={20} className="text-grey-600" />
        </button>
        <span className="text-brand text-rt-20 font-bold mt-1">{numero}</span>
      </div>

      <div className="flex-1 min-w-0">
        {vacia ? (
          <button
            type="button"
            onClick={() => setEligiendo(true)}
            className="w-full h-10 rounded-lg bg-brand text-white text-rt-12 font-semibold"
          >
            Adicionar Parâmetros
          </button>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEligiendo(true)}
                className="flex-[3] h-9 rounded-lg bg-brand text-white text-rt-10 font-semibold"
              >
                Adicionar Campo
              </button>
              <button
                type="button"
                onClick={onDuplicar}
                className="flex-[3] h-9 rounded-lg border border-brand text-brand text-rt-10 font-semibold"
              >
                Duplicar Série
              </button>
              <button
                type="button"
                onClick={onEliminar}
                aria-label="Excluir série"
                className="w-8 h-9 rounded-md bg-surface-card border border-surface-line flex items-center justify-center shrink-0"
              >
                <Trash2 size={16} className="text-danger" />
              </button>
            </div>

            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {puestos.map((p) => (
                <div key={p.id} className="shrink-0 w-[85px]">
                  <div className="text-grey-400 text-[10px] text-center leading-tight h-7 flex items-end justify-center pb-1">
                    {etiquetaParametro(p, lang)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditando(p)}
                    className="w-full h-[45px] rounded-[10px] bg-white text-black text-rt-14 font-bold px-1 truncate"
                  >
                    {valorFormateado(p, params[p.id], lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(p)}
                    className="w-full h-5 rounded-md bg-white text-black text-[8px] font-bold mt-1"
                  >
                    EDITAR
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-3">
          <label className="block text-grey-500 text-[10px] mb-1">Observação</label>
          <input
            value={observacion}
            onChange={(e) => onObservacion(e.target.value)}
            placeholder="Ex: Última série fazer drop set"
            className="w-full h-10 px-3 rounded-[10px] bg-surface-card border border-surface-line text-white text-rt-12 outline-none focus:border-brand"
          />
        </div>
      </div>

      {eligiendo && (
        <SheetParametros
          lang={lang}
          elegidos={Object.keys(params)}
          onCerrar={() => setEligiendo(false)}
          onGuardar={(ids) => {
            const siguiente: ParamsSerie = {}
            for (const id of ids) siguiente[id] = params[id] ?? valorPorDefecto(id)
            onParams(siguiente)
            setEligiendo(false)
          }}
        />
      )}

      {editando && (
        <SheetValor
          parametro={editando}
          valor={params[editando.id] ?? ''}
          lang={lang}
          onCerrar={() => setEditando(null)}
          onGuardar={(v) => { onParams({ ...params, [editando.id]: v }); setEditando(null) }}
          onQuitar={() => {
            const siguiente = { ...params }
            delete siguiente[editando.id]
            onParams(siguiente)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

/** Valor inicial razonable para que la tarjeta no nazca vacía. */
function valorPorDefecto(id: string): string {
  const p = PARAMETRO_POR_ID.get(id)
  if (!p) return ''
  if (p.tipo === 'select') return p.opciones?.[0]?.id ?? ''
  if (p.tipo === 'time') return '60'
  return id === 'repetition' ? '12' : ''
}

function SheetParametros({ lang, elegidos, onCerrar, onGuardar }: {
  lang: string
  elegidos: string[]
  onCerrar: () => void
  onGuardar: (ids: string[]) => void
}) {
  const [sel, setSel] = useState<string[]>(elegidos)
  const lleno = sel.length >= MAX_PARAMETROS_POR_SERIE

  function alternar(id: string) {
    setSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : lleno ? prev : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={onCerrar}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[80dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white text-rt-18 font-bold">Parâmetros do exercício</h2>
          <button onClick={onCerrar} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="text-white/50 text-rt-11 mb-4">{sel.length} de {MAX_PARAMETROS_POR_SERIE}</p>

        <ul className="flex flex-col">
          {PARAMETROS.map((p) => {
            const on = sel.includes(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => alternar(p.id)}
                  disabled={!on && lleno}
                  className="w-full flex items-center gap-3 py-3 border-b border-surface-line last:border-0 text-left disabled:opacity-40"
                >
                  <span className={
                    'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 text-rt-12 ' +
                    (on ? 'bg-brand border-brand text-white' : 'border-grey-600')
                  }>
                    {on && '✓'}
                  </span>
                  <span className="flex-1 text-white text-rt-14">{etiquetaParametro(p, lang)}</span>
                  {p.unidad && <span className="text-grey-500 text-rt-12">{p.unidad}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <button onClick={() => onGuardar(sel)} className="btn-save mt-6">Salvar Parâmetros</button>
      </div>
    </div>
  )
}

function SheetValor({ parametro, valor, lang, onCerrar, onGuardar, onQuitar }: {
  parametro: Parametro
  valor: string
  lang: string
  onCerrar: () => void
  onGuardar: (v: string) => void
  onQuitar: () => void
}) {
  const esRango = parametro.id === 'repetition' && valor.includes('-')
  const [rango, setRango] = useState(esRango)
  const [v, setV] = useState(valor)
  const [desde, setDesde] = useState(esRango ? valor.split('-')[0] : valor)
  const [hasta, setHasta] = useState(esRango ? valor.split('-')[1] : '')

  const resultado = parametro.id === 'repetition' && rango ? `${desde}-${hasta}` : v

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={onCerrar}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[80dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-rt-18 font-bold">{etiquetaParametro(parametro, lang)}</h2>
          <button onClick={onCerrar} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {parametro.tipo === 'select' ? (
          <ul className="flex flex-col">
            {parametro.opciones?.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onGuardar(o.id)}
                  className={
                    'w-full text-left py-3 border-b border-surface-line last:border-0 text-rt-14 ' +
                    (valor === o.id ? 'text-brand font-semibold' : 'text-white')
                  }
                >
                  {etiqueta(o, lang)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {parametro.id === 'repetition' && (
              <button
                type="button"
                onClick={() => setRango((x) => !x)}
                className="flex items-center gap-2 mb-4"
              >
                <span className={
                  'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center text-rt-12 ' +
                  (rango ? 'bg-brand border-brand text-white' : 'border-grey-600')
                }>
                  {rango && '✓'}
                </span>
                <span className="text-white text-rt-13">Usar intervalo (ex: 10-12)</span>
              </button>
            )}

            {parametro.id === 'repetition' && rango ? (
              <div className="flex items-center gap-3">
                <input inputMode="numeric" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-dark flex-1 text-center" />
                <span className="text-white">—</span>
                <input inputMode="numeric" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-dark flex-1 text-center" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  inputMode={parametro.tipo === 'time' ? 'numeric' : 'decimal'}
                  value={v}
                  onChange={(e) => setV(e.target.value)}
                  className="input-dark flex-1 text-center text-rt-20 font-bold"
                  autoFocus
                />
                {parametro.unidad && <span className="text-white/60 text-rt-14 w-12">{parametro.unidad}</span>}
              </div>
            )}

            <button onClick={() => onGuardar(resultado)} className="btn-save mt-6">Salvar</button>
          </>
        )}

        <button onClick={onQuitar} className="w-full h-11 mt-3 text-danger text-rt-13 font-semibold">
          Remover Campo
        </button>
      </div>
    </div>
  )
}
