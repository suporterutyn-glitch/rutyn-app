import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Dumbbell, GripVertical, Users, Link2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'

type Routine = { id: string; name: string; objective: string | null }
type Ex = {
  id?: string
  routine_id: string
  exercise_id: string | null
  exercise_name_snapshot: string | null
  position: number
  group_type: 'single' | 'biset' | 'triset'
  notes: string | null
  series?: Serie[]
}
type Serie = { id?: string; routine_exercise_id?: string; position: number; params: { reps?: string; load?: string; rest?: string }; notes?: string | null }
type Catalog = { id: string; name: string }

export function EditorRotinaPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [exs, setExs] = useState<Ex[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: r }, { data: re }] = await Promise.all([
      supabase.from('routines').select('id,name,objective').eq('id', id).single(),
      supabase.from('routine_exercises').select('*,series(*)').eq('routine_id', id).order('position'),
    ])
    setRoutine(r as Routine)
    // ordena séries
    const list = ((re as any[]) ?? []).map((x) => ({
      ...x,
      series: ((x.series ?? []) as Serie[]).sort((a, b) => a.position - b.position),
    }))
    setExs(list as Ex[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  async function addExercise(cat: Catalog) {
    if (!id) return
    const pos = exs.length
    const { data } = await supabase.from('routine_exercises').insert({
      routine_id: id,
      exercise_id: cat.id,
      exercise_name_snapshot: cat.name,
      position: pos,
      group_type: 'single',
    }).select('*').single()
    if (!data) return
    // Cria 3 séries default
    await supabase.from('series').insert(Array.from({ length: 3 }, (_, i) => ({
      routine_exercise_id: data.id,
      position: i,
      params: { reps: '10', load: '', rest: '90s' },
    })))
    setPickerOpen(false)
    await load()
  }

  async function removeExercise(exId: string) {
    if (!confirm('Remover este exercício?')) return
    await supabase.from('routine_exercises').delete().eq('id', exId)
    await load()
  }

  async function cycleGroup(exId: string, cur: 'single' | 'biset' | 'triset') {
    const next = cur === 'single' ? 'biset' : cur === 'biset' ? 'triset' : 'single'
    await supabase.from('routine_exercises').update({ group_type: next }).eq('id', exId)
    await load()
  }

  async function addSerie(re: Ex) {
    const pos = (re.series?.length ?? 0)
    await supabase.from('series').insert({
      routine_exercise_id: re.id,
      position: pos,
      params: { reps: '10', load: '', rest: '90s' },
    })
    await load()
  }

  async function updateSerieParams(sId: string, params: any) {
    await supabase.from('series').update({ params }).eq('id', sId)
  }

  async function removeSerie(sId: string) {
    await supabase.from('series').delete().eq('id', sId)
    await load()
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-rt-20 font-bold truncate">{routine?.name ?? '...'}</h1>
          {routine?.objective && <div className="text-white/60 text-rt-11">{routine.objective}</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : exs.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sem exercícios" body="Adicione o primeiro exercício à rotina." />
      ) : (
        <ul className="flex flex-col gap-3">
          {exs.map((re, i) => {
            const groupCls = re.group_type === 'biset' ? 'border-l-4 border-l-group-biset'
              : re.group_type === 'triset' ? 'border-l-4 border-l-group-triset' : ''
            return (
            <li key={re.id} className={'card-dark p-3 ' + groupCls}>
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={16} className="text-grey-500" />
                <span className="text-white text-rt-14 font-bold flex-1 truncate">
                  {i + 1}. {re.exercise_name_snapshot ?? 'Exercício'}
                </span>
                {re.group_type !== 'single' && (
                  <span className={
                    'text-rt-9 font-bold px-2 py-0.5 rounded-tag ' +
                    (re.group_type === 'biset' ? 'bg-group-biset/15 text-group-biset border border-group-biset/40' : 'bg-group-triset/15 text-group-triset border border-group-triset/40')
                  }>{re.group_type === 'biset' ? 'BI-SET' : 'TRI-SET'}</span>
                )}
                <button onClick={() => cycleGroup(re.id!, re.group_type)} className="w-7 h-7 rounded-md bg-surface-input flex items-center justify-center" title="Alternar bi/tri-set">
                  <Link2 size={14} className="text-brand" />
                </button>
                <button onClick={() => removeExercise(re.id!)} className="w-7 h-7 rounded-md bg-surface-input flex items-center justify-center">
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {re.series?.map((s, si) => (
                  <SerieRow key={s.id} n={si + 1} serie={s} onChange={(p) => updateSerieParams(s.id!, p)} onRemove={() => removeSerie(s.id!)} />
                ))}
                <button onClick={() => addSerie(re)} className="text-brand text-rt-12 font-semibold flex items-center gap-1 mt-1">
                  <Plus size={14} /> Nova série
                </button>
              </div>
            </li>
            )
          })}
        </ul>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] flex gap-2 bg-bg-app/95 backdrop-blur">
        <button onClick={() => setPickerOpen(true)} className="flex-1 h-12 rounded-btn-pill bg-brand text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
          <Plus size={18} /> Exercício
        </button>
        {profile && exs.length > 0 && (
          <button onClick={() => setAssignOpen(true)} className="flex-1 h-12 rounded-btn-pill bg-charge text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
            <Users size={18} /> Atribuir
          </button>
        )}
      </div>

      {pickerOpen && <ExercisePicker onClose={() => setPickerOpen(false)} onPick={addExercise} />}
      {assignOpen && routine && <AssignSheet routine={routine} exercises={exs} onClose={() => setAssignOpen(false)} />}
    </div>
  )
}

function SerieRow({ n, serie, onChange, onRemove }: {
  n: number; serie: Serie
  onChange: (p: Serie['params']) => void
  onRemove: () => void
}) {
  const [p, setP] = useState(serie.params ?? {})
  return (
    <div className="flex items-center gap-2 bg-surface-input rounded-lg p-2">
      <span className="text-white text-rt-13 font-bold w-6 text-center">{n}</span>
      <input
        value={p.reps ?? ''} onChange={(e) => { const np = { ...p, reps: e.target.value }; setP(np); onChange(np) }}
        placeholder="reps" className="w-14 bg-transparent border-b border-brand/30 text-white text-rt-12 outline-none text-center py-0.5"
      />
      <input
        value={p.load ?? ''} onChange={(e) => { const np = { ...p, load: e.target.value }; setP(np); onChange(np) }}
        placeholder="kg" className="w-14 bg-transparent border-b border-brand/30 text-white text-rt-12 outline-none text-center py-0.5"
      />
      <input
        value={p.rest ?? ''} onChange={(e) => { const np = { ...p, rest: e.target.value }; setP(np); onChange(np) }}
        placeholder="desc" className="w-16 bg-transparent border-b border-brand/30 text-white text-rt-12 outline-none text-center py-0.5"
      />
      <button onClick={onRemove} className="w-6 h-6 rounded-md bg-surface-card flex items-center justify-center ml-auto">
        <Trash2 size={12} className="text-danger" />
      </button>
    </div>
  )
}

function ExercisePicker({ onClose, onPick }: { onClose: () => void; onPick: (c: Catalog) => void }) {
  const [items, setItems] = useState<Catalog[]>([])
  const [q, setQ] = useState('')
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('exercises').select('id,name').order('name').limit(200)
      setItems((data as Catalog[]) ?? [])
    })()
  }, [])
  const filtered = items.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <FullScreenSheet title="Escolher exercício" onClose={onClose}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input-dark mb-4" />
      {items.length === 0 ? (
        <div className="text-white/60 text-rt-13">
          Você ainda não tem exercícios. Adicione em Meus Projetos → Exercícios.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((x) => (
            <li key={x.id}>
              <button onClick={() => onPick(x)} className="w-full card-dark p-3 flex items-center gap-3 text-left">
                <Dumbbell size={18} className="text-brand" />
                <span className="text-white text-rt-13 font-semibold">{x.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </FullScreenSheet>
  )
}

function AssignSheet({ routine, exercises, onClose }: { routine: Routine; exercises: Ex[]; onClose: () => void }) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [startsOn, setStartsOn] = useState(new Date().toISOString().slice(0, 10))
  const [endsOn, setEndsOn] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
  const [freq, setFreq] = useState(3)
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  function toggle(id: string) {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }
  function toggleDay(d: number) {
    if (days.includes(d)) setDays(days.filter((x) => x !== d))
    else if (days.length < freq) setDays([...days, d].sort())
  }

  function estimateWorkouts() {
    const s = new Date(startsOn + 'T00:00:00')
    const e = new Date(endsOn + 'T00:00:00')
    let n = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) n++
    }
    return n
  }

  async function assign() {
    if (!profile?.id || selected.size === 0) return
    setSaving(true)
    const snapshot = { exercises: exercises.map((e) => ({ name: e.exercise_name_snapshot, series: e.series?.length ?? 0 })) }
    const est = estimateWorkouts()
    const dist = distribute(est, selected.size)
    const arr = Array.from(selected).map((sid, i) => ({
      student_id: sid,
      teacher_id: profile.id,
      source_routine_id: routine.id,
      name: routine.name,
      objective: (routine as any).objective ?? null,
      starts_on: startsOn, ends_on: endsOn, weekdays: days.slice(0, freq), frequency: freq,
      estimated_workouts: dist[i],
      data: snapshot,
    }))
    await supabase.from('student_routines').insert(arr)
    // Notifica
    await supabase.from('notifications').insert(Array.from(selected).map((sid) => ({
      user_id: sid, type: 'routine', title: 'Nova rotina',
      body: `${profile.full_name ?? 'Seu professor'} atribuiu a rotina "${routine.name}".`,
    })))
    setSaving(false)
    onClose()
  }

  return (
    <FullScreenSheet title="Atribuir a alunos" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label={`Alunos (${selected.size})`}>
          {students.length === 0 ? (
            <div className="text-white/60 text-rt-13">Nenhum aluno ativo.</div>
          ) : (
            <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><input type="date" className="input-dark" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
          <Field label="Fim"><input type="date" className="input-dark" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></Field>
        </div>
        <Field label="Frequência semanal">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => { setFreq(n); if (days.length > n) setDays(days.slice(0, n)) }} className={
                'w-9 h-9 rounded-full text-rt-12 font-semibold ' +
                (freq === n ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{n}x</button>
            ))}
          </div>
        </Field>
        <Field label={`Dias (${days.length}/${freq})`}>
          <div className="flex gap-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)} className={
                'flex-1 h-10 rounded-lg text-rt-12 font-semibold ' +
                (days.includes(i) ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{l}</button>
            ))}
          </div>
        </Field>
        <div className="card-dark p-3 text-white/70 text-rt-12">
          Estimativa: <strong className="text-brand">{estimateWorkouts()}</strong> treinos no período.
        </div>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || selected.size === 0 || days.length !== freq} onClick={assign}>
          {saving ? 'Atribuindo…' : 'Atribuir'}
        </button>
      </div>
    </FullScreenSheet>
  )
}

function distribute(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const rest = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}
