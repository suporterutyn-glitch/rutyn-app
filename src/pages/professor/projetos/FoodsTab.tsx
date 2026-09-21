import { useEffect, useState } from 'react'
import { Plus, Apple } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { SearchBar, EmptyState, FixedBottomActions, FullScreenSheet, Field } from './RoutinesTab'

type Food = {
  id: string
  trainer_id: string | null
  name: string
  portion: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
  category: string | null
}

export function FoodsTab() {
  const { i18n } = useTranslation()
  const [items, setItems] = useState<Food[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const isSpanish = i18n.language.startsWith('es')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('foods').select('*').order('name')
    setItems((data as Food[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const filtered = items.filter((f) => {
    const q = query.toLowerCase()
    return f.name.toLowerCase().includes(q)
  })

  return (
    <div className="pb-24">
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar alimentos..." />
      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Apple} title="Nenhum alimento" body="Adicione alimentos ao seu catálogo pessoal." />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((f) => (
            <li key={f.id} className="card-dark p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                  <Apple size={20} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-14 font-bold truncate">{f.name}</div>
                  <div className="text-white/60 text-rt-11">{f.portion || '100g'} · {f.calories || 0} kcal</div>
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-rt-11">
                <span className="text-macro-protein">P {f.protein_g || 0}g</span>
                <span className="text-macro-carb">C {f.carbs_g || 0}g</span>
                <span className="text-macro-fat">G {f.fats_g || 0}g</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="btn-primary-pill h-12 rounded-btn-pill" onClick={() => setShowNew(true)}>
          <Plus size={20} /> Novo Alimento
        </button>
      </FixedBottomActions>

      {showNew && <NewFoodSheet onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
    </div>
  )
}

function NewFoodSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [portion, setPortion] = useState('100g')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!user?.id || !name.trim()) return
    setSaving(true)
    await supabase.from('foods').insert({
      trainer_id: user.id,
      name: name.trim(),
      portion: portion || '100g',
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fats_g: Number(fats) || 0,
      category: category || null,
    })
    setSaving(false)
    onCreated()
  }
  return (
    <FullScreenSheet title="Novo Alimento" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Nome"><input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Porção"><input className="input-dark" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="100g" /></Field>
        <Field label="Categoria"><input className="input-dark" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="protein, carb, fat, neutral" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calorías"><input inputMode="decimal" className="input-dark" value={calories} onChange={(e) => setCalories(e.target.value)} /></Field>
          <Field label="Proteína (g)"><input inputMode="decimal" className="input-dark" value={protein} onChange={(e) => setProtein(e.target.value)} /></Field>
          <Field label="Carboidrato (g)"><input inputMode="decimal" className="input-dark" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></Field>
          <Field label="Gordura (g)"><input inputMode="decimal" className="input-dark" value={fats} onChange={(e) => setFats(e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-8"><button className="btn-save" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Salvando...' : 'Salvar'}</button></div>
    </FullScreenSheet>
  )
}
