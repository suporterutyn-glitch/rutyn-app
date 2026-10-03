import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/lib/auth'
import { Field } from './projetos/RoutinesTab'
import { aviso } from '@/lib/avisos'
import { mensajeError } from '@/lib/errores'
import { localeDe } from '@/lib/fechas'

const KINDS = [
  { v: 'training', l: 'prof:appt.training' },
  { v: 'evaluation', l: 'prof:appt.assessment' },
  { v: 'meeting', l: 'prof:appt.meeting' },
  { v: 'other', l: 'prof:appt.other' },
]
const SEMANAS = [4, 8, 12]
const MAX_SERIE = 60

type Cita = {
  id: string; title: string; kind: string; starts_at: string; student_id: string | null; student_name: string | null
  location: string | null; notes: string | null; notify_student: boolean; series_id: string | null
}

const fechaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const horaLocal = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Crear (/compromisso/novo) o editar (/compromisso/:id) un compromiso de la agenda. */
export function NovoCompromissoPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { id } = useParams()
  const { profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [original, setOriginal] = useState<Cita | null>(null)
  const [cargando, setCargando] = useState(!!id)
  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'training' | 'evaluation' | 'meeting' | 'other'>('training')
  const [date, setDate] = useState(fechaLocal(new Date()))
  const [time, setTime] = useState('08:00')
  const [location, setLocation] = useState('')
  const [notify, setNotify] = useState(true)
  const [notes, setNotes] = useState('')
  const [repetir, setRepetir] = useState(false)
  const [dias, setDias] = useState<number[]>([])
  const [semanas, setSemanas] = useState(4)
  const [saving, setSaving] = useState(false)
  const [errorAviso, setErrorAviso] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  useEffect(() => {
    if (!id || !profile?.id) return
    void (async () => {
      const { data } = await supabase.from('appointments')
        .select('id,title,kind,starts_at,student_id,student_name,location,notes,notify_student,series_id')
        .eq('id', id).eq('teacher_id', profile.id).maybeSingle()
      const c = data as Cita | null
      if (c) {
        const d = new Date(c.starts_at)
        setOriginal(c); setTitle(c.title); setKind(c.kind as typeof kind); setDate(fechaLocal(d)); setTime(horaLocal(d))
        setStudentId(c.student_id ?? ''); setLocation(c.location ?? ''); setNotes(c.notes ?? ''); setNotify(c.notify_student)
      }
      setCargando(false)
    })()
  }, [id, profile?.id])

  // Al repetir, arranca marcado el día de la semana de la fecha elegida.
  const diaElegido = new Date(`${date}T12:00:00`).getDay()
  const diasActivos = dias.length ? dias : [diaElegido]

  /** Fechas de la serie: los días marcados de cada semana, desde la fecha elegida. */
  const fechas = useMemo(() => {
    const base = new Date(`${date}T${time}:00`)
    if (isNaN(base.getTime())) return []
    if (!repetir || id) return [base]
    const inicioSemana = new Date(base); inicioSemana.setDate(base.getDate() - base.getDay())
    const out: Date[] = []
    for (let s = 0; s < semanas; s++) {
      for (const dia of [...diasActivos].sort()) {
        const f = new Date(inicioSemana); f.setDate(inicioSemana.getDate() + s * 7 + dia)
        if (f >= base) out.push(f)
      }
    }
    return out.slice(0, MAX_SERIE)
  }, [date, time, repetir, id, semanas, diasActivos.join(',')])

  const nombreAlumno = (sid: string) => { const s = students.find((x) => x.id === sid); return s ? (s.full_name ?? s.email) : null }

  async function avisar(alumno: string | null, clave: Parameters<typeof aviso>[0], datos: Record<string, string | number>) {
    if (!alumno) return null
    const { error } = await supabase.from('notifications').insert({ user_id: alumno, type: 'info', ...aviso(clave, datos) })
    return error
  }

  async function save() {
    setValidationError(null)
    if (!title.trim()) { setValidationError(t('prof:appt.nameRequired')); return }
    if (!profile?.id || !fechas.length) { setValidationError(t('prof:appt.errorSaving')); return }

    setSaving(true)
    const avisarAlumno = notify && !!studentId
    const fila = {
      teacher_id: profile.id,
      student_id: studentId || null,
      student_name: studentId ? nombreAlumno(studentId) : null,
      title: title.trim(),
      kind,
      location: location.trim() || null,
      notify_student: avisarAlumno,
      notes: notes.trim() || null,
    }
    const primera = fechas[0].toISOString()

    if (original) {
      const cambioFecha = primera !== new Date(original.starts_at).toISOString()
      const { error } = await supabase.from('appointments').update({
        ...fila, starts_at: primera,
        // Con otra fecha, los recordatorios vuelven a correr.
        ...(cambioFecha ? { reminded_day_at: null, reminded_hour_at: null } : {}),
      }).eq('id', original.id)
      if (error) { setSaving(false); setValidationError(mensajeError(error)); return }
      // Si el compromiso pasó a otro alumno, al anterior se le avisa que se canceló.
      if (original.notify_student && original.student_id && original.student_id !== studentId) {
        await avisar(original.student_id, 'appointmentCancelled', { name: original.title, at: original.starts_at })
      }
      const esNuevoAlumno = original.student_id !== studentId
      const e = avisarAlumno && (cambioFecha || esNuevoAlumno)
        ? await avisar(studentId, esNuevoAlumno ? 'appointment' : 'appointmentChanged', { name: fila.title, at: primera })
        : null
      setSaving(false)
      if (e) { setErrorAviso(mensajeError(e)); return }
      nav(-1)
      return
    }

    const serie = fechas.length > 1 ? crypto.randomUUID() : null
    const { error } = await supabase.from('appointments').insert(fechas.map((f) => ({ ...fila, starts_at: f.toISOString(), series_id: serie })))
    if (error) { setSaving(false); setValidationError(mensajeError(error)); return }
    // Si el aviso falla el compromiso igual existe, pero el alumno no se entera: por eso se dice.
    const e = avisarAlumno
      ? await avisar(studentId, serie ? 'appointmentSeries' : 'appointment', { name: fila.title, at: primera, n: fechas.length })
      : null
    setSaving(false)
    if (e) { setErrorAviso(mensajeError(e)); return }
    nav(-1)
  }

  async function eliminar(siguientes: boolean) {
    if (!original) return
    setSaving(true)
    let q = supabase.from('appointments').delete()
    q = siguientes && original.series_id
      ? q.eq('series_id', original.series_id).gte('starts_at', original.starts_at)
      : q.eq('id', original.id)
    const { error } = await q
    if (error) { setSaving(false); setBorrando(false); setValidationError(mensajeError(error)); return }
    if (original.notify_student && original.student_id && new Date(original.starts_at) > new Date()) {
      await avisar(original.student_id, 'appointmentCancelled', { name: original.title, at: original.starts_at })
    }
    setSaving(false)
    nav(-1)
  }

  const chip = (activo: boolean) =>
    'border text-rt-12 font-semibold ' + (activo ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24 md:max-w-form md:mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t(id ? 'prof:appt.editTitle' : 'prof:appt.title')}</h1>
      </div>

      {cargando ? (
        <div className="card-dark p-4 text-white/60 text-rt-13">{t('loading')}</div>
      ) : id && !original ? (
        <div className="card-dark p-4 text-white/60 text-rt-13">{t('prof:appt.notFound')}</div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            <Field label={t('prof:appt.name')}><input className="input-dark" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('prof:appt.namePh')} /></Field>
            <Field label={t('prof:appt.type')}>
              <div className="flex gap-2 flex-wrap">
                {KINDS.map((k) => (
                  <button key={k.v} type="button" onClick={() => setKind(k.v as any)} className={'px-3 h-9 rounded-card ' + chip(kind === k.v)}>{t(k.l)}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('prof:appt.date')}><input type="date" className="input-dark" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label={t('prof:appt.time')}><input type="time" className="input-dark" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            </div>

            {!id && (
              <div className="card-dark p-3 flex flex-col gap-3">
                <label className="flex items-center justify-between">
                  <span className="text-white text-rt-13">{t('prof:appt.repeat')}</span>
                  <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} className="w-6 h-6 accent-brand" />
                </label>
                {repetir && (
                  <>
                    <div>
                      <div className="text-white/60 text-rt-11 mb-2">{t('prof:appt.repeatDays')}</div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDias(diasActivos.includes(d) ? diasActivos.filter((x) => x !== d) : [...diasActivos, d])}
                            className={'w-9 h-9 rounded-full uppercase ' + chip(diasActivos.includes(d))}
                          >
                            {new Date(2024, 0, 7 + d).toLocaleDateString(localeDe(), { weekday: 'narrow' })}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-rt-11 mb-2">{t('prof:appt.repeatFor')}</div>
                      <div className="flex gap-2">
                        {SEMANAS.map((n) => (
                          <button key={n} type="button" onClick={() => setSemanas(n)} className={'px-3 h-9 rounded-card ' + chip(semanas === n)}>{t('prof:appt.weeks', { n })}</button>
                        ))}
                      </div>
                    </div>
                    <div className="text-brand text-rt-12 font-semibold">{t('prof:appt.willCreate', { n: fechas.length })}</div>
                  </>
                )}
              </div>
            )}

            <Field label={t('prof:appt.location')}>
              <input className="input-dark" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('prof:appt.locationPh')} />
            </Field>
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

          <div className="mt-8 flex flex-col gap-3">
            <button className="btn-save" disabled={saving || (repetir && !id && !fechas.length)} onClick={save}>
              {saving ? t('prof:appt.saving') : t(id ? 'prof:appt.saveChanges' : 'prof:appt.save')}
            </button>
            {original && (
              <button disabled={saving} onClick={() => setBorrando(true)} className="h-12 rounded-btn-pill border border-danger text-danger text-rt-14 font-semibold flex items-center justify-center gap-2">
                <Trash2 size={18} /> {t('prof:appt.delete')}
              </button>
            )}
          </div>
        </>
      )}

      {borrando && original && (
        <ConfirmDialog
          tone="danger"
          message={t('prof:appt.deleteQ')}
          detail={[original.series_id ? t('prof:appt.seriesHint') : '', original.notify_student && original.student_id ? t('prof:appt.deleteDetail') : ''].filter(Boolean).join(' ') || undefined}
          confirmLabel={original.series_id ? t('prof:appt.deleteOne') : t('prof:appt.delete')}
          onConfirm={() => eliminar(false)}
          onCancel={() => setBorrando(false)}
        >
          {original.series_id && (
            <button type="button" onClick={() => eliminar(true)} className="w-full h-11 rounded-[22px] border border-danger text-danger text-rt-14 font-semibold">
              {t('prof:appt.deleteFollowing')}
            </button>
          )}
        </ConfirmDialog>
      )}

      {errorAviso && (
        <FeedbackDialog kind="error" message={errorAviso} onClose={() => { setErrorAviso(null); nav(-1) }} />
      )}
    </div>
  )
}
