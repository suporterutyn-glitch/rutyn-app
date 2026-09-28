import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Evaluacion } from '@/components/evaluacion/Evaluacion'

/** Ruta directa a la evaluación de un alumno (la misma que la pestaña 'Evaluaciones' del perfil). */
export function AvaliacaoProfessorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-28">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => nav(-1)} aria-label={t('back')} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('evaluacion:title')}</h1>
      </div>
      {id && profile?.id && <Evaluacion studentId={id} teacherId={profile.id} modo="profesor" />}
    </div>
  )
}
