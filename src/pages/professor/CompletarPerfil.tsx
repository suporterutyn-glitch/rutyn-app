import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Field } from './projetos/RoutinesTab'
import { PRICE_RANGES, currencyOf, formatMoney } from '@/lib/plans'

const OCCUPATIONS = [
  'Personal Trainer', 'Educador Físico', 'Preparador Físico', 'Instrutor de Treinamento Funcional',
  'Treinador de Corrida', 'Treinador de Cross Training', 'Instrutor de Calistenia',
  'Nutricionista', 'Nutricionista Esportivo', 'Personal Home', 'Instrutor de Natação',
]

const SPECIALTIES = ['Hipertrofia', 'Emagrecimento', 'Resistência', 'Reabilitação', 'Idosos', 'Gestantes', 'Atletas', 'Iniciantes']
const IDEAL_CLIENTS = ['Iniciantes', 'Intermediários', 'Avançados', 'Gestantes', 'Idosos', 'Crianças', 'Atletas']
const FORMATS = [{ v: 'presencial', l: 'Presencial' }, { v: 'hibrido', l: 'Híbrido' }, { v: 'online', l: 'Online' }]

export function CompletarPerfilPage() {
  const nav = useNavigate()
  const { profile, refresh } = useAuth()
  const country = profile?.country ?? 'BR'
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

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  }

  const complete = !!(state && city && occupation && specialties.length && ideal.length)

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    await supabase.from('profiles').update({
      state, city, occupation,
      specialties, ideal_clients: ideal, work_formats: formats,
      price_hourly_min: hourlyMin, price_hourly_max: hourlyMax,
      price_monthly_min: monthlyMin, price_monthly_max: monthlyMax,
      bio: bio || null,
      marketplace_visible: marketVisible,
      profile_complete: complete,
    }).eq('id', profile.id)
    await refresh()
    setSaving(false)
    nav('/professor', { replace: true })
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Complete seu perfil</h1>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado / Província"><input className="input-dark" value={state} onChange={(e) => setState(e.target.value)} /></Field>
          <Field label="Cidade"><input className="input-dark" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>

        <Field label="Atuação">
          <select className="input-dark" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
            <option value="">Selecione…</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        <ChipMulti label="Especialidades" options={SPECIALTIES} value={specialties} onChange={(v) => toggle(specialties, setSpecialties, v)} />
        <ChipMulti label="Cliente ideal" options={IDEAL_CLIENTS} value={ideal} onChange={(v) => toggle(ideal, setIdeal, v)} />
        <ChipMulti label="Formato de trabalho" options={FORMATS.map((f) => f.l)} value={formats.map((f) => FORMATS.find((x) => x.v === f)?.l ?? f)} onChange={(l) => {
          const v = FORMATS.find((f) => f.l === l)?.v ?? l
          toggle(formats, setFormats, v)
        }} />

        <RangeField label="Preço por hora" min={range.hourly.min} max={range.hourly.max} step={range.hourly.step} currency={currency} valueMin={hourlyMin ?? range.hourly.min} valueMax={hourlyMax ?? range.hourly.max} onChange={(a, b) => { setHourlyMin(a); setHourlyMax(b) }} />
        <RangeField label="Preço mensal" min={range.monthly.min} max={range.monthly.max} step={range.monthly.step} currency={currency} valueMin={monthlyMin ?? range.monthly.min} valueMax={monthlyMax ?? range.monthly.max} onChange={(a, b) => { setMonthlyMin(a); setMonthlyMax(b) }} />

        <Field label="Biografia">
          <textarea className="input-dark h-28 py-3 resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fale sobre sua experiência…" />
        </Field>

        <label className="flex items-center justify-between card-dark p-3">
          <div>
            <div className="text-white text-rt-13 font-semibold">Vincular ao marketplace</div>
            <div className="text-white/60 text-rt-11">Alunos podem te encontrar na busca</div>
          </div>
          <input type="checkbox" checked={marketVisible} onChange={(e) => setMarketVisible(e.target.checked)} className="w-6 h-6 accent-brand" />
        </label>

        {!complete && (
          <div className="text-warning text-rt-11">Preencha estado, cidade, atuação, ao menos 1 especialidade e 1 cliente ideal para completar o perfil.</div>
        )}
      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </div>
  )
}

function ChipMulti({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-white text-rt-13 font-semibold mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o)
          return (
            <button key={o} type="button" onClick={() => onChange(o)} className={
              'px-3 h-8 rounded-card border text-rt-12 font-semibold ' +
              (on ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
            }>{o}</button>
          )
        })}
      </div>
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
