import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ListPlus, PlusCircle, Search, Check, X, ArrowLeft, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { objetivosDieta, tiposRefeicao, etiqueta } from '@/lib/catalogos'
import { nombreEjercicio as nombreEnIdioma } from '@/lib/nombreEjercicio'
import { FullScreenSheet } from './RoutinesTab'
import type { Food } from './FoodsTab'

type Comida = { id: string; name: string; time_of_day: string | null; meal_foods: { food_id: string | null; position: number }[] }
type Dieta = { id: string; name: string; meals: Comida[] }

/** Agrega los alimentos que falten en la comida, con la porción base como cantidad. */
async function agregarAComida(comida: Comida, alimentos: Food[], lang: string) {
  const ya = new Set(comida.meal_foods.map((x) => x.food_id))
  const nuevos = alimentos.filter((f) => !ya.has(f.id))
  if (nuevos.length === 0) return 0
  const desde = comida.meal_foods.length
  const { error } = await supabase.from('meal_foods').insert(nuevos.map((f, i) => ({
    meal_id: comida.id,
    food_id: f.id,
    food_name_snapshot: nombreEnIdioma(f, lang),
    quantity: Number(f.portion_qty ?? 100),
    unit: f.unit ?? 'g',
    position: desde + i,
  })))
  if (error) throw error
  return nuevos.length
}

export function CombinarAlimentos({ alimentos, onCerrar, onListo, onError }: {
  alimentos: Food[]
  onCerrar: () => void
  onListo: (m: string) => void
  onError: (m: string) => void
}) {
  const [paso, setPaso] = useState<'opciones' | 'nueva' | 'existente'>('opciones')
  const n = alimentos.length
  if (paso === 'nueva') return <NuevaDieta alimentos={alimentos} onCerrar={onCerrar} onListo={onListo} onError={onError} />
  if (paso === 'existente') return <DietaExistente alimentos={alimentos} onCerrar={onCerrar} onListo={onListo} onError={onError} />
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[20px] bg-[#1E1E1E] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
        <h2 className="text-white text-rt-18 font-bold text-center">Combinar Alimentos</h2>
        <p className="text-grey-500 text-rt-13 text-center mt-1">{n} {n === 1 ? 'alimento selecionado' : 'alimentos selecionados'}</p>
        <div className="flex flex-col gap-3 mt-6">
          <Opcion icono={PlusCircle} titulo="Criar nova dieta" sub="Crie uma dieta e adicione os alimentos" onClick={() => setPaso('nueva')} />
          <Opcion icono={ListPlus} titulo="Adicionar a dieta existente" sub="Escolha uma dieta e uma refeição" onClick={() => setPaso('existente')} />
        </div>
        <button onClick={onCerrar} className="w-full h-12 mt-5 rounded-[12px] bg-[#333333] text-grey-400 text-rt-14">Cancelar</button>
      </div>
    </div>
  )
}

function Opcion({ icono: Icono, titulo, sub, onClick }: { icono: typeof PlusCircle; titulo: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-[14px] bg-[#252525] border border-[#333333] p-4 flex items-center gap-4 text-left">
      <span className="w-12 h-12 rounded-[12px] bg-brand/15 flex items-center justify-center shrink-0"><Icono size={24} className="text-brand" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-white text-rt-15 font-semibold">{titulo}</span>
        <span className="block text-grey-500 text-rt-12 mt-0.5">{sub}</span>
      </span>
      <ChevronRight size={20} className="text-grey-600" />
    </button>
  )
}

function Aguardando({ alimentos, lang }: { alimentos: Food[]; lang: string }) {
  return (
    <div className="rounded-[14px] border border-brand/40 bg-brand/10 p-4">
      <div className="text-brand text-rt-14 font-semibold">{alimentos.length} alimentos aguardando</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {alimentos.map((f) => <span key={f.id} className="text-rt-11 px-2.5 py-1 rounded-[12px] bg-brand/20 text-white">{nombreEnIdioma(f, lang)}</span>)}
      </div>
    </div>
  )
}

function NuevaDieta({ alimentos, onCerrar, onListo, onError }: {
  alimentos: Food[]
  onCerrar: () => void
  onListo: (m: string) => void
  onError: (m: string) => void
}) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('maintenance')
  const [comidas, setComidas] = useState<string[]>([])
  const [destino, setDestino] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function alternarComida(id: string) {
    setComidas((p) => {
      const sig = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
      if (!sig.includes(destino ?? '')) setDestino(null)
      return sig
    })
  }

  async function crear() {
    if (!nombre.trim()) { setError('Nome é obrigatório'); return }
    if (!destino) { setError('Selecione a refeição que vai receber os alimentos'); return }
    if (!profile?.id) return
    setError(null)
    setGuardando(true)
    try {
      const { data: dieta, error: e1 } = await supabase.from('diets')
        .insert({ owner_id: profile.id, name: nombre.trim(), goal: objetivo }).select('id').single()
      if (e1) throw e1
      const ordenadas = tiposRefeicao.filter((t) => comidas.includes(t.id))
      const { data: filas, error: e2 } = await supabase.from('meals')
        .insert(ordenadas.map((t, i) => ({ diet_id: dieta.id, name: etiqueta(t, lang), time_of_day: t.hora, position: i })))
        .select('id,name,time_of_day')
      if (e2) throw e2
      const receptora = (filas as { id: string; name: string; time_of_day: string }[])
        .find((f) => f.time_of_day === tiposRefeicao.find((t) => t.id === destino)!.hora)!
      await agregarAComida({ ...receptora, meal_foods: [] }, alimentos, lang)
      onListo(`Dieta "${nombre.trim()}" criada com sucesso!`)
    } catch (e) {
      setGuardando(false)
      onError('Erro ao criar dieta: ' + (e as Error).message)
    }
  }

  return (
    <FullScreenSheet title="Nova Dieta" onClose={onCerrar}>
      <div className="flex flex-col gap-6">
        <Aguardando alimentos={alimentos} lang={lang} />
        {error && <div className="rounded-[12px] bg-danger/15 border border-danger/40 px-4 py-3 text-[#EF9A9A] text-rt-13">{error}</div>}
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">Nome da Dieta</label>
          <input
            className="w-full h-[52px] px-4 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ex: Dieta A · Dia de Treino"
          />
        </div>
        <CajaSelector label="Objetivo" valor={objetivo} placeholder="Manutenção" lista={objetivosDieta} lang={lang} onAbrir={() => setAbriendo(true)} />
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-1">Refeições</label>
          <p className="text-grey-500 text-rt-11 mb-3">Escolha as refeições e marque o círculo da que vai receber os alimentos.</p>
          <ul className="flex flex-col gap-2">
            {tiposRefeicao.map((t) => {
              const on = comidas.includes(t.id)
              const esDestino = destino === t.id
              return (
                <li key={t.id} className={'rounded-[12px] border p-3 flex items-center gap-3 ' + (on ? 'border-brand bg-brand/10' : 'border-[#333333] bg-[#252525]')}>
                  <button onClick={() => alternarComida(t.id)} aria-label={on ? 'Remover refeição' : 'Adicionar refeição'}
                    className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>
                    {on && <Check size={14} className="text-white" />}
                  </button>
                  <button onClick={() => alternarComida(t.id)} className="flex-1 text-left">
                    <span className="block text-white text-rt-14">{etiqueta(t, lang)}</span>
                    <span className="block text-grey-500 text-rt-11">{t.hora}{esDestino && <span className="text-brand"> · + {alimentos.length} alimentos</span>}</span>
                  </button>
                  {on && (
                    <button onClick={() => setDestino(t.id)} aria-label="Receber os alimentos"
                      className={'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ' + (esDestino ? 'border-brand bg-brand' : 'border-grey-500')}>
                      {esDestino && <Check size={14} className="text-white" />}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={guardando} onClick={() => void crear()}>{guardando ? 'Criando…' : 'Criar Dieta'}</button>
      </div>
      {abriendo && <HojaRadio lista={objetivosDieta} valor={objetivo} lang={lang} onElegir={(id) => { setObjetivo(id); setAbriendo(false) }} onCerrar={() => setAbriendo(false)} />}
    </FullScreenSheet>
  )
}

function DietaExistente({ alimentos, onCerrar, onListo, onError }: {
  alimentos: Food[]
  onCerrar: () => void
  onListo: (m: string) => void
  onError: (m: string) => void
}) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [dietas, setDietas] = useState<Dieta[] | null>(null)
  const [busca, setBusca] = useState('')
  const [dieta, setDieta] = useState<Dieta | null>(null)
  const [sinComidas, setSinComidas] = useState(false)
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('diets')
        .select('id,name,meals(id,name,time_of_day,meal_foods(food_id,position))')
        .eq('owner_id', profile.id).order('name')
      setDietas(((data as Dieta[]) ?? []).map((d) => ({ ...d, meals: d.meals.slice().sort((a, b) => (a.time_of_day ?? '').localeCompare(b.time_of_day ?? '')) })))
    })()
  }, [profile?.id])

  const lista = (dietas ?? []).filter((d) => d.name.toLowerCase().includes(busca.trim().toLowerCase()))

  async function agregar() {
    if (!dieta) return
    setEnviando(true)
    try {
      let total = 0
      const nombres: string[] = []
      for (const c of dieta.meals.filter((m) => marcadas.includes(m.id))) {
        total += await agregarAComida(c, alimentos, lang)
        nombres.push(c.name)
      }
      onListo(total === 0
        ? 'Os alimentos já estavam nessas refeições.'
        : `${total} alimento(s) adicionado(s) em ${nombres.map((n) => `"${n}"`).join(', ')}`)
    } catch (e) {
      setEnviando(false)
      onError('Erro ao adicionar alimentos: ' + (e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app h-[85dvh] rounded-t-[20px] bg-[#1E1E1E] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 pb-3">
          <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
          <div className="flex items-center gap-3">
            {dieta && (
              <button onClick={() => { setDieta(null); setMarcadas([]) }} aria-label="Voltar" className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center">
                <ArrowLeft size={18} className="text-white" />
              </button>
            )}
            <h2 className="flex-1 text-white text-rt-18 font-bold">{dieta ? 'Selecionar Refeições' : 'Selecionar Dieta'}</h2>
            <button onClick={onCerrar} aria-label="Fechar" className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={18} className="text-white" /></button>
          </div>
          <div className="mt-4"><Aguardando alimentos={alimentos} lang={lang} /></div>
          {!dieta && (
            <div className="relative mt-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar dieta..."
                className="w-full h-[46px] pl-10 pr-3 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none focus:border-brand" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {dietas === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : !dieta ? (
            lista.length === 0 ? (
              <p className="text-center py-10 text-white/60 text-rt-13">{dietas.length === 0 ? 'Nenhuma dieta criada.' : 'Nenhuma dieta encontrada.'}</p>
            ) : (
              <ul className="flex flex-col gap-3 pb-4">
                {lista.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => { if (d.meals.length === 0) { setSinComidas(true); return } setDieta(d) }}
                      className="w-full rounded-[14px] p-4 flex items-center gap-3 text-left bg-[#252525] border border-[#333333]"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-rt-15 font-semibold truncate">{d.name}</span>
                        {d.meals.length === 0
                          ? <span className="flex items-center gap-1 text-[#FFA726] text-rt-11 mt-0.5"><AlertTriangle size={13} /> Sem refeições</span>
                          : <span className="block text-grey-500 text-rt-11 mt-0.5">{d.meals.length} refeições</span>}
                      </span>
                      <ChevronRight size={20} className="text-grey-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
              <button
                onClick={() => setMarcadas(marcadas.length === dieta.meals.length ? [] : dieta.meals.map((m) => m.id))}
                className="text-brand text-rt-13 font-semibold mb-3"
              >
                {marcadas.length === dieta.meals.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
              <ul className="flex flex-col gap-2 pb-4">
                {dieta.meals.map((m) => {
                  const on = marcadas.includes(m.id)
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => setMarcadas((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                        className={'w-full rounded-[12px] p-3 flex items-center gap-3 text-left border ' + (on ? 'border-brand bg-brand/10' : 'border-[#333333] bg-[#252525]')}
                      >
                        <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>
                          {on && <Check size={14} className="text-white" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-white text-rt-14">{m.name}</span>
                          <span className="block text-grey-500 text-rt-11">{m.time_of_day?.slice(0, 5)} · {m.meal_foods.length} alimentos</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {dieta && (
          <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
            <button
              disabled={marcadas.length === 0 || enviando}
              onClick={() => void agregar()}
              className={'w-full h-[54px] rounded-[27px] text-white text-rt-15 font-bold ' + (marcadas.length ? 'bg-gradient-to-b from-[#7CB342] to-[#94E143]' : 'bg-[#616161]')}
            >
              {enviando ? '…' : marcadas.length === 0 ? 'Selecione as refeições' : `Adicionar em ${marcadas.length} ${marcadas.length === 1 ? 'refeição' : 'refeições'}`}
            </button>
          </div>
        )}
      </div>

      {sinComidas && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-8" onClick={(e) => { e.stopPropagation(); setSinComidas(false) }}>
          <div className="w-full max-w-[340px] rounded-[16px] bg-[#2D2D2D] p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle size={48} className="text-[#FFA726] mx-auto" />
            <h3 className="text-white text-rt-16 font-bold mt-3">Sem Refeições</h3>
            <p className="text-white/70 text-rt-13 mt-2">Esta dieta ainda não tem refeições. Adicione refeições na dieta antes de combinar alimentos.</p>
            <button onClick={() => setSinComidas(false)} className="w-full h-11 mt-5 rounded-[22px] bg-brand text-white text-rt-14 font-semibold">OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
