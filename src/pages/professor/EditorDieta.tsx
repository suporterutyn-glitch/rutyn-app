import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Salad, Apple, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'
import { useAuth } from '@/lib/auth'

type Diet = { id: string; name: string; goal: string | null }
type Meal = { id: string; diet_id: string; name: string; time_of_day: string | null; position: number; foods?: MealFood[] }
type MealFood = { id: string; meal_id: string; food_id: string | null; food_name_snapshot: string | null; quantity: number; position: number }
type FoodCat = { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; portion: string }

export function EditorDietaPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  useAuth() // ensures auth
  const [diet, setDiet] = useState<Diet | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [foodsMap, setFoodsMap] = useState<Map<string, FoodCat>>(new Map())
  const [loading, setLoading] = useState(true)
  const [pickerFor, setPickerFor] = useState<string | null>(null) // meal_id
  const [assignOpen, setAssignOpen] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: d }, { data: m }] = await Promise.all([
      supabase.from('diets').select('*').eq('id', id).single(),
      supabase.from('meals').select('*,meal_foods(*)').eq('diet_id', id).order('position'),
    ])
    setDiet(d as Diet)
    const list = ((m as any[]) ?? []).map((x) => ({ ...x, foods: (x.meal_foods ?? []).sort((a: any, b: any) => a.position - b.position) }))
    setMeals(list as Meal[])
    // busca dados dos alimentos que aparecem
    const ids = new Set<string>()
    list.forEach((mm: any) => mm.foods.forEach((f: any) => f.food_id && ids.add(f.food_id)))
    if (ids.size > 0) {
      const { data: f } = await supabase.from('foods').select('*').in('id', Array.from(ids))
      const map = new Map<string, FoodCat>()
      ;(f as FoodCat[] | null)?.forEach((x) => map.set(x.id, x))
      setFoodsMap(map)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  async function addMeal() {
    if (!id) return
    await supabase.from('meals').insert({ diet_id: id, name: `Refeição ${meals.length + 1}`, position: meals.length, time_of_day: null })
    await load()
  }

  async function updateMealName(mId: string, name: string) {
    await supabase.from('meals').update({ name }).eq('id', mId)
  }
  async function updateMealTime(mId: string, time_of_day: string) {
    await supabase.from('meals').update({ time_of_day }).eq('id', mId)
  }
  async function removeMeal(mId: string) {
    if (!confirm('Remover refeição?')) return
    await supabase.from('meals').delete().eq('id', mId)
    await load()
  }

  async function addFood(mealId: string, cat: FoodCat, quantity = 100) {
    const meal = meals.find((mm) => mm.id === mealId)
    const pos = meal?.foods?.length ?? 0
    await supabase.from('meal_foods').insert({
      meal_id: mealId, food_id: cat.id, food_name_snapshot: cat.name,
      quantity, position: pos,
    })
    setPickerFor(null)
    await load()
  }
  async function updateFoodQty(fid: string, quantity: number) {
    await supabase.from('meal_foods').update({ quantity }).eq('id', fid)
  }
  async function removeFood(fid: string) {
    await supabase.from('meal_foods').delete().eq('id', fid)
    await load()
  }

  // macros
  function foodMacros(f: MealFood) {
    const cat = f.food_id ? foodsMap.get(f.food_id) : null
    if (!cat) return { kcal: 0, p: 0, c: 0, fat: 0 }
    const portionNum = cat.portion ? parseFloat(cat.portion) : 100
    const ratio = Number(f.quantity) / portionNum
    return { kcal: Number(cat.calories || 0) * ratio, p: Number(cat.protein_g || 0) * ratio, c: Number(cat.carbs_g || 0) * ratio, fat: Number(cat.fats_g || 0) * ratio }
  }
  const totals = meals.reduce((acc, m) => {
    m.foods?.forEach((f) => {
      const mm = foodMacros(f)
      acc.kcal += mm.kcal; acc.p += mm.p; acc.c += mm.c; acc.fat += mm.fat
    })
    return acc
  }, { kcal: 0, p: 0, c: 0, fat: 0 })

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-rt-20 font-bold truncate">{diet?.name ?? '...'}</h1>
          {diet?.goal && <div className="text-white/60 text-rt-11">{diet.goal}</div>}
        </div>
      </div>

      <div className="card-dark p-3 mb-4 grid grid-cols-4 gap-2 text-center">
        {[
          { l: 'kcal', v: totals.kcal, c: 'text-macro-kcal' },
          { l: 'P', v: totals.p, c: 'text-macro-protein' },
          { l: 'C', v: totals.c, c: 'text-macro-carb' },
          { l: 'G', v: totals.fat, c: 'text-macro-fat' },
        ].map((m) => (
          <div key={m.l}>
            <div className={'text-rt-18 font-bold ' + m.c}>{Math.round(m.v)}</div>
            <div className="text-grey-500 text-rt-10 uppercase">{m.l}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : meals.length === 0 ? (
        <EmptyState icon={Salad} title="Sem refeições" body="Adicione a primeira refeição da dieta." />
      ) : (
        <ul className="flex flex-col gap-3">
          {meals.map((m) => (
            <li key={m.id} className="card-dark p-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  defaultValue={m.name} onBlur={(e) => updateMealName(m.id, e.target.value)}
                  className="flex-1 bg-transparent text-white text-rt-14 font-bold outline-none border-b border-transparent focus:border-brand"
                />
                <input
                  type="time" defaultValue={m.time_of_day ?? ''} onBlur={(e) => updateMealTime(m.id, e.target.value)}
                  className="w-20 bg-surface-input rounded px-2 py-1 text-white text-rt-11 outline-none"
                />
                <button onClick={() => removeMeal(m.id)} className="w-7 h-7 rounded-md bg-surface-input flex items-center justify-center">
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {m.foods?.map((f) => {
                  const mm = foodMacros(f)
                  return (
                    <li key={f.id} className="flex items-center gap-2 bg-surface-input rounded-lg p-2">
                      <input
                        type="number" defaultValue={f.quantity} onBlur={(e) => updateFoodQty(f.id, Number(e.target.value) || 0)}
                        className="w-16 bg-transparent border-b border-brand/30 text-white text-rt-12 outline-none text-center"
                      />
                      <span className="text-grey-500 text-rt-11">g</span>
                      <span className="flex-1 text-white text-rt-13 truncate">{f.food_name_snapshot}</span>
                      <span className="text-brand text-rt-11 font-semibold">{Math.round(mm.kcal)}kcal</span>
                      <button onClick={() => removeFood(f.id)} className="w-6 h-6 rounded-md bg-surface-card flex items-center justify-center">
                        <Trash2 size={12} className="text-danger" />
                      </button>
                    </li>
                  )
                })}
                <button onClick={() => setPickerFor(m.id)} className="text-brand text-rt-12 font-semibold flex items-center gap-1 mt-1">
                  <Plus size={14} /> Alimento
                </button>
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] flex gap-2 bg-surface-app/95 backdrop-blur">
        <button onClick={addMeal} className="flex-1 h-12 rounded-btn-pill bg-brand text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
          <Plus size={18} /> Refeição
        </button>
        {meals.length > 0 && (
          <button onClick={() => setAssignOpen(true)} className="flex-1 h-12 rounded-btn-pill bg-charge text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
            <Users size={18} /> Atribuir
          </button>
        )}
      </div>

      {pickerFor && <FoodPicker onClose={() => setPickerFor(null)} onPick={(c, qty) => addFood(pickerFor, c, qty)} />}
      {assignOpen && diet && <AssignDietSheet diet={diet} meals={meals} foodsMap={foodsMap} onClose={() => setAssignOpen(false)} />}
    </div>
  )
}

function FoodPicker({ onClose, onPick }: { onClose: () => void; onPick: (c: FoodCat, qty: number) => void }) {
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
  const filtered = items.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <FullScreenSheet title="Adicionar alimento" onClose={onClose}>
      {!picked ? (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input-dark mb-4" />
          {items.length === 0 ? (
            <div className="text-white/60 text-rt-13">Você ainda não tem alimentos. Adicione em Meus Projetos → Alimentos.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((x) => (
                <li key={x.id}>
                  <button onClick={() => setPicked(x)} className="w-full card-dark p-3 flex items-center gap-3 text-left">
                    <Apple size={18} className="text-brand" />
                    <div className="flex-1">
                      <div className="text-white text-rt-13 font-semibold">{x.name}</div>
                      <div className="text-grey-500 text-rt-10">{x.portion}g · {Number(x.calories)} kcal</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="text-white text-rt-15 font-bold">{picked.name}</div>
          <Field label={`Quantidade (${picked.portion || '100g'})`}>
            <input inputMode="decimal" className="input-dark" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <div className="grid grid-cols-4 gap-2 text-center card-dark p-3">
            {(() => {
              const r = (Number(qty) || 0) / Number(picked.portion || 100)
              return [
                { l: 'kcal', v: Number(picked.calories) * r, c: 'text-macro-kcal' },
                { l: 'P', v: Number(picked.protein_g) * r, c: 'text-macro-protein' },
                { l: 'C', v: Number(picked.carbs_g) * r, c: 'text-macro-carb' },
                { l: 'G', v: Number(picked.fats_g) * r, c: 'text-macro-fat' },
              ].map((m) => (
                <div key={m.l}><div className={'text-rt-15 font-bold ' + m.c}>{Math.round(m.v)}</div><div className="text-grey-500 text-rt-10 uppercase">{m.l}</div></div>
              ))
            })()}
          </div>
          <button onClick={() => onPick(picked, Number(qty) || 0)} className="btn-save">Adicionar</button>
        </div>
      )}
    </FullScreenSheet>
  )
}

function AssignDietSheet({ diet, meals, foodsMap, onClose }: {
  diet: Diet; meals: Meal[]
  foodsMap: Map<string, FoodCat>
  onClose: () => void
}) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles').select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  function toggle(id: string) {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }

  async function assign() {
    if (!profile?.id || selected.size === 0) return
    setSaving(true)
    const snapshot = {
      meals: meals.map((m) => ({
        name: m.name,
        foods: (m.foods ?? []).map((f) => {
          const cat = f.food_id ? foodsMap.get(f.food_id) : null
          const r = cat ? Number(f.quantity) / Number(cat.portion || 100) : 1
          return {
            name: f.food_name_snapshot, qty: Number(f.quantity), unit: 'g',
            kcal: cat ? Number(cat.calories) * r : 0,
            p: cat ? Number(cat.protein_g) * r : 0,
            c: cat ? Number(cat.carbs_g) * r : 0,
            f: cat ? Number(cat.fats_g) * r : 0,
          }
        }),
      })),
    }
    const arr = Array.from(selected).map((sid) => ({
      student_id: sid, teacher_id: profile.id, source_diet_id: diet.id,
      name: diet.name, data: snapshot,
    }))
    await supabase.from('student_diets').insert(arr)
    await supabase.from('notifications').insert(Array.from(selected).map((sid) => ({
      user_id: sid, type: 'routine', title: 'Nova dieta',
      body: `${profile.full_name ?? 'Seu professor'} atribuiu a dieta "${diet.name}".`,
    })))
    setSaving(false)
    onClose()
  }

  return (
    <FullScreenSheet title="Atribuir dieta" onClose={onClose}>
      <Field label={`Alunos (${selected.size})`}>
        {students.length === 0 ? (
          <div className="text-white/60 text-rt-13">Nenhum aluno ativo.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {students.map((s) => (
              <li key={s.id}>
                <button onClick={() => toggle(s.id)} className={
                  'w-full flex items-center gap-3 p-3 rounded-card border ' +
                  (selected.has(s.id) ? 'bg-brand/20 border-brand' : 'bg-transparent border-grey-700')
                }>
                  <div className={'w-5 h-5 rounded-sm border-2 flex items-center justify-center ' + (selected.has(s.id) ? 'bg-brand border-brand' : 'border-grey-500')}>
                    {selected.has(s.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className="text-white text-rt-13 flex-1 text-left truncate">{s.full_name ?? s.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || selected.size === 0} onClick={assign}>
          {saving ? 'Atribuindo…' : 'Atribuir'}
        </button>
      </div>
    </FullScreenSheet>
  )
}
