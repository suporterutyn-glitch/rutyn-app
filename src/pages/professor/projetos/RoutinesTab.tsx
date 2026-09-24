import { useEffect, useState } from 'react'
import { coincide, textosRutina } from '@/lib/busqueda'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { RoutineCard } from './RoutineCard'
import { EditorRotina } from '@/pages/professor/EditorRotina'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { dificultades, objetivosTreino } from '@/lib/catalogos'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'

import type { Filtro } from '../MeusProjetos'

type Routine = {
  id: string
  name: string
  objective: string | null
  difficulty: string | null
  is_favorite: boolean
  created_at: string
  routine_exercises?: { exercise_name_snapshot: string | null; exercises: { name_pt: string | null; name_es: string | null; name_en: string | null; muscle_group: string | null; muscle_groups: string[] | null; category: string | null; equipment: string | null } | null }[]
}

export function RoutinesTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { profile } = useAuth()
  const nav = useNavigate()
  const { t } = useTranslation()
  const [items, setItems] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editando, setEditando] = useState<Routine | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [confirmando, setConfirmando] = useState<{ ids: string[]; nombre?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // La rotina se edita acá adentro, expandiendo la tarjeta (prints 017 a 027).
  const [expandida, setExpandida] = useState<string | null>(null)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('routines')
      .select('*,routine_exercises(exercise_name_snapshot,exercises(name_pt,name_es,name_en,muscle_group,muscle_groups,category,equipment))')
      .eq('owner_id', profile.id)
      .is('student_id', null)
      .order('created_at', { ascending: false })
    setItems((data as Routine[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  const filtered = items
    .filter((r) => (filtro === 'favoritos' ? r.is_favorite : true))
    .filter((r) => coincide(query, textosRutina(r, (r.routine_exercises ?? []).map((x) => ({ name: x.exercise_name_snapshot, ...(x.exercises ?? {}) })))))

  function toggleSeleccion(id: string) {
    const n = new Set(seleccion)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSeleccion(n)
  }

  async function toggleFavorito(r: Routine) {
    // Optimista: la estrella responde al toque y se corrige si falla.
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_favorite: !x.is_favorite } : x)))
    const { error: e } = await supabase.from('routines').update({ is_favorite: !r.is_favorite }).eq('id', r.id)
    if (e) { setError(e.message); void load() }
  }

  async function duplicar(r: Routine) {
    const { error: e } = await supabase.rpc('duplicar_rotina', { rotina_id: r.id })
    if (e) { setError(e.message); return }
    await load()
  }

  async function excluir(ids: string[]) {
    setConfirmando(null)
    const { error: e } = await supabase.from('routines').delete().in('id', ids)
    if (e) { setError(e.message); return }
    setSeleccion(new Set())
    await load()
  }

  return (
    <div className="pb-24">
      {seleccion.size > 0 && (
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setConfirmando({ ids: [...seleccion] })}
            className="h-10 px-6 rounded-btn-pill bg-[#D32F2F] text-white text-rt-14 font-semibold"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={() => setSeleccion(new Set(filtered.map((r) => r.id)))}
            className="text-white/80 text-rt-14"
          >
            Selecionar tudo
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={
            query ? t('projects:nothingFound')
              : filtro === 'favoritos' ? t('projects:noFavorites')
                : t('projects:noRoutines')
          }
          body={
            query ? t('projects:nothingFoundSub')
              : filtro === 'favoritos' ? t('projects:noFavoritesSub')
                : t('projects:noRoutinesSub')
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.id} className="flex flex-col gap-0">
            <RoutineCard
              rotina={r}
              seleccionada={seleccion.has(r.id)}
              modoSeleccion={seleccion.size > 0}
              onToggleSeleccion={() => toggleSeleccion(r.id)}
              onFavorito={() => void toggleFavorito(r)}
              onClonar={() => nav(`/professor/rotinas/${r.id}?clonar=1`)}
              onDuplicar={() => void duplicar(r)}
              onEditar={() => setEditando(r)}
              onExcluir={() => setConfirmando({ ids: [r.id], nombre: r.name })}
              expandida={expandida === r.id}
              onExpandir={() => setExpandida((v) => (v === r.id ? null : r.id))}
            />
            {expandida === r.id && (
              <div className="mt-2 pl-2 border-l-2 border-brand/40">
                <EditorRotina routineId={r.id} embebido />
              </div>
            )}
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

      {editando && (
        <NewRoutineSheet
          rotina={editando}
          onClose={() => setEditando(null)}
          onCreated={() => { setEditando(null); void load() }}
        />
      )}

      {confirmando && (
        <ConfirmDialog
          message={confirmando.ids.length > 1 ? 'Excluir rotinas' : 'Excluir rotina'}
          detail={
            confirmando.nombre
              ? `Tem certeza que deseja excluir "${confirmando.nombre}"?`
              : `Tem certeza que deseja excluir ${confirmando.ids.length} rotina(s)?`
          }
          confirmLabel="Excluir"
          tone="danger"
          onConfirm={() => void excluir(confirmando.ids)}
          onCancel={() => setConfirmando(null)}
        />
      )}

      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
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

function NewRoutineSheet({ rotina, onClose, onCreated }: { rotina?: Routine; onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const editando = Boolean(rotina)
  const [name, setName] = useState(rotina?.name ?? '')
  const [difficulty, setDifficulty] = useState(rotina?.difficulty ?? '')
  const [objective, setObjective] = useState(rotina?.objective ?? '')
  const [abriendo, setAbriendo] = useState<'dificuldade' | 'objetivo' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!profile?.id || !name.trim()) return
    setSaving(true)
    const campos = {
      name: name.trim(),
      objective: objective || null,
      difficulty: difficulty || null,
    }
    const { error: e } = rotina
      ? await supabase.from('routines').update(campos).eq('id', rotina.id)
      : await supabase.from('routines').insert({ owner_id: profile.id, ...campos })
    setSaving(false)
    if (e) { setError(e.message); return }
    onCreated()
  }

  return (
    <FullScreenSheet title={editando ? 'Editar Rotina' : 'Nova Rotina'} onClose={onClose}>
      <div className="flex flex-col gap-7">
        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">Nome da Rotina</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="TREINO - A"
          />
        </div>

        <CajaSelector
          label="Dificuldade"
          valor={difficulty}
          placeholder="Iniciante"
          lista={dificultades}
          lang={i18n.language}
          onAbrir={() => setAbriendo('dificuldade')}
        />

        <CajaSelector
          label="Objetivo"
          valor={objective}
          placeholder="Hipertrofia"
          lista={objetivosTreino}
          lang={i18n.language}
          onAbrir={() => setAbriendo('objetivo')}
        />
      </div>

      <div className="mt-10">
        <button className="btn-save" disabled={saving || !name.trim()} onClick={save}>
          {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar Rotina'}
        </button>
      </div>

      {abriendo === 'dificuldade' && (
        <HojaRadio
          lista={dificultades}
          valor={difficulty}
          lang={i18n.language}
          onElegir={(id) => { setDifficulty(id); setAbriendo(null) }}
          onCerrar={() => setAbriendo(null)}
        />
      )}
      {abriendo === 'objetivo' && (
        <HojaRadio
          lista={objetivosTreino}
          valor={objective}
          lang={i18n.language}
          onElegir={(id) => { setObjective(id); setAbriendo(null) }}
          onCerrar={() => setAbriendo(null)}
        />
      )}

      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
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
