import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { PRICE_RANGES, currencyOf, formatMoney } from '@/lib/plans'
import { DarkSelectSheet, DarkMultiSheet } from '@/components/DarkSheets'
import { COUNTRIES } from '@/lib/countries'
import { InputInterno, CampoInterno } from '@/components/CampoInterno'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { atuacoes, especialidades, formatosTrabalho, clientesIdeais, etiqueta } from '@/lib/catalogos'
import { useTranslation } from 'react-i18next'


export function CompletarPerfilPage() {
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const { profile, refresh } = useAuth()
  const [country, setCountry] = useState(profile?.country ?? 'BR')
  const range = PRICE_RANGES[country] ?? PRICE_RANGES.BR
  const currency = currencyOf(country)

  const [state, setState] = useState(profile?.state ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [occupation, setOccupation] = useState(profile?.occupation ?? '')
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties ?? [])
  const [ideal, setIdeal] = useState<string[]>(profile?.ideal_clients ?? [])
  const [formats, setFormats] = useState<string[]>(profile?.work_formats ?? [])
  const [hourlyMin, setHourlyMin] = useState<number | null>(null)
  const [hourlyMax, setHourlyMax] = useState<number | null>(null)
  const [monthlyMin, setMonthlyMin] = useState<number | null>(null)
  const [monthlyMax, setMonthlyMax] = useState<number | null>(null)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [marketVisible, setMarketVisible] = useState(profile?.marketplace_visible ?? true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHourlyMin((profile as any)?.price_hourly_min ?? range.hourly.min)
    setHourlyMax((profile as any)?.price_hourly_max ?? range.hourly.max)
    setMonthlyMin((profile as any)?.price_monthly_min ?? range.monthly.min)
    setMonthlyMax((profile as any)?.price_monthly_max ?? range.monthly.max)
  }, [profile?.id])

  const complete = !!(state && city && occupation && specialties.length && ideal.length)

  async function save() {
    if (!profile?.id) return
    if (!complete) {
      setFeedback({
        kind: 'error',
        message: t('completeProfile:missing'),
      })
      return
    }
    setSaving(true)
    await supabase.from('profiles').update({
      country, state, city, occupation,
      specialties, ideal_clients: ideal, work_formats: formats,
      price_hourly_min: hourlyMin, price_hourly_max: hourlyMax,
      price_monthly_min: monthlyMin, price_monthly_max: monthlyMax,
      bio: bio || null,
      marketplace_visible: marketVisible,
      profile_complete: complete,
    }).eq('id', profile.id)
    await refresh()
    setSaving(false)
    setFeedback({ kind: 'success', message: t('completeProfile:saved') })
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('completeProfile:title')}</h1>
      </div>

      <div className="flex flex-col gap-6">
        <p className="text-white/70 text-rt-14 leading-relaxed -mt-2">
          {t('completeProfile:subtitle')}
        </p>

        <h2 className="text-brand text-rt-16 font-semibold">{t('completeProfile:sectionLocation')}</h2>

        <DarkSelectSheet
          labelInside
          label={t('completeProfile:country')}
          title={t('completeProfile:country')}
          value={country}
          onChange={setCountry}
          searchable
          options={COUNTRIES.map((c) => ({
            id: c.code,
            label: `${c.flag}  ${lang.startsWith('es') ? c.name_es : c.name_pt}`,
          }))}
        />

        <InputInterno label={t('completeProfile:state')} value={state} onChange={setState} />
        <InputInterno label={t('completeProfile:city')} value={city} onChange={setCity} />

        <h2 className="text-brand text-rt-16 font-semibold mt-2">{t('completeProfile:sectionProfessional')}</h2>

        <DarkSelectSheet
          labelInside
          label={t('completeProfile:occupation')}
          title={t('completeProfile:occupation')}
          value={occupation}
          onChange={setOccupation}
          searchable
          placeholder={t('completeProfile:selectOne')}
          options={atuacoes.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
        />

        <DarkMultiSheet
          labelInside
          label={t('completeProfile:specialties')}
          title={t('completeProfile:specialtyTitle')}
          values={specialties}
          onChange={setSpecialties}
          confirmLabel={t('confirm')}
          options={especialidades.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
        />

        <DarkMultiSheet
          labelInside
          label={t('completeProfile:workFormat')}
          title={t('completeProfile:workFormatTitle')}
          values={formats}
          onChange={setFormats}
          confirmLabel={t('confirm')}
          options={formatosTrabalho.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
        />

        <DarkMultiSheet
          labelInside
          label={t('completeProfile:idealClients')}
          title={t('completeProfile:idealClientsTitle')}
          values={ideal}
          onChange={setIdeal}
          confirmLabel={t('confirm')}
          options={clientesIdeais.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
        />

        <RangeField label={t('completeProfile:hourlyPrice')} min={range.hourly.min} max={range.hourly.max} step={range.hourly.step} currency={currency} valueMin={hourlyMin ?? range.hourly.min} valueMax={hourlyMax ?? range.hourly.max} onChange={(a, b) => { setHourlyMin(a); setHourlyMax(b) }} />
        <RangeField label={t('completeProfile:monthlyPrice')} min={range.monthly.min} max={range.monthly.max} step={range.monthly.step} currency={currency} valueMin={monthlyMin ?? range.monthly.min} valueMax={monthlyMax ?? range.monthly.max} onChange={(a, b) => { setMonthlyMin(a); setMonthlyMax(b) }} />

        <CampoInterno label={t('completeProfile:bio')} filled={!!bio}>
          <textarea
            className="w-full h-24 bg-transparent outline-none resize-none text-white text-rt-15 placeholder:text-grey-500"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={bio ? '' : t('completeProfile:bioHint')}
          />
        </CampoInterno>

        <label className="flex items-center justify-between card-dark p-3">
          <div>
            <div className="text-white text-rt-13 font-semibold">{t('completeProfile:marketplace')}</div>
            <div className="text-white/60 text-rt-11">{t('completeProfile:marketplaceSub')}</div>
          </div>
          <input type="checkbox" checked={marketVisible} onChange={(e) => setMarketVisible(e.target.checked)} className="w-6 h-6 accent-brand" />
        </label>

      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={saving} onClick={save}>{saving ? t('loading') : t('save')}</button>
      </div>

      {feedback && (
        <FeedbackDialog
          kind={feedback.kind}
          message={feedback.message}
          onClose={() => {
            const exito = feedback.kind === 'success'
            setFeedback(null)
            if (exito) nav('/professor', { replace: true })
          }}
        />
      )}
    </div>
  )
}

function RangeField({
  label, min, max, step, currency, valueMin, valueMax, onChange,
}: {
  label: string; min: number; max: number; step: number; currency: string
  valueMin: number; valueMax: number; onChange: (a: number, b: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-white text-rt-13 font-semibold">{label}</label>
        <span className="text-brand text-rt-12 font-semibold">{formatMoney(valueMin, currency)} — {formatMoney(valueMax, currency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
          className="flex-1 accent-brand" />
        <input type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
          className="flex-1 accent-brand" />
      </div>
    </div>
  )
}
