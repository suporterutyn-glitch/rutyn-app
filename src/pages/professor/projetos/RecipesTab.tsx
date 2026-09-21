import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChefHat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { SearchBar, EmptyState, FixedBottomActions, FullScreenSheet, Field } from './RoutinesTab'

type Recipe = { id: string; name: string; instructions: string | null }

export function RecipesTab() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [items, setItems] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase.from('recipes').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false })
    setItems((data as Recipe[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id])

  const filtered = items.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="pb-24">
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar receitas..." />
      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nenhuma receita" body="Crie receitas para incluir nas dietas dos alunos." />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <button onClick={() => nav(`/receita/${r.id}`)} className="w-full card-dark p-4 flex items-center gap-3 text-left active:scale-[0.99]">
                <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                  <ChefHat size={20} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-14 font-bold truncate">{r.name}</div>
                  <div className="text-white/60 text-rt-11 truncate">{r.instructions?.slice(0, 60) || 'Sem instruções'}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="btn-primary-pill h-12 rounded-btn-pill" onClick={() => setShowNew(true)}>
          <Plus size={20} /> Nova Receita
        </button>
      </FixedBottomActions>

      {showNew && <NewRecipeSheet onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
    </div>
  )
}

function NewRecipeSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!profile?.id || !name.trim()) return
    setSaving(true)
    await supabase.from('recipes').insert({ owner_id: profile.id, name: name.trim(), instructions: instructions || null })
    setSaving(false)
    onCreated()
  }
  return (
    <FullScreenSheet title="Nova Receita" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Nome"><input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Modo de preparo">
          <textarea className="input-dark h-40 py-3 resize-none" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Passo a passo..." />
        </Field>
      </div>
      <div className="mt-8"><button className="btn-save" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Salvando...' : 'Salvar'}</button></div>
    </FullScreenSheet>
  )
}
