import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, UserPlus, X, User as UserIcon, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { WhatsAppInput } from '@/components/WhatsAppInput'
import { DarkSelectSheet } from '@/components/DarkSheets'
import { countryByCode } from '@/lib/countries'
import { currencyOf, formatMoney } from '@/lib/plans'

type Student = {
  id: string
  full_name: string | null
  email: string | null
  link_status: string
  avatar_url: string | null
  phone: string | null
}

type Cobranza = { student_id: string; due_date: string; status: string }

type EstadoCobranza = 'none' | 'upToDate' | 'pending' | 'overdue' | 'awaiting' | 'suspended'

/** Deriva el estado de pago del alumno a partir de sus cobranzas abiertas. */
function estadoCobranza(cobranzas: Cobranza[]): EstadoCobranza {
  if (!cobranzas.length) return 'none'
  if (cobranzas.some((c) => c.status === 'suspended')) return 'suspended'
  if (cobranzas.some((c) => c.status === 'awaiting')) return 'awaiting'
  const abiertas = cobranzas.filter((c) => c.status === 'pending')
  if (!abiertas.length) return 'upToDate'
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const dias = abiertas.map((c) =>
    Math.floor((new Date(c.due_date + 'T00:00:00').getTime() - hoy.getTime()) / 86400000),
  )
  const masCercano = Math.min(...dias)
  if (masCercano < 0) return 'overdue'
  if (masCercano <= 5) return 'pending'
  return 'upToDate'
}

const COLOR_COBRANZA: Record<EstadoCobranza, string> = {
  none: 'bg-grey-500',
  upToDate: 'bg-brand',
  pending: 'bg-warning',
  overdue: 'bg-warning',
  awaiting: 'bg-[#2196F3]',
  suspended: 'bg-grey-500',
}

// Color estable por alumno, para que la inicial no cambie entre recargas.
const COLORES_INICIAL = ['#2196F3', '#26A69A', '#7E57C2', '#EF5350', '#FFA726', '#66BB6A']
function colorDe(id: string) {
  let suma = 0
  for (let i = 0; i < id.length; i++) suma += id.charCodeAt(i)
  return COLORES_INICIAL[suma % COLORES_INICIAL.length]
}

const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 25, master: 50, elite: 100 }

export function AlunosPage() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const [items, setItems] = useState<Student[]>([])
  const [cobranzas, setCobranzas] = useState<Record<string, Cobranza[]>>({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [limiteAvisado, setLimiteAvisado] = useState(false)
  const nav = useNavigate()

  const planLimit = PLAN_LIMITS[profile?.plan ?? 'free'] ?? 2

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email,link_status,avatar_url,phone')
      .eq('teacher_id', profile.id)
      .order('full_name')
    setItems((data as Student[]) ?? [])

    const { data: chs } = await supabase
      .from('charges')
      .select('student_id,due_date,status')
      .eq('teacher_id', profile.id)
    const porAlumno: Record<string, Cobranza[]> = {}
    for (const c of (chs as Cobranza[]) ?? []) {
      ;(porAlumno[c.student_id] ??= []).push(c)
    }
    setCobranzas(porAlumno)
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  const active = items.filter((s) => s.link_status === 'active').length
  const q = query.trim().toLowerCase()
  const filtered = q
    ? items.filter(
        (s) =>
          (s.full_name ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q),
      )
    : items
  const pct = Math.min(100, Math.round((active / planLimit) * 100))
  const barColor = pct > 80 ? 'bg-danger-soft' : pct > 55 ? 'bg-warning' : pct > 35 ? 'bg-[#CDDC39]' : 'bg-brand-light'
  const canAdd = active < planLimit

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-white text-rt-20 font-bold">{t('students:title')}</h1>
      </div>

      {/* Barra de limite do plano */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-white/70 text-rt-11 font-semibold uppercase tracking-wide">{t('students:limit', { active, limit: planLimit })}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden">
          <div className={'h-full ' + barColor} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => (canAdd ? setShowNew(true) : setLimiteAvisado(true))}
          className={
            'w-[42px] h-[42px] rounded-full flex items-center justify-center ' +
            (canAdd ? 'bg-brand' : 'bg-grey-600')
          }
          aria-label="Adicionar aluno"
        >
          <UserPlus size={20} className="text-white" />
        </button>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('students:searchStudent')}
            className="w-full h-[42px] pl-11 pr-10 rounded-[20px] bg-black/30 border border-brand/30 text-white text-rt-13 placeholder:text-grey-600 outline-none focus:border-brand"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500" aria-label="Limpar">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserIcon} title={t('students:noStudents')} body={t('students:noStudentsSub')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
            <li key={s.id} className="card-dark p-4 relative">
              {(() => {
                const estado = estadoCobranza(cobranzas[s.id] ?? [])
                return (
                  <span
                    title={t(`students:billing.${estado}`)}
                    aria-label={t(`students:billing.${estado}`)}
                    className={'absolute top-3 right-3 w-3.5 h-3.5 rounded-full ' + COLOR_COBRANZA[estado]}
                  />
                )
              })()}
              <div className="flex items-center gap-3">
                <Link to={`/professor/alunos/${s.id}`} className="shrink-0">
                  <div
                    className="w-16 h-16 rounded-full border-2 border-brand flex items-center justify-center overflow-hidden"
                    style={s.avatar_url ? undefined : { backgroundColor: colorDe(s.id) }}
                  >
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : s.full_name ? (
                      <span className="text-white text-rt-24 font-bold">
                        {s.full_name.trim().charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserIcon size={26} className="text-white" />
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/professor/alunos/${s.id}`} className="block min-w-0">
                    <div className="text-white text-rt-18 font-bold truncate">{s.full_name ?? 'Sem nome'}</div>
                    <div className="text-grey-500 text-rt-13 truncate mb-2">{s.email}</div>
                  </Link>

                  {s.phone && (
                    <a
                      href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-btn-pill border border-brand text-brand text-rt-13 font-semibold"
                    >
                      <Phone size={16} />
                      {t('students:whatsapp')}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {limiteAvisado && (
        <FeedbackDialog
          kind="error"
          message={t('invites:limitReached')}
          onClose={() => {
            setLimiteAvisado(false)
            nav('/professor/assinatura')
          }}
        />
      )}

      {showNew && <NewStudentSheet profile={profile} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
    </div>
  )
}

function NewStudentSheet({ profile, onClose, onCreated }: { profile: any; onClose: () => void; onCreated: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'pt') as 'pt' | 'es'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState(profile?.country ?? 'BR')
  const [phone, setPhone] = useState('')
  const [format, setFormat] = useState<'monthly' | 'hourly'>('monthly')
  const [amount, setAmount] = useState('')
  const [hours, setHours] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valor = Number(amount.replace(',', '.')) || 0
  const horas = Number(hours.replace(',', '.')) || 0
  const total = format === 'hourly' ? valor * horas : valor

  async function save() {
    if (!name.trim() || !email.trim()) { setError(t('students:nameHint')); return }
    setSaving(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: { email: email.trim(), full_name: name.trim(), teacher_id: profile?.id },
      })
      if (error) { setSaving(false); setError(error.message || 'Erro ao criar aluno'); return }
      if (data?.error) { setSaving(false); setError(data.error); return }

      const studentId = data?.student_id
      if (studentId) {
        if (phone.trim()) {
          await supabase
            .from('profiles')
            .update({ phone: `${countryByCode(countryCode)?.dial}${phone.trim()}`, country: countryCode })
            .eq('id', studentId)
        }
        // Primera cobranza: sin esto el alumno queda sin cobro asociado.
        if (total > 0) {
          await supabase.from('charges').insert({
            teacher_id: profile?.id,
            student_id: studentId,
            format,
            amount: total,
            hours: format === 'hourly' ? horas : null,
            due_date: dueDate,
            status: 'pending',
          })
        }
      }
      setSaving(false)
      onCreated()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <FullScreenSheet title={t('students:registerStudent')} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Field label={t('signupTeacher:fullName')}>
          <input className="input-dark" placeholder={t('students:nameHint')} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label={t('email')}>
          <input type="email" className="input-dark" placeholder={t('students:emailHint')} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <WhatsAppInput countryCode={countryCode} onCountry={setCountryCode} value={phone} onChange={setPhone} lang={lang} variant="dark" />

        <DarkSelectSheet
          label={t('students:paymentFormat')}
          title={t('students:paymentFormat')}
          value={format}
          onChange={(v) => setFormat(v as 'monthly' | 'hourly')}
          options={[
            { id: 'monthly', label: t('students:formatMonthly') },
            { id: 'hourly', label: t('students:formatHourly') },
          ]}
        />

        <Field label={format === 'hourly' ? t('students:amountHourly') : t('students:amountMonthly')}>
          <input inputMode="decimal" className="input-dark" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        {format === 'hourly' && (
          <>
            <Field label={t('students:hoursPerMonth')}>
              <input inputMode="decimal" className="input-dark" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <div className="flex justify-between text-rt-14">
              <span className="text-grey-400">{t('students:total')}</span>
              <span className="text-brand font-bold">{formatMoney(total, currencyOf(countryCode))}</span>
            </div>
          </>
        )}

        <Field label={t('students:paymentDate')}>
          <input type="date" className="input-dark" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={saving} onClick={save}>
          {saving ? t('loading') : t('students:registerStudent')}
        </button>
      </div>

      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
    </FullScreenSheet>
  )
}
