import { useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'

export function Tarjeta({ label, valor, nota }: { label: string; valor: ReactNode; nota?: ReactNode }) {
  return (
    <div className="bg-surface-card border border-surface-line rounded-xl p-4">
      <div className="text-grey-400 text-rt-12 mb-2">{label}</div>
      <div className="text-white text-rt-24 font-bold">{valor}</div>
      {nota && <div className="text-grey-500 text-rt-11 mt-1">{nota}</div>}
    </div>
  )
}

export function Buscador({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-dark pl-9" />
    </div>
  )
}

export function Tabla<T>({ cols, rows, onRow, vacio = 'Sin resultados', seleccion }: {
  cols: { label: string; render: (r: T) => ReactNode; className?: string }[]
  rows: T[]
  onRow?: (r: T) => void
  vacio?: string
  /** Casillas para acciones en lote: `ids` marcados y cómo se identifica cada fila. */
  seleccion?: { ids: Set<string>; idDe: (r: T) => string; cambiar: (ids: Set<string>) => void }
}) {
  const todos = seleccion ? rows.map(seleccion.idDe) : []
  const todosMarcados = !!seleccion && todos.length > 0 && todos.every((id) => seleccion.ids.has(id))
  const alternar = (id: string) => {
    if (!seleccion) return
    const n = new Set(seleccion.ids)
    if (n.has(id)) n.delete(id); else n.add(id)
    seleccion.cambiar(n)
  }
  const alternarTodos = () => {
    if (!seleccion) return
    const n = new Set(seleccion.ids)
    for (const id of todos) { if (todosMarcados) n.delete(id); else n.add(id) }
    seleccion.cambiar(n)
  }
  return (
    <div className="bg-surface-card border border-surface-line rounded-xl overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-surface-line">
            {seleccion && (
              <th className="w-10 pl-4 py-3">
                <input type="checkbox" className="w-4 h-4 accent-brand align-middle" checked={todosMarcados} onChange={alternarTodos} aria-label="Seleccionar todos" />
              </th>
            )}
            {cols.map((c) => <th key={c.label} className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={cols.length + (seleccion ? 1 : 0)} className="px-4 py-6 text-grey-500 text-rt-13">{vacio}</td></tr>}
          {rows.map((r, i) => {
            const id = seleccion?.idDe(r)
            const marcado = !!id && seleccion!.ids.has(id)
            return (
              <tr
                key={id ?? i}
                onClick={onRow ? () => onRow(r) : undefined}
                className={'border-b border-surface-line last:border-0 ' + (onRow ? 'cursor-pointer hover:bg-white/5 ' : '') + (marcado ? 'bg-brand/10' : '')}
              >
                {seleccion && (
                  <td className="w-10 pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 accent-brand align-middle" checked={marcado} onChange={() => alternar(id!)} aria-label="Seleccionar" />
                  </td>
                )}
                {cols.map((c) => <td key={c.label} className={'px-4 py-3 text-white text-rt-13 ' + (c.className ?? '')}>{c.render(r)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Badge({ tono, children }: { tono: 'ok' | 'warn' | 'bad' | 'neutral'; children: ReactNode }) {
  const c = {
    ok: 'bg-green-500/15 text-green-400',
    warn: 'bg-yellow-500/15 text-yellow-400',
    bad: 'bg-danger/15 text-danger',
    neutral: 'bg-white/10 text-grey-300',
  }[tono]
  return <span className={'inline-block px-2 py-0.5 rounded text-rt-11 font-semibold whitespace-nowrap ' + c}>{children}</span>
}

export function Panel({ titulo, onCerrar, children, pie, ancho }: { titulo: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode; ancho?: boolean }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/60" onClick={onCerrar}>
      <div className={'w-full h-full ' + (ancho ? 'max-w-3xl' : 'max-w-lg') + ' bg-surface-card border-l border-surface-line flex flex-col'} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-surface-line shrink-0">
          <h2 className="text-white text-rt-18 font-bold truncate">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">{children}</div>
        {pie && <div className="px-5 py-4 border-t border-surface-line shrink-0">{pie}</div>}
      </div>
    </div>
  )
}

export type Campo = {
  key: string
  label: string
  tipo?: 'text' | 'number' | 'textarea' | 'bool' | 'select' | 'lista'
  opciones?: { v: string; l: string }[]
}

export function Formulario({ campos, valores, onChange }: { campos: Campo[]; valores: Record<string, any>; onChange: (k: string, v: any) => void }) {
  return (
    <>
      {campos.map((c) => {
        const v = valores[c.key]
        return (
          <label key={c.key} className="flex flex-col gap-1">
            <span className="text-grey-400 text-rt-12">{c.label}</span>
            {c.tipo === 'textarea' ? (
              <textarea className="input-dark h-28 py-2 resize-y" value={v ?? ''} onChange={(e) => onChange(c.key, e.target.value)} />
            ) : c.tipo === 'bool' ? (
              <input type="checkbox" className="w-5 h-5 accent-brand" checked={!!v} onChange={(e) => onChange(c.key, e.target.checked)} />
            ) : c.tipo === 'select' ? (
              <select className="input-dark" value={v ?? ''} onChange={(e) => onChange(c.key, e.target.value)}>
                <option value="">—</option>
                {c.opciones?.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : c.tipo === 'lista' ? (
              <input
                className="input-dark"
                value={Array.isArray(v) ? v.join(', ') : v ?? ''}
                onChange={(e) => onChange(c.key, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="separado por comas"
              />
            ) : (
              <input
                type={c.tipo === 'number' ? 'number' : 'text'}
                step="any"
                className="input-dark"
                value={v ?? ''}
                onChange={(e) => onChange(c.key, c.tipo === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
              />
            )}
          </label>
        )
      })}
    </>
  )
}

export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function correr(fn: () => Promise<unknown>) {
    setOcupado(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, error, correr, setError }
}

export function Error_({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div className="p-3 bg-danger/10 border border-danger rounded-lg text-danger text-rt-13 font-semibold">{msg}</div>
}
