import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth, type Profile } from '@/lib/auth'
import { AvatarUpload } from '@/components/AvatarUpload'
import { WhatsAppInput } from '@/components/WhatsAppInput'
import { COUNTRIES, countryByCode, nombrePais } from '@/lib/countries'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { idiomaDe } from '@/lib/catalogos'
import { detalleError } from '@/lib/errores'
import { CamposProfesionales, CamposUbicacion, usePerfilProfesional } from '@/components/professor/PerfilProfesional'

export function MeuPerfilPage() {
  const { profile } = useAuth()
  if (!profile) return null
  return <Formulario key={profile.id} profile={profile} />
}

/** El teléfono se guarda con el prefijo pegado ("+59899..."): el prefijo sale del número, no del país del perfil. */
function separarTelefono(tel: string | null | undefined, paisPerfil: string) {
  const t = tel ?? ''
  const pais = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => t.startsWith(c.dial))
  if (pais) return { pais: pais.code, numero: t.slice(pais.dial.length) }
  return { pais: paisPerfil, numero: t }
}

function Formulario({ profile }: { profile: Profile }) {
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const { refresh } = useAuth()
  const lang = idiomaDe(i18n.language)
  const esAluno = profile.role === 'student'
  const esProfe = profile.role === 'teacher'
  const tel = separarTelefono(profile.phone, profile.country ?? 'BR')

  const [name, setName] = useState(profile.full_name ?? '')
  const [country, setCountry] = useState(profile.country ?? 'BR')
  const [phoneCountry, setPhoneCountry] = useState(tel.pais)
  const [phone, setPhone] = useState(tel.numero)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [paisAbierto, setPaisAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)
  const f = usePerfilProfesional(profile, country)

  useEffect(() => {
    if (!esAluno || !profile.teacher_id) { setTeacherName(null); return }
    void (async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', profile.teacher_id!).maybeSingle()
      setTeacherName((data as { full_name: string | null } | null)?.full_name ?? null)
    })()
  }, [esAluno, profile.teacher_id])

  async function save() {
    setSaving(true)
    const dial = countryByCode(phoneCountry)?.dial ?? ''
    const limpio = phone.replace(/\D/g, '')
    const { error } = await supabase.from('profiles').update({
      full_name: name.trim() || null,
      phone: limpio ? `${dial}${limpio}` : null,
      country,
      ...(esProfe ? f.datos() : {}),
    }).eq('id', profile.id)
    setSaving(false)
    if (error) { setAviso({ kind: 'error', msg: detalleError(error) }); return }
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
            countryCode={phoneCountry}
            onCountry={setPhoneCountry}
            value={phone}
            onChange={setPhone}
            lang={lang}
            variant="dark-underline"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <CampoBloqueado label={t('email')} value={profile.email ?? ''} />

        <div>
          <label className="block text-white/60 text-rt-11 mb-1">{t('settings:country')}</label>
          <button
            type="button"
            onClick={() => setPaisAbierto(true)}
            className="w-full flex items-center gap-2 border-b border-surface-divider py-2 text-left"
          >
            <span className="text-rt-16">{pais.flag}</span>
            <span className="flex-1 text-white text-rt-14">{nombrePais(pais, lang)}</span>
            <ChevronDown size={18} className="text-grey-500" />
          </button>
        </div>

        {esAluno && (
          <CampoBloqueado label={t('settings:teacherField')} value={teacherName ?? t('settings:noTeacher')} />
        )}
      </div>

      {esProfe && (
        <div className="flex flex-col gap-5 mt-8">
          <h2 className="text-brand text-rt-16 font-semibold">{t('completeProfile:sectionLocation')}</h2>
          <CamposUbicacion f={f} />
          <h2 className="text-brand text-rt-16 font-semibold mt-2">{t('completeProfile:sectionProfessionalProfile')}</h2>
          <CamposProfesionales f={f} />
        </div>
      )}

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
  titulo: string; lang: string; value: string; onChange: (c: string) => void; onClose: () => void
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
                <span className="flex-1 text-rt-14">{nombrePais(c, lang)}</span>
                <span className="text-grey-500 text-rt-12">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
