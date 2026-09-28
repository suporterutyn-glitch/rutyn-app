import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { useAuth } from '@/lib/auth'
import { Field } from './projetos/RoutinesTab'
import { aviso } from '@/lib/avisos'
import { mensajeError } from '@/lib/errores'

const KINDS = [
  { v: 'training', l: 'prof:appt.training' },
  { v: 'evaluation', l: 'prof:appt.assessment' },
  { v: 'meeting', l: 'prof:appt.meeting' },
  { v: 'other', l: 'prof:appt.other' },
]

export function NovoCompromissoPage() {
  const { t } = useTranslation()
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
  const [errorAviso, setErrorAviso] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  async function save() {
    setValidationError(null)

    if (!title.trim()) {
      setValidationError(t('prof:appt.nameRequired'))
      return
    }

    if (!profile?.id) {
      setValidationError(t('prof:appt.errorSaving'))
      return
    }

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
      // Si el aviso falla el compromiso igual existe, pero el alumno no se entera:
      // por eso se dice, en vez de seguir como si nada.
      const { error } = await supabase.from('notifications').insert({
        user_id: studentId, type: 'info',
        ...aviso('appointment', { name: title.trim(), at: new Date(startsAt).toISOString() }),
      })
      if (error) { setSaving(false); setErrorAviso(mensajeError(error)); return }
    }
    setSaving(false)
    nav(-1)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24 md:max-w-form md:mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('prof:appt.title')}</h1>
      </div>

      <div className="flex flex-col gap-6">
        <Field label={t('prof:appt.name')}><input className="input-dark" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('prof:appt.namePh')} /></Field>
        <Field label={t('prof:appt.type')}>
          <div className="flex gap-2 flex-wrap">
            {KINDS.map((k) => (
              <button key={k.v} type="button" onClick={() => setKind(k.v as any)} className={
                'px-3 h-9 rounded-card border text-rt-12 font-semibold ' +
                (kind === k.v ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{t(k.l)}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('prof:appt.date')}><input type="date" className="input-dark" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('prof:appt.time')}><input type="time" className="input-dark" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label={t('prof:appt.studentOpt')}>
          <select className="input-dark" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">{t('prof:appt.none')}</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
          </select>
        </Field>
        {studentId && (
          <label className="flex items-center justify-between card-dark p-3">
            <span className="text-white text-rt-13">{t('prof:appt.notify')}</span>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-6 h-6 accent-brand" />
          </label>
        )}
        <Field label={t('prof:appt.notes')}>
          <textarea className="input-dark h-24 py-3 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      {validationError && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger rounded-lg text-danger text-rt-13 font-semibold">
          {validationError}
        </div>
      )}

      <div className="mt-8">
        <button className="btn-save" disabled={saving || !title.trim()} onClick={save}>
          {saving ? t('prof:appt.saving') : t('prof:appt.save')}
        </button>
      </div>
      {errorAviso && (
        <FeedbackDialog kind="error" message={errorAviso} onClose={() => setErrorAviso(null)} />
      )}
    </div>
  )
}
