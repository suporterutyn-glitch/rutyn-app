import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { currencyOf, formatMoney, leerMonto } from '@/lib/plans'
import { FullScreenSheet, Field } from '@/pages/professor/projetos/RoutinesTab'
import { atuacoes, especialidades, formatosTrabalho, etiquetaDe } from '@/lib/catalogos'
import { diasCortos } from '@/lib/fechas'

type Teacher = {
  id: string
  full_name: string | null
  avatar_url: string | null
  state: string | null
  city: string | null
  occupation: string | null
  specialties: string[] | null
  ideal_clients: string[] | null
  work_formats: string[] | null
  price_hourly_min: number | null
  price_hourly_max: number | null
  price_monthly_min: number | null
  price_monthly_max: number | null
  bio: string | null
  country: string | null
}

export function PerfilProfessorPublicoPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [invite, setInvite] = useState<{ id: string; status: string } | null>(null)
  const [showProposta, setShowProposta] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const [{ data: t }, { data: inv }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,avatar_url,state,city,occupation,specialties,ideal_clients,work_formats,price_hourly_min,price_hourly_max,price_monthly_min,price_monthly_max,bio,country').eq('id', id).single(),
        supabase.from('invites').select('id,status').eq('teacher_id', id).eq('student_id', profile?.id ?? '').maybeSingle(),
      ])
      setTeacher(t as Teacher)
      setInvite(inv as { id: string; status: string } | null)
    })()
  }, [id, profile?.id])

  const currency = currencyOf(teacher?.country)

  return (
    <div className="app-shell app-bg-pro">
      <div className="relative z-10 min-h-dvh px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-24">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white mb-4">
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-24 h-24 rounded-full bg-surface-raised border-2 border-brand flex items-center justify-center overflow-hidden mb-3">
            {teacher?.avatar_url ? <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-grey-500" />}
          </div>
          <div className="text-white text-rt-20 font-bold">{teacher?.full_name}</div>
          {teacher?.occupation && <div className="text-white/70 text-rt-13">{etiquetaDe(atuacoes, teacher.occupation, i18n.language)}</div>}
          {(teacher?.city || teacher?.state) && (
            <div className="flex items-center gap-1 text-tone-rose text-rt-12 mt-1">
              <MapPin size={14} /> {[teacher.city, teacher.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {teacher?.bio && (
          <div className="card-dark p-4 mb-3">
            <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide mb-1">{t('cuenta:pp.about')}</div>
            <div className="text-white text-rt-13 leading-relaxed">{teacher.bio}</div>
          </div>
        )}

        {teacher?.specialties && teacher.specialties.length > 0 && (
          <div className="card-dark p-4 mb-3">
            <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide mb-2">{t('cuenta:pp.specialties')}</div>
            <div className="flex flex-wrap gap-2">
              {teacher.specialties.map((s) => (
                <span key={s} className="px-3 h-7 rounded-card border border-brand/40 text-brand text-rt-11 font-semibold flex items-center">{etiquetaDe(especialidades, s, i18n.language)}</span>
              ))}
            </div>
          </div>
        )}

        {(teacher?.price_hourly_min != null || teacher?.price_monthly_min != null) && (
          <div className="card-dark p-4 mb-6">
            <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide mb-2">{t('cuenta:pp.prices')}</div>
            {teacher?.price_hourly_min != null && (
              <div className="text-white text-rt-14"><strong>{t('cuenta:pp.perHour')}</strong> {formatMoney(Number(teacher.price_hourly_min), currency)} — {formatMoney(Number(teacher.price_hourly_max), currency)}</div>
            )}
            {teacher?.price_monthly_min != null && (
              <div className="text-white text-rt-14"><strong>{t('cuenta:pp.monthly')}</strong> {formatMoney(Number(teacher.price_monthly_min), currency)} — {formatMoney(Number(teacher.price_monthly_max), currency)}</div>
            )}
          </div>
        )}

        {invite ? (
          <div className="card-dark p-4 flex items-center gap-3 border-warning/40">
            <CheckCircle2 className="text-warning" />
            <div className="flex-1 text-white text-rt-13">
              {['pending', 'accepted', 'countered'].includes(invite.status) ? t(`cuenta:pp.inv_${invite.status}`) : t('cuenta:pp.inv_other', { s: invite.status })}
            </div>
          </div>
        ) : (
          <button onClick={() => setShowProposta(true)} className="btn-primary-pill">
            {t('cuenta:pp.sendProposal')}
          </button>
        )}

        {showProposta && teacher && (
          <PropostaSheet teacher={teacher} onClose={() => setShowProposta(false)} onSent={() => { setShowProposta(false); nav('/aguardando') }} />
        )}
      </div>
    </div>
  )
}

function PropostaSheet({ teacher, onClose, onSent }: { teacher: Teacher; onClose: () => void; onSent: () => void }) {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const [format, setFormat] = useState<'monthly' | 'hourly'>('monthly')
  const [amount, setAmount] = useState('')
  const [freq, setFreq] = useState(3)
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [model, setModel] = useState('inPerson')
  const [objectives, setObjectives] = useState('')
  const [saving, setSaving] = useState(false)
  const currency = currencyOf(teacher.country)

  function toggleDay(d: number) {
    if (days.includes(d)) setDays(days.filter((x) => x !== d))
    else if (days.length < freq) setDays([...days, d].sort())
  }

  async function send() {
    if (!profile?.id || !amount) return
    setSaving(true)
    try {
      // Crear la invitación
      const { data: inviteData, error: inviteError } = await supabase.from('invites').insert({
        student_id: profile.id, teacher_id: teacher.id,
        format, amount: leerMonto(amount), frequency: freq, weekdays: days.slice(0, freq),
        model, objectives: objectives.split(',').map((s) => s.trim()).filter(Boolean),
        last_offer_by: 'student', status: 'pending',
      }).select()
      
      if (inviteError) throw inviteError

      // Actualizar link_status
      await supabase.from('profiles').update({ link_status: 'pending' }).eq('id', profile.id)

      // Enviar email de invitación
      if (inviteData && inviteData.length > 0) {
        const invite = inviteData[0]
        await supabase.functions.invoke('send-invitation-email', {
          body: {
            invite_id: invite.id,
            student_email: profile.email,
            student_name: profile.full_name || 'Student',
            teacher_name: teacher.full_name || 'Teacher',
            language: i18n.language,
          },
        })
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
    } finally {
      setSaving(false)
      onSent()
    }
  }

  return (
    <FullScreenSheet title={t('cuenta:pp.sendProposal')} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label={t('cuenta:pp.format')}>
          <div className="flex gap-2">
            {(['monthly', 'hourly'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)} className={
                'flex-1 h-10 rounded-btn-pill border text-rt-12 font-semibold ' +
                (format === f ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{f === 'monthly' ? t('cuenta:pp.fmtMonthly') : t('cuenta:pp.fmtHourly')}</button>
            ))}
          </div>
        </Field>
        <Field label={t('cuenta:pp.amount', { c: currency })}>
          <input inputMode="decimal" className="input-dark" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label={t('cuenta:pp.frequency')}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => { setFreq(n); if (days.length > n) setDays(days.slice(0, n)) }} className={
                'w-9 h-9 rounded-full text-rt-12 font-semibold ' +
                (freq === n ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{n}x</button>
            ))}
          </div>
        </Field>
        <Field label={t('cuenta:pp.days', { n: freq })}>
          <div className="flex gap-2 justify-between">
            {diasCortos(i18n.language).map((l, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)} className={
                'flex-1 h-10 rounded-lg text-rt-12 font-semibold ' +
                (days.includes(i) ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{l}</button>
            ))}
          </div>
        </Field>
        <Field label={t('cuenta:pp.model')}>
          <div className="flex gap-2">
            {formatosTrabalho.map(({ id: m }) => (
              <button key={m} type="button" onClick={() => setModel(m)} className={
                'flex-1 h-10 rounded-btn-pill border text-rt-12 font-semibold capitalize ' +
                (model === m ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{etiquetaDe(formatosTrabalho, m, i18n.language)}</button>
            ))}
          </div>
        </Field>
        <Field label={t('cuenta:pp.objectives')}>
          <input className="input-dark" value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder={t('cuenta:pp.objectivesHint')} />
        </Field>
      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={saving || !amount || days.length !== freq} onClick={send}>
          {saving ? t('cuenta:pp.sending') : t('cuenta:pp.sendProposal')}
        </button>
      </div>
    </FullScreenSheet>
  )
}
