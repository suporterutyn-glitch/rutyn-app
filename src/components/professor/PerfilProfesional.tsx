import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Profile } from '@/lib/auth'
import { rangoDePrecios, currencyOf, formatMoney } from '@/lib/plans'
import { DarkSelectSheet, DarkMultiSheet } from '@/components/DarkSheets'
import { CampoInterno } from '@/components/CampoInterno'
import { buscarPaises, nombrePais } from '@/lib/countries'
import { atuacoes, especialidades, formatosTrabalho, clientesIdeais, etiqueta } from '@/lib/catalogos'
import { useEstados } from '@/lib/geo'

const BIO_MAX = 300
type Formato = 'hour' | 'month'

/** Datos del registro profesional del profesor: los usa "Completar perfil" y "Mi perfil". */
export function usePerfilProfesional(profile: Profile | null, country: string) {
  const p = profile as any
  const range = rangoDePrecios(country)
  const [state, setState] = useState(p?.state ?? '')
  const [city, setCity] = useState(p?.city ?? '')
  const [occupation, setOccupation] = useState(p?.occupation ?? '')
  const [specialties, setSpecialties] = useState<string[]>(p?.specialties ?? [])
  const [ideal, setIdeal] = useState<string[]>(p?.ideal_clients ?? [])
  const [formats, setFormats] = useState<string[]>(p?.work_formats ?? [])
  const [cobro, setCobro] = useState<Formato[]>(() => {
    const f: Formato[] = []
    if (p?.price_hourly_min != null) f.push('hour')
    if (p?.price_monthly_min != null) f.push('month')
    return f.length ? f : ['month']
  })
  const [hourly, setHourly] = useState<[number, number]>([p?.price_hourly_min ?? range.hourly.min, p?.price_hourly_max ?? range.hourly.max])
  const [monthly, setMonthly] = useState<[number, number]>([p?.price_monthly_min ?? range.monthly.min, p?.price_monthly_max ?? range.monthly.max])
  const [bio, setBio] = useState<string>(p?.bio ?? '')
  const [marketVisible, setMarketVisible] = useState<boolean>(p?.marketplace_visible ?? true)

  // Al cambiar de país, estado/ciudad y precios del país anterior ya no aplican.
  const paisAnterior = useRef(country)
  useEffect(() => {
    if (paisAnterior.current === country) return
    paisAnterior.current = country
    const r = rangoDePrecios(country)
    setState(''); setCity('')
    setHourly([r.hourly.min, r.hourly.max])
    setMonthly([r.monthly.min, r.monthly.max])
  }, [country])

  const completo = !!(country && state && city && occupation && specialties.length && ideal.length)

  function datos(extra?: { marketplace_visible?: boolean }) {
    return {
      country, state, city, occupation,
      specialties, ideal_clients: ideal, work_formats: formats,
      price_hourly_min: cobro.includes('hour') ? hourly[0] : null,
      price_hourly_max: cobro.includes('hour') ? hourly[1] : null,
      price_monthly_min: cobro.includes('month') ? monthly[0] : null,
      price_monthly_max: cobro.includes('month') ? monthly[1] : null,
      bio: bio.trim() || null,
      marketplace_visible: extra?.marketplace_visible ?? marketVisible,
      profile_complete: completo,
    }
  }

  return {
    country, range, state, setState, city, setCity, occupation, setOccupation, specialties, setSpecialties,
    ideal, setIdeal, formats, setFormats, cobro, setCobro, hourly, setHourly, monthly, setMonthly,
    bio, setBio, marketVisible, setMarketVisible, completo, datos,
  }
}

export type PerfilProfesional = ReturnType<typeof usePerfilProfesional>

export function CamposUbicacion({ f, onCountry }: { f: PerfilProfesional; onCountry?: (c: string) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const estados = useEstados(f.country)
  const ciudades = estados?.find(([e]) => e === f.state)?.[1] ?? []
  const sinLista = !!f.country && estados !== null && estados.length === 0
  // Un valor viejo escrito a mano que no está en la lista igual se muestra.
  const conActual = (lista: string[], actual: string) => (actual && !lista.includes(actual) ? [actual, ...lista] : lista)

  return (
    <>
      {onCountry && (
        <DarkSelectSheet
          labelInside searchable
          label={t('completeProfile:country')} title={t('completeProfile:country')}
          value={f.country} onChange={onCountry}
          options={buscarPaises(lang).map((c) => ({ id: c.code, label: `${c.flag}  ${nombrePais(c, lang)}` }))}
        />
      )}
      {sinLista ? (
        // País sin lista de estados y ciudades: se escriben a mano.
        <>
          <CampoInterno label={t('completeProfile:state')} filled={!!f.state}>
            <input value={f.state} onChange={(e) => f.setState(e.target.value)} placeholder={t('completeProfile:state')} maxLength={80}
              className="w-full bg-transparent text-white text-rt-15 outline-none placeholder:text-grey-500" />
          </CampoInterno>
          <CampoInterno label={t('completeProfile:city')} filled={!!f.city}>
            <input value={f.city} onChange={(e) => f.setCity(e.target.value)} placeholder={t('completeProfile:city')} maxLength={80}
              className="w-full bg-transparent text-white text-rt-15 outline-none placeholder:text-grey-500" />
          </CampoInterno>
        </>
      ) : (
        <>
          <DarkSelectSheet
            labelInside searchable
            label={t('completeProfile:state')} title={t('completeProfile:state')}
            value={f.state} onChange={(v) => { if (v !== f.state) { f.setState(v); f.setCity('') } }}
            disabled={!estados}
            options={conActual((estados ?? []).map(([e]) => e), f.state).map((e) => ({ id: e, label: e }))}
          />
          <DarkSelectSheet
            labelInside searchable
            label={t('completeProfile:city')} title={t('completeProfile:city')}
            value={f.city} onChange={f.setCity}
            disabled={!f.state}
            options={conActual(ciudades, f.city).map((c) => ({ id: c, label: c }))}
          />
        </>
      )}
    </>
  )
}

export function CamposProfesionales({ f }: { f: PerfilProfesional }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const currency = currencyOf(f.country)
  const r = f.range
  const opcionesCobro = [
    { id: 'hour', label: t('completeProfile:perHour') },
    { id: 'month', label: t('completeProfile:perMonth') },
  ]

  return (
    <>
      <DarkSelectSheet
        labelInside searchable
        label={t('completeProfile:occupation')} title={t('completeProfile:occupation')}
        value={f.occupation} onChange={f.setOccupation}
        options={atuacoes.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
      />
      <DarkMultiSheet
        labelInside
        label={t('completeProfile:specialties')} title={t('completeProfile:specialtyTitle')}
        values={f.specialties} onChange={f.setSpecialties} confirmLabel={t('confirm')}
        options={especialidades.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
      />
      <DarkMultiSheet
        labelInside
        label={t('completeProfile:workFormat')} title={t('completeProfile:workFormatTitle')}
        values={f.formats} onChange={f.setFormats} confirmLabel={t('confirm')}
        options={formatosTrabalho.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
      />
      <DarkMultiSheet
        labelInside
        label={t('completeProfile:idealClients')} title={t('completeProfile:idealClientsTitle')}
        values={f.ideal} onChange={f.setIdeal} confirmLabel={t('confirm')}
        options={clientesIdeais.map((c) => ({ id: c.id, label: etiqueta(c, lang) }))}
      />
      <DarkMultiSheet
        labelInside
        label={t('completeProfile:paymentFormat')} title={t('completeProfile:paymentFormat')}
        values={f.cobro} onChange={(v) => f.setCobro((v.length ? v : ['month']) as Formato[])} confirmLabel={t('confirm')}
        options={opcionesCobro}
      />

      <h2 className="text-brand text-rt-16 font-semibold mt-2">{t('completeProfile:bio')}</h2>
      <div>
        <div className="w-full rounded-[12px] bg-surface-input border border-surface-line focus-within:border-brand px-4 py-3">
          <textarea
            className="w-full h-24 bg-transparent outline-none resize-none text-white text-rt-15 placeholder:text-grey-500"
            value={f.bio}
            maxLength={BIO_MAX}
            onChange={(e) => f.setBio(e.target.value.slice(0, BIO_MAX))}
            placeholder={t('completeProfile:bioHint')}
          />
        </div>
        <div className="text-right text-grey-500 text-rt-11 mt-1 pr-2">{f.bio.length}/{BIO_MAX}</div>
      </div>

      {f.cobro.includes('hour') && (
        <RangeField label={t('completeProfile:hourlyPrice')} min={r.hourly.min} max={r.hourly.max} step={r.hourly.step} currency={currency}
          valueMin={f.hourly[0]} valueMax={f.hourly[1]} onChange={(a, b) => f.setHourly([a, b])} />
      )}
      {f.cobro.includes('month') && (
        <RangeField label={t('completeProfile:monthlyPrice')} min={r.monthly.min} max={r.monthly.max} step={r.monthly.step} currency={currency}
          valueMin={f.monthly[0]} valueMax={f.monthly[1]} onChange={(a, b) => f.setMonthly([a, b])} />
      )}

      <div className="w-full rounded-[12px] bg-surface-input border border-surface-line px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white text-rt-15">{t('completeProfile:marketplace')}</div>
          <div className="text-white/50 text-rt-11">{t('completeProfile:marketplaceSub')}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={f.marketVisible}
          onClick={() => f.setMarketVisible(!f.marketVisible)}
          className={'shrink-0 min-w-[72px] h-10 px-4 rounded-full border text-rt-14 font-semibold transition ' +
            (f.marketVisible ? 'bg-brand border-brand text-white' : 'bg-white/5 border-grey-600 text-white/80')}
        >
          {f.marketVisible ? t('completeProfile:yes') : t('completeProfile:no')}
        </button>
      </div>
    </>
  )
}

function RangeField({
  label, min, max, step, currency, valueMin, valueMax, onChange,
}: {
  label: string; min: number; max: number; step: number; currency: string
  valueMin: number; valueMax: number; onChange: (a: number, b: number) => void
}) {
  const { t } = useTranslation()
  const vMin = Math.min(Math.max(valueMin, min), max)
  const vMax = Math.min(Math.max(valueMax, min), max)
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3 gap-2">
        <label className="text-white text-rt-14 font-semibold">{label}</label>
        <span className="text-brand text-rt-13 font-semibold text-right">
          {formatMoney(vMin, currency, true)} - {formatMoney(vMax, currency, true)}
        </span>
      </div>
      <div className="relative h-6 flex items-center mx-2">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-line" />
        <div className="absolute h-1.5 rounded-full bg-brand" style={{ left: `${pct(vMin)}%`, right: `${100 - pct(vMax)}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={vMin}
          aria-label={t('general:ui.min', { label })}
          onChange={(e) => onChange(Math.min(Number(e.target.value), vMax - step), vMax)}
          className="rango-doble"
        />
        <input
          type="range" min={min} max={max} step={step} value={vMax}
          aria-label={t('general:ui.max', { label })}
          onChange={(e) => onChange(vMin, Math.max(Number(e.target.value), vMin + step))}
          className="rango-doble"
        />
      </div>
    </div>
  )
}
