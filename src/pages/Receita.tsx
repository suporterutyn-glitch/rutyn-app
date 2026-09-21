import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChefHat, Trash2, Plus, Apple } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { FullScreenSheet, Field } from '@/pages/professor/projetos/RoutinesTab'

type Recipe = { id: string; name: string; instructions: string | null; cover_url: string | null; owner_id: string }
type Ing = { id: string; food_id: string | null; food_name_snapshot: string | null; quantity: number; position: number }
type FoodCat = { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; portion: string }

export function ReceitaPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [r, setR] = useState<Recipe | null>(null)
  const [ings, setIngs] = useState<Ing[]>([])
  const [foodsMap, setFoodsMap] = useState<Map<string, FoodCat>>(new Map())
  const [showAdd, setShowAdd] = useState(false)
  const canEdit = !!profile && profile.id === r?.owner_id

  async function load() {
    if (!id) return
    const [{ data: rec }, { data: ii }] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', id).single(),
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('position'),
    ])
    setR(rec as Recipe)
    setIngs((ii as Ing[]) ?? [])
    const foodIds = new Set(((ii as Ing[]) ?? []).map((x) => x.food_id).filter(Boolean) as string[])
    if (foodIds.size > 0) {
      const { data: f } = await supabase.from('foods').select('*').in('id', Array.from(foodIds))
      const map = new Map<string, FoodCat>()
      ;(f as FoodCat[] | null)?.forEach((x) => map.set(x.id, x))
      setFoodsMap(map)
    }
  }
  useEffect(() => { void load() }, [id])

  async function addIng(cat: FoodCat, qty: number) {
    if (!id) return
    await supabase.from('recipe_ingredients').insert({
      recipe_id: id, food_id: cat.id, food_name_snapshot: cat.name,
      quantity: qty, position: ings.length,
    })
    setShowAdd(false)
    await load()
  }
  async function removeIng(iid: string) {
    await supabase.from('recipe_ingredients').delete().eq('id', iid)
    await load()
  }
  async function saveInstructions(v: string) {
    if (!r) return
    await supabase.from('recipes').update({ instructions: v }).eq('id', r.id)
  }

  const totals = ings.reduce((acc, i) => {
    const cat = i.food_id ? foodsMap.get(i.food_id) : null
    if (!cat) return acc
    const ratio = Number(i.quantity) / Number(cat.portion || 100)
    return {
      kcal: acc.kcal + Number(cat.kcal) * ratio,
      p: acc.p + Number(cat.protein) * ratio,
      c: acc.c + Number(cat.carb) * ratio,
      f: acc.f + Number(cat.fat) * ratio,
    }
  }, { kcal: 0, p: 0, c: 0, f: 0 })

  const steps = (r?.instructions ?? '').split(/\n+/).filter((s) => s.trim())

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChefHat size={20} className="text-brand" />
          <h1 className="text-white text-rt-18 font-bold truncate">{r?.name ?? '...'}</h1>
        </div>
      </div>

      {r?.cover_url && (
        <img src={r.cover_url} alt="" className="w-full h-40 rounded-card object-cover mb-4" />
      )}

      {/* Macros totais */}
      <div className="card-dark p-3 mb-4 grid grid-cols-4 gap-2 text-center">
        {[
          { l: 'kcal', v: totals.kcal, c: 'text-macro-kcal' },
          { l: 'P', v: totals.p, c: 'text-macro-protein' },
          { l: 'C', v: totals.c, c: 'text-macro-carb' },
          { l: 'G', v: totals.f, c: 'text-macro-fat' },
        ].map((m) => (
          <div key={m.l}>
            <div className={'text-rt-18 font-bold ' + m.c}>{Math.round(m.v)}</div>
            <div className="text-grey-500 text-rt-10 uppercase">{m.l}</div>
          </div>
        ))}
      </div>

      <div className="text-white text-rt-13 font-bold uppercase tracking-wider mb-2">Ingredientes</div>
      {ings.length === 0 ? (
        <div className="card-dark p-3 text-white/60 text-rt-12">Nenhum ingrediente.</div>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {ings.map((i) => {
            const cat = i.food_id ? foodsMap.get(i.food_id) : null
            const kcal = cat ? Number(cat.kcal) * (Number(i.quantity) / Number(cat.portion || 100)) : 0
            return (
              <li key={i.id} className="card-dark p-3 flex items-center gap-2">
                <span className="text-brand text-rt-12 font-bold w-16">{Number(i.quantity)}{i.unit}</span>
                <span className="text-white text-rt-13 flex-1 truncate">{i.food_name_snapshot}</span>
                <span className="text-white/60 text-rt-11">{Math.round(kcal)} kcal</span>
                {canEdit && (
                  <button onClick={() => removeIng(i.id)} className="w-6 h-6 rounded-md bg-surface-input flex items-center justify-center">
                    <Trash2 size={12} className="text-danger" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {canEdit && (
        <button onClick={() => setShowAdd(true)} className="w-full h-11 rounded-btn-pill border border-brand bg-brand/15 text-brand text-rt-13 font-semibold flex items-center justify-center gap-1 mb-6">
          <Plus size={16} /> Adicionar ingrediente
        </button>
      )}

      <div className="text-white text-rt-13 font-bold uppercase tracking-wider mb-2">Modo de preparo</div>
      {canEdit ? (
        <textarea
          defaultValue={r?.instructions ?? ''}
          onBlur={(e) => saveInstructions(e.target.value)}
          placeholder="Um passo por linha…"
          className="input-dark h-40 py-3 resize-none w-full"
        />
      ) : steps.length === 0 ? (
        <div className="card-dark p-3 text-white/60 text-rt-12">Sem instruções.</div>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="card-dark p-3 flex gap-3">
              <span className="w-7 h-7 rounded-full bg-brand text-white text-rt-13 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-white text-rt-13 flex-1">{s}</span>
            </li>
          ))}
        </ol>
      )}

      {showAdd && <FoodPickerSheet onClose={() => setShowAdd(false)} onPick={addIng} />}
    </div>
  )
}

function FoodPickerSheet({ onClose, onPick }: { onClose: () => void; onPick: (c: FoodCat, qty: number) => void }) {
  const [items, setItems] = useState<FoodCat[]>([])
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<FoodCat | null>(null)
  const [qty, setQty] = useState('100')
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('foods').select('*').order('name').limit(200)
      setItems((data as FoodCat[]) ?? [])
    })()
  }, [])
  return (
    <FullScreenSheet title="Adicionar ingrediente" onClose={onClose}>
      {!picked ? (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input-dark mb-4" />
          <ul className="flex flex-col gap-2">
            {items.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).map((x) => (
              <li key={x.id}>
                <button onClick={() => setPicked(x)} className="w-full card-dark p-3 flex items-center gap-3 text-left">
                  <Apple size={18} className="text-brand" />
                  <span className="text-white text-rt-13 font-semibold">{x.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="text-white text-rt-15 font-bold">{picked.name}</div>
          <Field label={`Cantidad (${picked.portion || '100g'})`}>
            <input inputMode="decimal" className="input-dark" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <button onClick={() => onPick(picked, Number(qty) || 0)} className="btn-save">Adicionar</button>
        </div>
      )}
    </FullScreenSheet>
  )
}
