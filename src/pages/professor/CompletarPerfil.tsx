import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth, type Profile } from '@/lib/auth'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { CamposProfesionales, CamposUbicacion, usePerfilProfesional } from '@/components/professor/PerfilProfesional'
import { detalleError } from '@/lib/errores'

export function CompletarPerfilPage() {
  const { profile } = useAuth()
  if (!profile) return null
  return <Formulario key={profile.id} profile={profile} />
}

function Formulario({ profile }: { profile: Profile }) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const volver = params.get('volver')?.startsWith('/professor/') ? params.get('volver')! : '/professor'
  const { t } = useTranslation()
  const { refresh } = useAuth()
  const [country, setCountry] = useState(profile.country ?? 'BR')
  const f = usePerfilProfesional(profile, country)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  async function save(extra?: { marketplace_visible?: boolean }) {
    if (!f.completo) { setFeedback({ kind: 'error', message: t('completeProfile:missing') }); return }
    setSaving(true)
    const { error } = await supabase.from('profiles').update(f.datos(extra)).eq('id', profile.id)
    setSaving(false)
    if (error) { setFeedback({ kind: 'error', message: detalleError(error) }); return }
    await refresh()
    setFeedback({ kind: 'success', message: t('completeProfile:saved') })
  }

  return (
    // Hoja a pantalla completa sobre la app (tapa la barra inferior), como en el diseño.
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] overflow-y-auto">
      <div className="max-w-app mx-auto px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-white text-rt-24 font-bold">{t('completeProfile:title')}</h1>
          <button onClick={() => nav(-1)} aria-label={t('close')} className="w-11 h-11 shrink-0 rounded-full bg-[#333333] flex items-center justify-center text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-white/70 text-rt-14 leading-relaxed">{t('completeProfile:subtitle')}</p>

          <h2 className="text-brand text-rt-16 font-semibold mt-2">{t('completeProfile:sectionLocation')}</h2>
          <CamposUbicacion f={f} onCountry={setCountry} />

          <h2 className="text-brand text-rt-16 font-semibold mt-2">{t('completeProfile:sectionProfessional')}</h2>
          <CamposProfesionales f={f} />
        </div>

        <button className="btn-save mt-8" disabled={saving} onClick={() => void save()}>{saving ? t('loading') : t('save')}</button>
        <button
          type="button"
          disabled={saving}
          onClick={() => { f.setMarketVisible(false); void save({ marketplace_visible: false }) }}
          className="w-full text-center text-white/60 text-rt-13 underline mt-5"
        >
          {t('completeProfile:notInSearch')}
        </button>
      </div>

      {feedback && (
        <FeedbackDialog
          kind={feedback.kind}
          message={feedback.message}
          onClose={() => {
            const exito = feedback.kind === 'success'
            setFeedback(null)
            if (exito) nav(volver, { replace: true })
          }}
        />
      )}
    </div>
  )
}
