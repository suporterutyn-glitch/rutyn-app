import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, User as UserIcon, Filter, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { LanguageToggle } from '@/components/LanguageToggle'
import { currencyOf, formatMoney } from '@/lib/plans'
import { FullScreenSheet, Field } from '@/pages/professor/projetos/RoutinesTab'

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
  country: string | null
}

type Filters = {
  occupation: string
  specialty: string
  format: string
  gender: string
  maxHourly: number | null
  state: string
  city: string
}
const emptyFilters: Filters = { occupation: '', specialty: '', format: '', gender: '', maxHourly: null, state: '', city: '' }

export function EncontrarProfessorPage() {
  const { signOut, profile } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,avatar_url,state,city,occupation,specialties,work_formats,gender,price_hourly_min,price_hourly_max,country')
        .eq('role', 'teacher')
        .eq('marketplace_visible', true)
        .eq('profile_complete', true)
        .order('full_name')
        .limit(50)
      setTeachers((data as Teacher[]) ?? [])
      setLoading(false)
    })()
  }, [])

  const activeFilters = Object.values(filters).filter((v) => v !== '' && v !== null).length
  const filtered = teachers.filter((t) => {
    if (query && !(t.full_name ?? '').toLowerCase().includes(query.toLowerCase())) return false
    if (filters.occupation && t.occupation !== filters.occupation) return false
    if (filters.specialty && !(t.specialties ?? []).includes(filters.specialty)) return false
    if (filters.format && !(t.work_formats ?? []).includes(filters.format)) return false
    if (filters.gender && t.gender !== filters.gender) return false
    if (filters.maxHourly != null && t.price_hourly_min != null && Number(t.price_hourly_min) > filters.maxHourly) return false
    if (filters.state && (t.state ?? '').toLowerCase() !== filters.state.toLowerCase()) return false
    if (filters.city && (t.city ?? '').toLowerCase() !== filters.city.toLowerCase()) return false
    return true
  })

  return (
    <div className="app-shell app-bg-pro">
      <div className="relative z-10 min-h-dvh px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-white text-rt-20 font-bold">Encontre um Instrutor</h1>
          <LanguageToggle />
        </div>
        <div className="text-white/60 text-rt-11 uppercase tracking-[1px] font-semibold mb-4">Encontre um Instrutor</div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full h-[50px] pl-11 pr-4 rounded-[10px] bg-white/10 border border-white/30 text-white text-rt-14 placeholder:text-white/50 outline-none focus:border-brand"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className={
              'w-[50px] h-[50px] rounded-[10px] relative flex items-center justify-center ' +
              (activeFilters > 0 ? 'bg-brand/20 border border-brand' : 'bg-white/10 border border-white/30')
            }
            aria-label="Filtros"
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
          <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="card-dark p-6 text-center">
            <UserIcon size={48} className="text-grey-600 mx-auto mb-3" />
            <div className="text-white text-rt-15 font-bold mb-1">Nenhum professor disponível ainda</div>
            <div className="text-white/60 text-rt-12">Volte em breve.</div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link to={`/aluno/encontrar-professor/${t.id}`} className="card-dark p-4 flex items-center gap-3 active:scale-[0.99]">
                  <div className="w-14 h-14 rounded-full bg-surface-raised border-2 border-brand flex items-center justify-center overflow-hidden">
                    {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={26} className="text-grey-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-rt-15 font-bold truncate">{t.full_name}</div>
                    {t.occupation && <div className="text-white/60 text-rt-11 truncate">{t.occupation}</div>}
                    <div className="flex items-center gap-3 mt-1">
                      {(t.state || t.city) && (
                        <span className="flex items-center gap-1 text-rt-10 text-tone-rose">
                          <MapPin size={12} /> {[t.city, t.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {t.price_hourly_min != null && (
                        <span className="text-rt-10 text-brand font-semibold">
                          {formatMoney(Number(t.price_hourly_min), currencyOf(t.country))}/h+
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!profile?.teacher_id && (
          <button onClick={signOut} className="text-white/50 text-rt-12 mt-6 text-center block mx-auto">Sair</button>
        )}

        {filtersOpen && (
          <FiltersSheet
            filters={filters}
            teachers={teachers}
            onClose={() => setFiltersOpen(false)}
            onApply={(f) => { setFilters(f); setFiltersOpen(false) }}
          />
        )}
      </div>
    </div>
  )
}

function FiltersSheet({ filters, teachers, onClose, onApply }: {
  filters: Filters; teachers: Teacher[]
  onClose: () => void; onApply: (f: Filters) => void
}) {
  const [f, setF] = useState<Filters>(filters)
  const occupations = uniq(teachers.map((t) => t.occupation).filter(Boolean) as string[])
  const specialties = uniq(teachers.flatMap((t) => t.specialties ?? []))
  const states = uniq(teachers.map((t) => t.state).filter(Boolean) as string[])
  const cities = uniq(teachers.filter((t) => !f.state || t.state === f.state).map((t) => t.city).filter(Boolean) as string[])

  return (
    <FullScreenSheet title="Filtros" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Chips label="Formato" opts={[{v:'presencial',l:'Presencial'},{v:'hibrido',l:'Híbrido'},{v:'online',l:'Online'}]} val={f.format} on={(v) => setF({ ...f, format: v })} />
        <Chips label="Gênero" opts={[{v:'M',l:'Masc.'},{v:'F',l:'Fem.'},{v:'X',l:'Outro'}]} val={f.gender} on={(v) => setF({ ...f, gender: v })} />
        <SelectField label="Atuação" val={f.occupation} opts={occupations} on={(v) => setF({ ...f, occupation: v })} />
        <SelectField label="Especialidade" val={f.specialty} opts={specialties} on={(v) => setF({ ...f, specialty: v })} />
        <SelectField label="Estado" val={f.state} opts={states} on={(v) => setF({ ...f, state: v, city: '' })} />
        <SelectField label="Cidade" val={f.city} opts={cities} on={(v) => setF({ ...f, city: v })} />
        <Field label={`Preço máximo por hora ${f.maxHourly ? `(${f.maxHourly})` : ''}`}>
          <input type="range" min="0" max="500" step="10" value={f.maxHourly ?? 500}
            onChange={(e) => setF({ ...f, maxHourly: Number(e.target.value) === 500 ? null : Number(e.target.value) })}
            className="w-full accent-brand" />
        </Field>
      </div>
      <div className="flex gap-2 mt-8">
        <button onClick={() => onApply(emptyFilters)} className="flex-1 h-11 rounded-btn-pill bg-transparent border border-grey-700 text-grey-300 text-rt-13 font-semibold flex items-center justify-center gap-1">
          <X size={14} /> Limpar
        </button>
        <button onClick={() => onApply(f)} className="flex-[2] h-11 rounded-btn-pill bg-brand text-white text-rt-13 font-bold">
          Aplicar filtros
        </button>
      </div>
    </FullScreenSheet>
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

function SelectField({ label, val, opts, on }: { label: string; val: string; opts: string[]; on: (v: string) => void }) {
  if (opts.length === 0) return null
  return (
    <div>
      <label className="block text-white text-rt-13 font-semibold mb-2">{label}</label>
      <select value={val} onChange={(e) => on(e.target.value)} className="input-dark">
        <option value="">Todos</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)) }
