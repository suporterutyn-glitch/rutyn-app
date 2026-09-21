import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Field } from './projetos/RoutinesTab'

const KINDS = [
  { v: 'training', l: 'Treino' },
  { v: 'evaluation', l: 'Avaliação' },
  { v: 'meeting', l: 'Reunião' },
  { v: 'other', l: 'Outro' },
]

export function NovoCompromissoPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'training' | 'evaluation' | 'meeting' | 'other'>('training')
  const now = new Date()
  const [date, setDate] = useState(now.toISOString().slice(0, 10))
  const [time, setTime] = useState('08:00')
  const [notify, setNotify] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  async function save() {
    if (!profile?.id || !title.trim()) return
    setSaving(true)
    const startsAt = new Date(`${date}T${time}:00`).toISOString()
    const { data } = await supabase.from('appointments').insert({
      teacher_id: profile.id,
      student_id: studentId || null,
      title: title.trim(),
      kind,
      starts_at: startsAt,
      notify_student: notify && !!studentId,
      notes: notes.trim() || null,
    }).select('id').single()

    if (notify && studentId && data?.id) {
      await supabase.from('notifications').insert({
        user_id: studentId, type: 'info',
        title: `Novo compromisso: ${title.trim()}`,
        body: `${new Date(startsAt).toLocaleString('pt-BR')}`,
      })
    }
    setSaving(false)
    nav(-1)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Novo Compromisso</h1>
      </div>

      <div className="flex flex-col gap-6">
        <Field label="Título"><input className="input-dark" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Treino de peito" /></Field>
        <Field label="Tipo">
          <div className="flex gap-2 flex-wrap">
            {KINDS.map((k) => (
              <button key={k.v} type="button" onClick={() => setKind(k.v as any)} className={
                'px-3 h-9 rounded-card border text-rt-12 font-semibold ' +
                (kind === k.v ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{k.l}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><input type="date" className="input-dark" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Hora"><input type="time" className="input-dark" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Aluno (opcional)">
          <select className="input-dark" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Nenhum</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
          </select>
        </Field>
        {studentId && (
          <label className="flex items-center justify-between card-dark p-3">
            <span className="text-white text-rt-13">Notificar aluno</span>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-6 h-6 accent-brand" />
          </label>
        )}
        <Field label="Observações">
          <textarea className="input-dark h-24 py-3 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={saving || !title.trim()} onClick={save}>
          {saving ? 'Salvando…' : 'Salvar Compromisso'}
        </button>
      </div>
    </div>
  )
}
