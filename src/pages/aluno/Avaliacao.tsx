import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localeDe } from '@/lib/fechas'
import { ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { bmi, bmiClass, maxHR, whr, leanMass } from '@/lib/assessment'
type A = {
  id: string; taken_at: string
  weight_kg: number | null; height_cm: number | null; age: number | null; resting_hr: number | null
  body_fat_pct: number | null; lean_mass_kg: number | null
  waist: number | null; hips: number | null
  student_visible_sections: string[]
}

export function AvaliacaoAlunoPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [ass, setAss] = useState<A | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('assessments').select('*').eq('student_id', profile.id).order('taken_at', { ascending: false }).limit(1).maybeSingle()
      setAss(data as A | null)
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24 bg-white min-h-dvh -mx-4 pb-8" style={{ marginLeft: 0, marginRight: 0 }}>
      <div className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck size={22} className="text-brand-assess" />
          <h1 className="text-black text-rt-20 font-bold">{t('avaliacao:mine')}</h1>
        </div>

        {loading ? (
          <div className="text-grey-600 text-rt-13 py-8 text-center">{t('avaliacao:loading')}</div>
        ) : !ass ? (
          <div className="text-center py-10">
            <ClipboardCheck size={48} className="text-grey-400 mx-auto mb-3" />
            <div className="text-grey-900 text-rt-15 font-bold">{t('avaliacao:none')}</div>
            <div className="text-grey-600 text-rt-13 mt-1 max-w-xs mx-auto">{t('avaliacao:noneBody')}</div>
          </div>
        ) : (
          <AssessmentView a={ass} />
        )}
      </div>
    </div>
  )
}

function AssessmentView({ a }: { a: A }) {
  const { t, i18n } = useTranslation()
  const imc = bmi(a.weight_kg ?? undefined, a.height_cm ?? undefined)
  const imcInfo = imc ? bmiClass(imc) : null
  const hrmax = maxHR(a.age)
  const whrInfo = whr(a.waist ?? undefined, a.hips ?? undefined, true)
  const lm = a.lean_mass_kg ?? leanMass(a.weight_kg ?? undefined, a.body_fat_pct ?? undefined)
  const visible = new Set(a.student_visible_sections ?? [])

  return (
    <div className="flex flex-col gap-4">
      <div className="text-grey-600 text-rt-11">{t('avaliacao:lastUpdate', { date: new Date(a.taken_at + 'T00:00:00').toLocaleDateString(localeDe(i18n.language)) })}</div>

      {visible.has('basic') && (
        <Section title={t('avaliacao:basic')} color="assess">
          <div className="grid grid-cols-2 gap-3">
            {a.weight_kg != null && <Metric label={t('avaliacao:weight')} value={`${a.weight_kg} kg`} />}
            {a.height_cm != null && <Metric label={t('avaliacao:height')} value={`${a.height_cm} cm`} />}
            {a.age != null && <Metric label={t('avaliacao:age')} value={t('avaliacao:ageYears', { n: a.age })} />}
            {a.resting_hr != null && <Metric label={t('avaliacao:restingHr')} value={`${a.resting_hr} bpm`} />}
          </div>
          {imc && imcInfo && (
            <div className="mt-3 pt-3 border-t border-grey-200 flex items-center justify-between">
              <div>
                <div className="text-grey-600 text-rt-11 uppercase font-semibold tracking-wide">{t('avaliacao:imc')}</div>
                <div className="text-black text-rt-22 font-bold">{imc.toFixed(1)}</div>
              </div>
              <span style={{ background: imcInfo.color }} className="px-3 py-1 rounded-btn-pill text-white text-rt-12 font-bold">
                {t(imcInfo.label)}
              </span>
            </div>
          )}
          {hrmax && (
            <div className="mt-2 text-grey-600 text-rt-11">{t('avaliacao:maxHrEst')} <strong className="text-black">{hrmax} bpm</strong></div>
          )}
        </Section>
      )}

      {visible.has('composition') && (a.body_fat_pct != null || lm != null) && (
        <Section title={t('avaliacao:bodyComposition')} color="assess">
          <div className="grid grid-cols-2 gap-3">
            {a.body_fat_pct != null && <Metric label={t('avaliacao:fat')} value={`${a.body_fat_pct}%`} color="deep-orange" />}
            {lm != null && <Metric label={t('avaliacao:lean')} value={`${lm} kg`} color="assess" />}
          </div>
        </Section>
      )}

      {visible.has('perimetry') && (a.waist || a.hips) && (
        <Section title={t('avaliacao:perimetry')} color="assess">
          <div className="grid grid-cols-2 gap-3">
            {a.waist != null && <Metric label={t('avaliacao:waist')} value={`${a.waist} cm`} />}
            {a.hips != null && <Metric label={t('avaliacao:hips')} value={`${a.hips} cm`} />}
          </div>
          {whrInfo && (
            <div className="mt-3 pt-3 border-t border-grey-200 flex items-center justify-between">
              <div>
                <div className="text-grey-600 text-rt-11 uppercase font-semibold tracking-wide">{t('avaliacao:whr')}</div>
                <div className="text-black text-rt-22 font-bold">{whrInfo.ratio}</div>
              </div>
              <span className={
                'px-3 py-1 rounded-btn-pill text-white text-rt-12 font-bold ' +
                (whrInfo.risk === 'high' ? 'bg-danger' : whrInfo.risk === 'moderate' ? 'bg-warning' : 'bg-brand')
              }>{t('avaliacao:risk', { level: t(`avaliacao:${whrInfo.risk}`) })}</span>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children, color: _color }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-card bg-surface-light p-4">
      <div className="text-brand-assess text-rt-13 font-bold uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  const cls = color === 'deep-orange' ? 'text-alert-deep-orange' : color === 'assess' ? 'text-brand-assess' : 'text-black'
  return (
    <div>
      <div className="text-grey-600 text-rt-11 uppercase font-semibold tracking-wide">{label}</div>
      <div className={cls + ' text-rt-18 font-bold'}>{value}</div>
    </div>
  )
}

export { AvaliacaoAlunoPage as Avaliacao }
