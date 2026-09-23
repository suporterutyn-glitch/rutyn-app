import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Star, X, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type Routine = {
  id: string
  name: string
  objective: string | null
  difficulty: string | null
  is_favorite: boolean
  created_at: string
}

export function RoutinesTab() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [items, setItems] = useState<Routine[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('routines')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false })
    setItems((data as Routine[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  const filtered = items.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="pb-24">
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar rotinas..." />

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhuma rotina ainda"
          body="Crie sua primeira rotina para poder atribuir aos seus alunos."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <button onClick={() => nav(`/professor/rotinas/${r.id}`)} className="w-full card-dark p-4 flex items-center gap-3 text-left active:scale-[0.99]">
                <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                  <Dumbbell size={20} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-14 font-bold truncate">{r.name}</div>
                  <div className="text-white/60 text-rt-11 truncate">
                    {[r.objective, r.difficulty].filter(Boolean).join(' · ') || 'Sem descrição'}
                  </div>
                </div>
                {r.is_favorite && <Star size={18} className="text-macro-carb fill-macro-carb" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="btn-primary-pill h-12 rounded-btn-pill" onClick={() => setShowNew(true)}>
          <Plus size={20} /> Criar nova Rotina
        </button>
      </FixedBottomActions>

      {showNew && (
        <NewRoutineSheet
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void load() }}
        />
      )}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[42px] pl-11 pr-10 rounded-[20px] bg-black/30 border border-brand/30 text-white text-rt-13 placeholder:text-grey-600 outline-none focus:border-brand"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500" aria-label="Limpar">
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center">
        <Icon size={32} className="text-grey-600" />
      </div>
      <div className="text-white text-rt-15 font-bold">{title}</div>
      <div className="text-white/60 text-rt-13 max-w-[280px]">{body}</div>
    </div>
  )
}

export function FixedBottomActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pt-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}
    >
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}

function NewRoutineSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [difficulty, setDifficulty] = useState<'iniciante' | 'intermediario' | 'avancado' | ''>('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!profile?.id || !name.trim()) return
    setSaving(true)
    await supabase.from('routines').insert({
      owner_id: profile.id,
      name: name.trim(),
      objective: objective.trim() || null,
      difficulty: difficulty || null,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <FullScreenSheet title="Criar nova Rotina" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Nome">
          <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Treino A - Peito" />
        </Field>
        <Field label="Objetivo">
          <input className="input-dark" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex: Hipertrofia" />
        </Field>
        <Field label="Dificuldade">
          <div className="flex gap-2">
            {(['iniciante', 'intermediario', 'avancado'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={
                  'flex-1 h-10 rounded-[20px] border text-rt-12 font-semibold capitalize ' +
                  (difficulty === d
                    ? 'bg-brand border-brand text-white'
                    : 'bg-transparent border-grey-700 text-grey-400')
                }
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || !name.trim()} onClick={save}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </FullScreenSheet>
  )
}

export function FullScreenSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-surface-card overflow-y-auto overflow-x-hidden animate-slide-up-in">
      <div className="max-w-app mx-auto min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+80px)] pb-8 relative">
        <button
          onClick={onClose}
          className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold mb-8">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white text-rt-13 font-semibold mb-2">{label}</label>
      {children}
    </div>
  )
}
