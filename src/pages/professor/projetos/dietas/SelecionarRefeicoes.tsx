import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check, Ban, UtensilsCrossed, PlusCircle, Pencil, Trash2, Clock, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { tiposRefeicao, etiqueta } from '@/lib/catalogos'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export type RefeicaoElegida = { meal_type: string; name: string; time: string; personalizada: boolean }
type Personalizada = { id: string; name: string; default_time: string }

/** Hoja 'Selecionar Refeições': devuelve las elegidas ordenadas por horário. */
export function SelecionarRefeicoes({ bloqueados, onCerrar, onElegir }: {
  bloqueados: string[]
  onCerrar: () => void
  onElegir: (r: RefeicaoElegida[]) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [pestana, setPestana] = useState<'app' | 'propias'>('app')
  const [propias, setPropias] = useState<Personalizada[]>([])
  const [horas, setHoras] = useState<Record<string, string>>({})
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaHora, setNuevaHora] = useState('12:00')
  const [editando, setEditando] = useState<Personalizada | null>(null)
  const [borrando, setBorrando] = useState<Personalizada | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const { data } = await supabase.from('custom_meals').select('id,name,default_time').order('default_time')
    setPropias((data as Personalizada[]) ?? [])
  }
  useEffect(() => { void cargar() }, [])

  const filas = [
    ...tiposRefeicao.map((t) => ({ tipo: t.id, nombre: etiqueta(t, lang), hora: t.hora, propia: null as Personalizada | null })),
    ...propias.map((p) => ({ tipo: `custom:${p.id}`, nombre: p.name, hora: p.default_time, propia: p })),
  ]
  const horaDe = (tipo: string, def: string) => horas[tipo] ?? def

  function alternar(tipo: string) {
    if (bloqueados.includes(tipo)) return
    setMarcadas((p) => (p.includes(tipo) ? p.filter((x) => x !== tipo) : [...p, tipo]))
  }

  async function crear() {
    if (!nuevoNombre.trim()) return
    const { data, error: e } = await supabase.from('custom_meals').insert({ name: nuevoNombre.trim(), default_time: nuevaHora }).select('id,name,default_time').single()
    if (e) { setError(e.message); return }
    setPropias((p) => [...p, data as Personalizada])
    setMarcadas((p) => [...p, `custom:${data.id}`])
    setNuevoNombre('')
  }

  async function guardarEdicion(p: Personalizada) {
    const { error: e } = await supabase.from('custom_meals').update({ name: p.name, default_time: p.default_time }).eq('id', p.id)
    if (e) { setError(e.message); return }
    // Las refeições de ese tipo ya en dietas toman el nombre nuevo.
    await supabase.from('meals').update({ name: p.name }).eq('meal_type', `custom:${p.id}`)
    setEditando(null)
    await cargar()
  }

  async function borrar(p: Personalizada) {
    await supabase.from('meals').delete().eq('meal_type', `custom:${p.id}`)
    const { error: e } = await supabase.from('custom_meals').delete().eq('id', p.id)
    setBorrando(null)
    if (e) { setError(e.message); return }
    setMarcadas((m) => m.filter((x) => x !== `custom:${p.id}`))
    await cargar()
  }

  function confirmar() {
    const r = filas.filter((f) => marcadas.includes(f.tipo))
      .map((f) => ({ meal_type: f.tipo, name: f.nombre, time: horaDe(f.tipo, f.hora), personalizada: Boolean(f.propia) }))
      .sort((a, b) => a.time.localeCompare(b.time))
    onElegir(r)
  }

  const visibles = filas.filter((f) => (pestana === 'app' ? !f.propia : f.propia))
  const n = marcadas.length

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app h-[92dvh] rounded-t-[20px] bg-[#1E1E1E] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-3" />
          <div className="flex items-center">
            <h2 className="flex-1 text-center text-white text-rt-18 font-bold pl-9">Selecionar Refeições</h2>
            <button onClick={onCerrar} aria-label="Fechar" className="w-9 h-9 rounded-[12px] bg-[#333333] flex items-center justify-center"><X size={18} className="text-grey-400" /></button>
          </div>
          <div className="mt-4 p-1 rounded-[12px] bg-[#252525] flex">
            {([['app', 'Do App', UtensilsCrossed], ['propias', `Personalizadas (${propias.length})`, PlusCircle]] as const).map(([id, t, I]) => (
              <button key={id} onClick={() => setPestana(id)} className={'flex-1 h-9 rounded-[10px] flex items-center justify-center gap-1.5 text-rt-13 ' + (pestana === id ? 'bg-brand text-white font-semibold' : 'text-grey-500')}>
                <I size={15} />{t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-3">
          {error && <div className="mb-3 rounded-[10px] bg-danger/15 border border-danger/40 px-3 py-2 text-[#EF9A9A] text-rt-12">{error}</div>}
          {pestana === 'propias' && (
            <>
              <div className="rounded-[12px] bg-[#252525] border border-brand/30 p-3 mb-3">
                <div className="flex items-center gap-2 text-white text-rt-13 font-semibold mb-2"><PlusCircle size={18} className="text-brand" /> Criar Nova Refeição</div>
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nome da refeição (ex: Lanche Pré-Jogo)"
                  className="w-full h-11 px-3 rounded-[10px] bg-[#1E1E1E] border border-[#333333] text-white text-rt-13 outline-none focus:border-brand" />
                <div className="flex gap-2 mt-2">
                  <label className="flex-1 h-10 px-3 rounded-[10px] bg-[#1E1E1E] border border-[#333333] flex items-center gap-2">
                    <Clock size={16} className="text-brand" />
                    <input type="time" value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} className="bg-transparent text-white text-rt-13 outline-none flex-1 [color-scheme:dark]" />
                  </label>
                  <button onClick={() => void crear()} disabled={!nuevoNombre.trim()} className="px-5 h-10 rounded-[10px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-13 font-bold disabled:opacity-40">Criar</button>
                </div>
              </div>
              {propias.length > 0 && <div className="text-grey-500 text-rt-11 text-center my-2">Suas Refeições</div>}
            </>
          )}
          <ul className="flex flex-col gap-2">
            {visibles.map((f) => {
              const bloq = bloqueados.includes(f.tipo)
              const on = marcadas.includes(f.tipo)
              return (
                <li key={f.tipo} className={'rounded-[12px] border p-2.5 flex items-center gap-2 ' +
                  (bloq ? 'bg-[#1A1A1A] border-[#2A2A2A] opacity-40' : on ? 'bg-brand/10 border-brand/50' : 'bg-[#252525] border-[#333333]')}>
                  <button onClick={() => alternar(f.tipo)} className="flex-1 min-w-0 h-10 px-3 rounded-[8px] bg-[#1E1E1E] border border-[#444444] flex items-center gap-1.5 text-left">
                    {f.propia && <Star size={13} className="text-brand shrink-0" />}
                    <span className="text-white text-rt-12 truncate">{f.nombre}</span>
                  </button>
                  <input type="time" disabled={bloq} value={horaDe(f.tipo, f.hora)}
                    onChange={(e) => { setHoras((h) => ({ ...h, [f.tipo]: e.target.value })); if (!on) setMarcadas((p) => [...p, f.tipo]) }}
                    className="w-[76px] h-10 px-1 rounded-[8px] bg-[#1E1E1E] border border-[#444444] text-white text-rt-12 text-center outline-none [color-scheme:dark]" />
                  {f.propia && !bloq && (
                    <>
                      <button onClick={() => setEditando(f.propia)} aria-label="Editar refeição" className="w-9 h-9 rounded-[8px] bg-[#333333] flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
                      <button onClick={() => setBorrando(f.propia)} aria-label="Excluir refeição" className="w-9 h-9 rounded-[8px] bg-danger/10 flex items-center justify-center"><Trash2 size={15} className="text-[#EF5350]" /></button>
                    </>
                  )}
                  <button onClick={() => alternar(f.tipo)} aria-label={on ? 'Desmarcar' : 'Marcar'}
                    className={'w-7 h-7 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (bloq ? 'bg-[#333333] border-[#333333]' : on ? 'bg-brand border-brand' : 'border-grey-500')}>
                    {bloq ? <Ban size={14} className="text-grey-500" /> : on && <Check size={15} className="text-white" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button disabled={n === 0} onClick={confirmar}
            className={'w-full h-[52px] rounded-[12px] text-rt-15 font-bold ' + (n ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white' : 'bg-[#333333] text-grey-500')}>
            {n === 0 ? 'Selecione refeições para adicionar' : `Adicionar ${n} ${n === 1 ? 'Refeição' : 'Refeições'}`}
          </button>
        </div>
      </div>

      {editando && <EditarPersonalizada p={editando} onCancelar={() => setEditando(null)} onGuardar={(p) => void guardarEdicion(p)} />}
      {borrando && (
        <ConfirmDialog
          message="Excluir Refeição"
          detail={`Excluir "${borrando.name}"? Ela também será removida das dietas que a usam, com seus alimentos.`}
          confirmLabel="Excluir"
          tone="danger"
          onConfirm={() => void borrar(borrando)}
          onCancel={() => setBorrando(null)}
        />
      )}
    </div>
  )
}

function EditarPersonalizada({ p, onCancelar, onGuardar }: { p: Personalizada; onCancelar: () => void; onGuardar: (p: Personalizada) => void }) {
  const [nombre, setNombre] = useState(p.name)
  const [hora, setHora] = useState(p.default_time)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-8" onClick={(e) => { e.stopPropagation(); onCancelar() }}>
      <div className="w-full max-w-[340px] rounded-[16px] bg-[#1E1E1E] border border-grey-700 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white text-rt-16 font-bold mb-4">Editar Refeição</h3>
        <label className="block text-white text-rt-12 font-semibold mb-1.5">Nome</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full h-11 px-3 rounded-[10px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none focus:border-brand" />
        <label className="block text-white text-rt-12 font-semibold mb-1.5 mt-3">Horário padrão</label>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full h-11 px-3 rounded-[10px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none [color-scheme:dark]" />
        <div className="flex gap-2 mt-5">
          <button onClick={onCancelar} className="flex-1 h-11 rounded-[22px] border border-grey-700 text-white/80 text-rt-14">Cancelar</button>
          <button onClick={() => onGuardar({ ...p, name: nombre.trim() || p.name, default_time: hora })} className="flex-1 h-11 rounded-[22px] bg-brand text-white text-rt-14 font-semibold">Salvar</button>
        </div>
      </div>
    </div>
  )
}
