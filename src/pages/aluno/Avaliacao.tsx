import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Evaluacion } from '@/components/evaluacion/Evaluacion'

/** 'Mi Evaluación': el alumno ve las secciones que el profesor dejó visibles y edita las liberadas. */
export function AvaliacaoAlunoPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { profile } = useAuth()
  // Solo con vínculo activo: un vínculo pendiente todavía no da acceso a la evaluación del profesor.
  const profesor = profile?.link_status === 'active' ? profile.teacher_id : null

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-28">
      <h1 className="text-white text-rt-20 font-bold mb-5 px-1">{t('evaluacion:mine')}</h1>
      {!profile ? null : !profesor ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center">
          <UserPlus size={64} className="text-grey-700" />
          <p className="text-grey-500 text-rt-16">{t('evaluacion:noTeacher')}</p>
          <button onClick={() => nav('/aluno/encontrar-professor')} className="text-grey-400 text-rt-13 underline">{t('evaluacion:noTeacherBody')}</button>
        </div>
      ) : (
        <Evaluacion studentId={profile.id} teacherId={profesor} modo="alumno" />
      )}
    </div>
  )
}
