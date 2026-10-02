import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, User as UserIcon, Filter, X, Bell, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { currencyOf, formatMoneyShort } from '@/lib/plans'
import { atuacoes, especialidades, formatosTrabalho, etiquetaDe } from '@/lib/catalogos'
import { countryByCode, nombrePais } from '@/lib/countries'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { leerCodigo, usarCodigo, mensajeConvite } from '@/lib/convite'

type Teacher = {
  id: string
  full_name: string | null
  avatar_url: string | null
  state: string | null
  city: string | null
  occupation: string | null
  specialties: string[] | null
  work_formats: string[] | null
  gender: string | null
  price_hourly_min: number | null
  price_hourly_max: number | null
  price_monthly_min: number | null
  price_monthly_max: number | null
  country: string | null
}

type Filters = {
  occupation: string
  specialty: string
  /** 'hourly' | 'monthly': cómo cobra el profesor, como en el diseño. */
  payFormat: string
  gender: string
  country: string
  state: string
  city: string
}
const emptyFilters: Filters = { occupation: '', specialty: '', payFormat: '', gender: '', country: '', state: '', city: '' }

export function EncontrarProfessorPage() {
  const { signOut, profile, session, refresh } = useAuth()
  const loc = useLocation()
  const [avisoConvite, setAvisoConvite] = useState<string | null>((loc.state as { aviso?: string } | null)?.aviso ?? null)

  // Link de invitación pendiente: el del navegador o el guardado al registrarse
  // (si confirmó el correo en otro dispositivo). Se intenta una sola vez.
  useEffect(() => {
    const meta = session?.user.user_metadata?.invite_code as string | undefined
    const codigo = leerCodigo() ?? meta
    if (!codigo || !profile?.id) return
    void (async () => {
      const r = await usarCodigo(codigo)
      if (meta) await supabase.auth.updateUser({ data: { invite_code: null } })
      if (r === 'ok') { await refresh(); nav('/aluno', { replace: true }) }
      else setAvisoConvite(t(mensajeConvite(r)))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const lang = (i18n.language.startsWith('es') ? 'es' : i18n.language.startsWith('en') ? 'en' : 'pt') as 'pt' | 'es' | 'en'
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // El diseño separa arriba al profesor al que ya se le mandó convite.
  const [invitados, setInvitados] = useState<Set<string>>(new Set())

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,avatar_url,state,city,occupation,specialties,work_formats,gender,price_hourly_min,price_hourly_max,price_monthly_min,price_monthly_max,country')
        .eq('role', 'teacher')
        .eq('marketplace_visible', true)
        .eq('profile_complete', true)
        .order('full_name')
        .limit(50)
      setTeachers((data as Teacher[]) ?? [])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase
        .from('invites')
        .select('teacher_id')
        .eq('student_id', profile.id)
        .in('status', ['pending', 'countered'])
      setInvitados(new Set(((data as { teacher_id: string }[]) ?? []).map((i) => i.teacher_id)))
    })()
  }, [profile?.id])

  const activeFilters = Object.values(filters).filter((v) => v !== '' && v !== null).length
  const filtered = teachers.filter((t) => {
    if (query && !(t.full_name ?? '').toLowerCase().includes(query.toLowerCase())) return false
    if (filters.occupation && t.occupation !== filters.occupation) return false
    if (filters.specialty && !(t.specialties ?? []).includes(filters.specialty)) return false
    if (filters.payFormat === 'hourly' && t.price_hourly_min == null) return false
    if (filters.payFormat === 'monthly' && t.price_monthly_min == null) return false
    if (filters.gender && t.gender !== filters.gender) return false
    if (filters.country && t.country !== filters.country) return false
    if (filters.state && (t.state ?? '').toLowerCase() !== filters.state.toLowerCase()) return false
    if (filters.city && (t.city ?? '').toLowerCase() !== filters.city.toLowerCase()) return false
    return true
  })

  const conConvite = filtered.filter((x) => invitados.has(x.id))
  const disponibles = filtered.filter((x) => !invitados.has(x.id))

  return (
    <div className="app-shell app-bg-pro">
      {avisoConvite && <FeedbackDialog kind="error" message={avisoConvite} onClose={() => setAvisoConvite(null)} />}
      <div className="relative z-10 min-h-dvh px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0">
            <div className="text-white text-rt-20 font-bold truncate">
              {t('aluno:hello', { name: profile?.full_name?.split(' ')[0] ?? t('cuenta:mk.student') })}
            </div>
            <div className="text-white/60 text-rt-11 mt-0.5 truncate">{t('aluno:welcome')}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <button
              onClick={() => nav('/aluno/notificacoes')}
              className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center"
              aria-label={t('cuenta:mk.notifications')}
            >
              <Bell size={20} className="text-white" />
            </button>
          </div>
        </div>

        <div className="text-center text-white text-rt-16 font-bold tracking-[1px] uppercase mb-5">
          {t('find:title')}
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('find:searchName')}
              className="w-full h-[50px] pl-11 pr-4 rounded-[10px] bg-white/10 border border-white/30 text-white text-rt-14 placeholder:text-white/50 outline-none focus:border-brand"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className={
              'w-[50px] h-[50px] rounded-[10px] relative flex items-center justify-center ' +
              (activeFilters > 0 ? 'bg-brand/20 border border-brand' : 'bg-white/10 border border-white/30')
            }
            aria-label={t('cuenta:mk.filters')}
          >
            <Filter size={20} className={activeFilters > 0 ? 'text-brand' : 'text-white'} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-white/60 text-rt-13 py-8 text-center">{t('common:loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="card-dark p-6 text-center">
            <UserIcon size={48} className="text-grey-600 mx-auto mb-3" />
            <div className="text-white text-rt-15 font-bold mb-1">
              {query || activeFilters > 0 ? t('find:noResults') : t('find:none')}
            </div>
            <div className="text-white/60 text-rt-12">
              {query || activeFilters > 0 ? t('find:noResultsSub') : t('find:noneSub')}
            </div>
          </div>
        ) : (
          <>
            {conConvite.length > 0 && (
              <ul className="flex flex-col gap-3 mb-5">
                {conConvite.map((x) => <TarjetaProfesor key={x.id} t={x} invitado lang={lang} />)}
              </ul>
            )}

            {conConvite.length > 0 && disponibles.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-surface-line" />
                <span className="text-white/50 text-rt-12">{t('find:available')}</span>
                <div className="flex-1 h-px bg-surface-line" />
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {disponibles.map((x) => <TarjetaProfesor key={x.id} t={x} lang={lang} />)}
            </ul>
          </>
        )}

        {!profile?.teacher_id && (
          <button onClick={signOut} className="text-white/50 text-rt-12 mt-6 text-center block mx-auto">{t('cuenta:mk.exit')}</button>
        )}

        {filtersOpen && (
          <FiltersSheet
            filters={filters}
            teachers={teachers}
            textos={{
              filterTitle: t('find:filterTitle'), gender: t('find:gender'),
              payFormat: t('find:payFormat'), professional: t('find:professional'),
              specialty: t('find:specialty'), region: t('find:region'),
              country: t('find:country'), state: t('find:state'), city: t('find:city'),
              save: t('find:save'), clear: t('find:clear'),
              hour: t('find:hour'), month: t('find:month'),
            }}
            onClose={() => setFiltersOpen(false)}
            onApply={(f) => { setFilters(f); setFiltersOpen(false) }}
          />
        )}
      </div>
    </div>
  )
}

/** Tarjeta de la lista: nombre, rol + formato, región y rango de precio. */
function TarjetaProfesor({ t: prof, invitado = false, lang }: { t: Teacher; invitado?: boolean; lang: 'pt' | 'es' | 'en' }) {
  const { t } = useTranslation()
  const moneda = currencyOf(prof.country)
  const formato = etiquetaDe(formatosTrabalho, (prof.work_formats ?? [])[0], lang)
  const region = [prof.state, prof.city].filter(Boolean).join(' - ')

  const rango =
    prof.price_monthly_min != null && prof.price_monthly_max != null
      ? `${formatMoneyShort(Number(prof.price_monthly_min), moneda)} - ${formatMoneyShort(Number(prof.price_monthly_max), moneda)}/${t('cuenta:mk.perMonth')}`
      : prof.price_hourly_min != null && prof.price_hourly_max != null
        ? `${formatMoneyShort(Number(prof.price_hourly_min), moneda)} - ${formatMoneyShort(Number(prof.price_hourly_max), moneda)}/h`
        : null

  return (
    <li>
      <Link
        to={`/aluno/encontrar-professor/${prof.id}`}
        className={
          'card-dark p-3 flex items-center gap-3 active:scale-[0.99] ' +
          (invitado ? 'border-brand' : '')
        }
      >
        <div className="w-16 h-16 rounded-full bg-surface-raised border-[2.5px] border-brand flex items-center justify-center overflow-hidden shrink-0">
          {prof.avatar_url ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={28} className="text-grey-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white text-rt-16 font-bold truncate">{prof.full_name}</div>
          <div className="text-white/60 text-rt-12">{prof.occupation ? etiquetaDe(atuacoes, prof.occupation, lang) : t('cuenta:mk.instructor')}</div>
          {formato && <div className="text-white/60 text-rt-12">{formato}</div>}
        </div>

        <div className="flex flex-col items-end gap-2 min-w-0 max-w-[46%]">
          {invitado ? (
            <span className="px-3 h-7 rounded-btn-pill bg-brand text-white text-rt-11 font-semibold flex items-center">
              {t('cuenta:mk.inviteSent')}
            </span>
          ) : region ? (
            <span className="px-3 py-1 rounded-btn-pill bg-tone-rose text-white text-rt-11 font-medium max-w-full truncate block">
              {region}
            </span>
          ) : null}
          {/* Sin nowrap: si el rango es largo baja de línea en vez de comerse el nombre. */}
          {rango && <span className="text-white text-rt-12 font-semibold text-right leading-[1.3]">{rango}</span>}
        </div>
      </Link>
    </li>
  )
}

function FiltersSheet({ filters, teachers, textos, onClose, onApply }: {
  filters: Filters; teachers: Teacher[]
  textos: Record<string, string>
  onClose: () => void; onApply: (f: Filters) => void
}) {
  const { t, i18n } = useTranslation()
  const [f, setF] = useState<Filters>(filters)
  const occupations = uniq(teachers.map((t) => t.occupation).filter(Boolean) as string[])
  const specialties = uniq(teachers.flatMap((t) => t.specialties ?? []))
  const paises = uniq(teachers.map((t) => t.country).filter(Boolean) as string[])
  const states = uniq(teachers.filter((t) => !f.country || t.country === f.country).map((t) => t.state).filter(Boolean) as string[])
  const cities = uniq(teachers.filter((t) => !f.state || t.state === f.state).map((t) => t.city).filter(Boolean) as string[])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-rt-20 font-bold flex-1 text-center">{textos.filterTitle}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('common:close')}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <Segmento
            label={textos.gender}
            opts={[{ v: 'F', l: 'F' }, { v: 'M', l: 'M' }]}
            val={f.gender}
            on={(v) => setF({ ...f, gender: v })}
          />
          <Segmento
            label={textos.payFormat}
            opts={[{ v: 'hourly', l: textos.hour }, { v: 'monthly', l: textos.month }]}
            val={f.payFormat}
            on={(v) => setF({ ...f, payFormat: v })}
          />
          <Chips label={textos.professional} opts={occupations.map((o) => ({ v: o, l: etiquetaDe(atuacoes, o, i18n.language) }))} val={f.occupation} on={(v) => setF({ ...f, occupation: v })} />
          <Chips label={textos.specialty} opts={specialties.map((o) => ({ v: o, l: etiquetaDe(especialidades, o, i18n.language) }))} val={f.specialty} on={(v) => setF({ ...f, specialty: v })} />

          <div>
            <div className="text-white text-rt-16 font-bold mb-3">{textos.region}</div>
            <div className="flex flex-col gap-3">
              <CajaSelect label={textos.country} val={f.country} opts={paises} etiquetas={Object.fromEntries(paises.map((c) => { const p = countryByCode(c); return [c, p ? `${p.flag} ${nombrePais(p, i18n.language)}` : c] }))} on={(v) => setF({ ...f, country: v, state: '', city: '' })} />
              <CajaSelect label={textos.state} val={f.state} opts={states} on={(v) => setF({ ...f, state: v, city: '' })} />
              <CajaSelect label={textos.city} val={f.city} opts={cities} on={(v) => setF({ ...f, city: v })} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-8">
          <button onClick={() => onApply(emptyFilters)} className="flex-1 h-[52px] rounded-btn-pill border border-grey-700 text-grey-300 text-rt-14 font-semibold">
            {textos.clear}
          </button>
          <button onClick={() => onApply(f)} className="flex-[2] btn-save h-[52px]">
            {textos.save}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Par de opciones dentro de una sola cápsula, como el diseño. */
function Segmento({ label, opts, val, on }: { label: string; opts: { v: string; l: string }[]; val: string; on: (v: string) => void }) {
  return (
    <div>
      <div className="text-white text-rt-16 font-bold mb-3">{label}</div>
      <div className="inline-flex rounded-btn-pill border border-grey-700 overflow-hidden">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => on(val === o.v ? '' : o.v)}
            className={
              'w-[100px] h-11 text-rt-14 font-medium ' +
              (val === o.v ? 'bg-brand text-white' : 'bg-transparent text-white/70')
            }
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Caja con etiqueta arriba, como País/Estado/Cidade del diseño. */
function CajaSelect({ label, val, opts, on, etiquetas }: { label: string; val: string; opts: string[]; on: (v: string) => void; etiquetas?: Record<string, string> }) {
  return (
    <div className="relative rounded-[12px] bg-surface-input border border-surface-line px-4 pt-2 pb-1">
      <div className={'text-rt-11 ' + (val ? 'text-brand' : 'text-white/40')}>{label}</div>
      <select
        value={val}
        onChange={(e) => on(e.target.value)}
        className="w-full bg-transparent text-white text-rt-15 outline-none appearance-none py-1 pr-6"
      >
        <option value="">—</option>
        {opts.map((o) => <option key={o} value={o}>{etiquetas?.[o] ?? o}</option>)}
      </select>
      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-grey-500 pointer-events-none" />
    </div>
  )
}

function Chips({ label, opts, val, on }: { label: string; opts: { v: string; l: string }[]; val: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="block text-white text-rt-13 font-semibold mb-2">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {opts.map((o) => (
          <button key={o.v} type="button" onClick={() => on(val === o.v ? '' : o.v)} className={
            'px-3 h-8 rounded-card border text-rt-12 font-semibold ' +
            (val === o.v ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
          }>{o.l}</button>
        ))}
      </div>
    </div>
  )
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)) }
