import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AvatarUpload } from '@/components/AvatarUpload'
import { WhatsAppInput } from '@/components/WhatsAppInput'
import { COUNTRIES, countryByCode } from '@/lib/countries'
import { FeedbackDialog } from '@/components/FeedbackDialog'

export function MeuPerfilPage() {
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const { profile, refresh } = useAuth()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'pt') as 'pt' | 'es'
  const esAluno = profile?.role === 'student'

  const [name, setName] = useState('')
  const [country, setCountry] = useState('BR')
  const [phone, setPhone] = useState('')
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [paisAbierto, setPaisAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)

  // El teléfono se guarda con el prefijo pegado ("+5511987654321"); en pantalla
  // el prefijo es del selector, así que se separa al entrar y se junta al salir.
  useEffect(() => {
    const pais = profile?.country ?? 'BR'
    setName(profile?.full_name ?? '')
    setCountry(pais)
    const dial = countryByCode(pais)?.dial ?? ''
    const tel = profile?.phone ?? ''
    setPhone(dial && tel.startsWith(dial) ? tel.slice(dial.length) : tel)
  }, [profile?.id])

  useEffect(() => {
    if (!esAluno || !profile?.teacher_id) { setTeacherName(null); return }
    void (async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', profile.teacher_id!).maybeSingle()
      setTeacherName((data as { full_name: string | null } | null)?.full_name ?? null)
    })()
  }, [esAluno, profile?.teacher_id])

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    const dial = countryByCode(country)?.dial ?? ''
    const limpio = phone.replace(/\D/g, '')
    const { error } = await supabase.from('profiles').update({
      full_name: name.trim() || null,
      phone: limpio ? `${dial}${limpio}` : null,
      country,
    }).eq('id', profile.id)
    setSaving(false)
    if (error) { setAviso({ kind: 'error', msg: error.message }); return }
    await refresh()
    setAviso({ kind: 'success', msg: t('settings:profileSaved') })
  }

  const pais = countryByCode(country) ?? COUNTRIES[0]

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('settings:profileTitle')}</h1>
      </div>

      {/* Foto al lado de los dos primeros campos, como en el diseño */}
      <div className="flex gap-4 mb-6">
        <AvatarUpload size={104} />
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <CampoSubrayado label={t('settings:fullName')} value={name} onChange={setName} />
          <WhatsAppInput
            countryCode={country}
            onCountry={setCountry}
            value={phone}
            onChange={setPhone}
            lang={lang}
            variant="dark-underline"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <CampoBloqueado label={t('email')} value={profile?.email ?? ''} />

        <div>
          <label className="block text-white/60 text-rt-11 mb-1">{t('settings:country')}</label>
          <button
            type="button"
            onClick={() => setPaisAbierto(true)}
            className="w-full flex items-center gap-2 border-b border-surface-divider py-2 text-left"
          >
            <span className="text-rt-16">{pais.flag}</span>
            <span className="flex-1 text-white text-rt-14">{lang === 'es' ? pais.name_es : pais.name_pt}</span>
            <ChevronDown size={18} className="text-grey-500" />
          </button>
        </div>

        {esAluno && (
          <CampoBloqueado label={t('settings:teacherField')} value={teacherName ?? t('settings:noTeacher')} />
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => nav(-1)}
          className="flex-1 h-[54px] rounded-[27px] bg-danger-wine text-white text-rt-16 font-bold"
        >
          {t('settings:cancel')}
        </button>
        <button onClick={save} disabled={saving} className="flex-1 btn-save">
          {saving ? t('loading') : t('save')}
        </button>
      </div>

      <button
        onClick={() => nav(esAluno ? '/aluno/configuracoes' : '/professor/configuracoes')}
        className="w-full text-center text-white/40 text-rt-13 tracking-[1px] font-semibold mt-8"
      >
        {t('settings:moreSettings')}
      </button>

      {paisAbierto && (
        <SheetPais
          titulo={t('settings:chooseCountry')}
          lang={lang}
          value={country}
          onChange={(c) => { setCountry(c); setPaisAbierto(false) }}
          onClose={() => setPaisAbierto(false)}
        />
      )}

      {aviso && (
        <FeedbackDialog kind={aviso.kind} message={aviso.msg} onClose={() => setAviso(null)} />
      )}
    </div>
  )
}

function CampoSubrayado({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-white/60 text-rt-11 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-brand text-white text-rt-14 py-2 outline-none"
      />
    </div>
  )
}

/** Email y professor no los cambia el usuario: se muestran con candado. */
function CampoBloqueado({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-white/60 text-rt-11 mb-1">{label}</label>
      <div className="w-full flex items-center gap-2 border-b border-surface-divider py-2">
        <span className="flex-1 text-grey-500 text-rt-14 truncate">{value}</span>
        <Lock size={15} className="text-grey-600" />
      </div>
    </div>
  )
}

function SheetPais({ titulo, lang, value, onChange, onClose }: {
  titulo: string; lang: 'pt' | 'es'; value: string; onChange: (c: string) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] max-h-[70dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-rt-18 font-bold mb-4">{titulo}</h2>
        <ul className="flex flex-col">
          {COUNTRIES.map((c) => (
            <li key={c.code}>
              <button
                onClick={() => onChange(c.code)}
                className={
                  'w-full flex items-center gap-3 py-3 border-b border-surface-line last:border-0 text-left ' +
                  (c.code === value ? 'text-brand' : 'text-white')
                }
              >
                <span className="text-rt-18">{c.flag}</span>
                <span className="flex-1 text-rt-14">{lang === 'es' ? c.name_es : c.name_pt}</span>
                <span className="text-grey-500 text-rt-12">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
