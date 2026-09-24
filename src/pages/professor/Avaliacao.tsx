import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Camera, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { bmi, bmiClass, maxHR, estimate1RM, leanMass } from '@/lib/assessment'
import { Field } from './projetos/RoutinesTab'

type A = {
  id?: string
  student_id: string; teacher_id: string; taken_at: string
  weight_kg?: number | null; height_cm?: number | null; age?: number | null; resting_hr?: number | null
  body_fat_pct?: number | null; lean_mass_kg?: number | null
  neck?: number | null; shoulders?: number | null; chest?: number | null
  waist?: number | null; abdomen?: number | null; hips?: number | null
  biceps_l?: number | null; biceps_r?: number | null
  forearm_l?: number | null; forearm_r?: number | null
  thigh_l?: number | null; thigh_r?: number | null
  calf_l?: number | null; calf_r?: number | null
  bench_1rm?: number | null; squat_1rm?: number | null; deadlift_1rm?: number | null
  notes?: string | null
  student_visible_sections?: string[]
}

const SECTIONS = [
  { key: 'basic', label: 'avaliacao:basic' },
  { key: 'composition', label: 'avaliacao:composition' },
  { key: 'perimetry', label: 'avaliacao:perimetry' },
  { key: 'strength', label: 'avaliacao:strength' },
  { key: 'photos', label: 'avaliacao:photos' },
]

export function AvaliacaoProfessorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [a, setA] = useState<A>({
    student_id: id ?? '', teacher_id: profile?.id ?? '', taken_at: new Date().toISOString().slice(0, 10),
    student_visible_sections: ['basic', 'composition'],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([])

  useEffect(() => {
    if (!id || !profile?.id) return
    void (async () => {
      const { data } = await supabase.from('assessments').select('*').eq('student_id', id).eq('teacher_id', profile.id).order('taken_at', { ascending: false }).limit(1).maybeSingle()
      if (data) {
        setA(data as A)
        await loadPhotos(data.id as string, id)
      }
    })()
  }, [id, profile?.id])

  async function loadPhotos(assessmentId: string, studentId: string) {
    const { data } = await supabase.storage.from('assessment-photos').list(`${studentId}/${assessmentId}`)
    if (!data) return
    const items = data.map((f) => {
      const path = `${studentId}/${assessmentId}/${f.name}`
      const { data: sig } = supabase.storage.from('assessment-photos').getPublicUrl(path)
      return { path, url: sig.publicUrl }
    })
    setPhotos(items)
  }

  async function uploadPhoto(file: File) {
    if (!a.id || !id) return
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${id}/${a.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('assessment-photos').upload(path, file, { contentType: file.type })
    if (!error) await loadPhotos(a.id, id)
  }

  async function removePhoto(path: string) {
    await supabase.storage.from('assessment-photos').remove([path])
    setPhotos((prev) => prev.filter((p) => p.path !== path))
  }

  const imc = bmi(a.weight_kg ?? undefined, a.height_cm ?? undefined)
  const imcInfo = imc ? bmiClass(imc) : null
  const hrmax = maxHR(a.age ?? undefined)
  const lm = a.lean_mass_kg ?? leanMass(a.weight_kg ?? undefined, a.body_fat_pct ?? undefined)

  function toggleSection(k: string) {
    const list = a.student_visible_sections ?? []
    setA({ ...a, student_visible_sections: list.includes(k) ? list.filter((x) => x !== k) : [...list, k] })
  }

  async function save() {
    setSaving(true)
    if (a.id) {
      await supabase.from('assessments').update(a).eq('id', a.id)
    } else {
      const { data } = await supabase.from('assessments').insert(a).select('id').single()
      if (data?.id) setA({ ...a, id: data.id })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const num = (v: any) => v === '' || v == null ? null : Number(v)
  const set = (k: keyof A, v: any) => setA({ ...a, [k]: num(v) })

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardCheck size={20} className="text-brand-assess" />
          <h1 className="text-white text-rt-20 font-bold">{t('avaliacao:title')}</h1>
        </div>
      </div>

      <Card title={t('avaliacao:basic')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('avaliacao:weightKg')}><input inputMode="decimal" className="input-dark" value={a.weight_kg ?? ''} onChange={(e) => set('weight_kg', e.target.value)} /></Field>
          <Field label={t('avaliacao:heightCm')}><input inputMode="decimal" className="input-dark" value={a.height_cm ?? ''} onChange={(e) => set('height_cm', e.target.value)} /></Field>
          <Field label={t('avaliacao:age')}><input inputMode="numeric" className="input-dark" value={a.age ?? ''} onChange={(e) => set('age', e.target.value)} /></Field>
          <Field label={t('avaliacao:restingHr')}><input inputMode="numeric" className="input-dark" value={a.resting_hr ?? ''} onChange={(e) => set('resting_hr', e.target.value)} /></Field>
        </div>
        {imc && imcInfo && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide">{t('avaliacao:imc')}</div>
              <div className="text-white text-rt-22 font-bold">{imc.toFixed(1)}</div>
            </div>
            <span style={{ background: imcInfo.color }} className="px-3 py-1 rounded-btn-pill text-white text-rt-12 font-bold">{t(imcInfo.label)}</span>
          </div>
        )}
        {hrmax && <div className="text-white/60 text-rt-11 mt-2">{t('avaliacao:maxHr')} <strong className="text-white">{hrmax} bpm</strong></div>}
      </Card>

      <Card title={t('avaliacao:composition')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('avaliacao:fatPct')}><input inputMode="decimal" className="input-dark" value={a.body_fat_pct ?? ''} onChange={(e) => set('body_fat_pct', e.target.value)} /></Field>
          <Field label={t('avaliacao:leanKg')}><input inputMode="decimal" className="input-dark" value={a.lean_mass_kg ?? ''} onChange={(e) => set('lean_mass_kg', e.target.value)} placeholder={lm ? `~${lm}` : ''} /></Field>
        </div>
      </Card>

      <Card title={t('avaliacao:perimetryCm')}>
        <div className="grid grid-cols-2 gap-3">
          <Peri label={t('avaliacao:neck')} v={a.neck} set={(v) => set('neck', v)} />
          <Peri label={t('avaliacao:shoulders')} v={a.shoulders} set={(v) => set('shoulders', v)} />
          <Peri label={t('avaliacao:chest')} v={a.chest} set={(v) => set('chest', v)} />
          <Peri label={t('avaliacao:waist')} v={a.waist} set={(v) => set('waist', v)} />
          <Peri label={t('avaliacao:abdomen')} v={a.abdomen} set={(v) => set('abdomen', v)} />
          <Peri label={t('avaliacao:hips')} v={a.hips} set={(v) => set('hips', v)} />
        </div>
        <div className="mt-3 text-white/60 text-rt-11 font-semibold uppercase tracking-wide">{t('avaliacao:arms')}</div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Peri label={t('avaliacao:bicepsL')} v={a.biceps_l} set={(v) => set('biceps_l', v)} />
          <Peri label={t('avaliacao:bicepsR')} v={a.biceps_r} set={(v) => set('biceps_r', v)} />
          <Peri label={t('avaliacao:forearmL')} v={a.forearm_l} set={(v) => set('forearm_l', v)} />
          <Peri label={t('avaliacao:forearmR')} v={a.forearm_r} set={(v) => set('forearm_r', v)} />
        </div>
        <div className="mt-3 text-white/60 text-rt-11 font-semibold uppercase tracking-wide">{t('avaliacao:legs')}</div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Peri label={t('avaliacao:thighL')} v={a.thigh_l} set={(v) => set('thigh_l', v)} />
          <Peri label={t('avaliacao:thighR')} v={a.thigh_r} set={(v) => set('thigh_r', v)} />
          <Peri label={t('avaliacao:calfL')} v={a.calf_l} set={(v) => set('calf_l', v)} />
          <Peri label={t('avaliacao:calfR')} v={a.calf_r} set={(v) => set('calf_r', v)} />
        </div>
      </Card>

      <Card title={t('avaliacao:strengthKg')}>
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('avaliacao:bench')}><input inputMode="decimal" className="input-dark" value={a.bench_1rm ?? ''} onChange={(e) => set('bench_1rm', e.target.value)} /></Field>
          <Field label={t('avaliacao:squat')}><input inputMode="decimal" className="input-dark" value={a.squat_1rm ?? ''} onChange={(e) => set('squat_1rm', e.target.value)} /></Field>
          <Field label={t('avaliacao:deadlift')}><input inputMode="decimal" className="input-dark" value={a.deadlift_1rm ?? ''} onChange={(e) => set('deadlift_1rm', e.target.value)} /></Field>
        </div>
        <OneRMCalculator />
      </Card>

      {a.id && (
        <Card title={t('avaliacao:comparePhotos')}>
          <label className="btn-outline-white h-11 rounded-btn-pill cursor-pointer flex items-center justify-center gap-2">
            <Camera size={18} /> {t('avaliacao:addPhoto')}
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((p) => (
                <div key={p.path} className="relative aspect-square rounded-card overflow-hidden bg-surface-input">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(p.path)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title={t('avaliacao:visible')}>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const on = a.student_visible_sections?.includes(s.key)
            return (
              <button key={s.key} type="button" onClick={() => toggleSection(s.key)} className={
                'px-3 h-8 rounded-card border text-rt-12 font-semibold ' +
                (on ? 'bg-brand-assess border-brand-assess text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{t(s.label)}</button>
            )
          })}
        </div>
      </Card>

      <button className="btn-save" disabled={saving} onClick={save}>{saving ? t('avaliacao:saving') : saved ? t('avaliacao:saved') : t('avaliacao:save')}</button>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-dark p-4 mb-4">
      <div className="text-brand-assess text-rt-13 font-bold uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  )
}

function Peri({ label, v, set }: { label: string; v: number | null | undefined; set: (v: string) => void }) {
  return <Field label={label}><input inputMode="decimal" className="input-dark" value={v ?? ''} onChange={(e) => set(e.target.value)} /></Field>
}

function OneRMCalculator() {
  const { t } = useTranslation()
  const [w, setW] = useState('')
  const [r, setR] = useState('')
  const rm = estimate1RM(Number(w), Number(r))
  return (
    <div className="mt-3 pt-3 border-t border-surface-line-strong">
      <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide mb-2">{t('avaliacao:estimate1rm')}</div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <Field label={t('avaliacao:load')}><input inputMode="decimal" className="input-dark" value={w} onChange={(e) => setW(e.target.value)} /></Field>
        <Field label={t('avaliacao:reps')}><input inputMode="numeric" className="input-dark" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        <div>
          <div className="text-white/60 text-rt-11 uppercase font-semibold">≈ 1RM</div>
          <div className="text-brand text-rt-22 font-bold h-[52px] flex items-center">{rm ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}
