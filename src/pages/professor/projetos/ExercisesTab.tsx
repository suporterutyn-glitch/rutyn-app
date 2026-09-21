import { useEffect, useState } from 'react'
import { Plus, Dumbbell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { SearchBar, EmptyState, FixedBottomActions, FullScreenSheet, Field } from './RoutinesTab'

type Exercise = {
  id: string
  trainer_id: string | null
  name: string
  muscle_group: string | null
  video_url: string | null
  thumbnail_url: string | null
  description: string | null
}

export function ExercisesTab() {
  const { profile: _profile } = useAuth()
  const { i18n: _i18n } = useTranslation()
  const [items, setItems] = useState<Exercise[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name')
    setItems((data as Exercise[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = items.filter((e) => {
    const q = query.toLowerCase()
    return e.name.toLowerCase().includes(q)
  })

  return (
    <div className="pb-24">
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar exercícios..." />

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum exercício" body="Adicione exercícios ao seu catálogo pessoal." />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((e) => (
            <li key={e.id} className="card-dark p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                <Dumbbell size={20} className="text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-rt-14 font-bold truncate">{e.name}</div>
                <div className="text-white/60 text-rt-11 truncate">
                  {e.muscle_group || 'Sin grupo'}
                </div>
              </div>
              {e.trainer_id === null && (
                <span className="text-rt-9 font-bold px-2 py-0.5 rounded-tag bg-brand/15 text-brand border border-brand/30">
                  Global
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="btn-primary-pill h-12 rounded-btn-pill" onClick={() => setShowNew(true)}>
          <Plus size={20} /> Novo Exercício
        </button>
      </FixedBottomActions>

      {showNew && <NewExerciseSheet onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
    </div>
  )
}

function NewExerciseSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user?.id || !name.trim()) return
    setSaving(true)
    await supabase.from('exercises').insert({
      trainer_id: user.id,
      name: name.trim(),
      muscle_group: muscle || null,
      description: description || null,
      video_url: videoUrl || null,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <FullScreenSheet title="Novo Exercício" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Nombre">
          <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Press de banca" />
        </Field>
        <Field label="Grupo muscular">
          <input className="input-dark" value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Ex: Pecho" />
        </Field>
        <Field label="Descripción (opcional)">
          <input className="input-dark" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas sobre el ejercicio" />
        </Field>
        <Field label="URL del vídeo (opcional)">
          <input className="input-dark" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </Field>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || !name.trim()} onClick={save}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </FullScreenSheet>
  )
}
