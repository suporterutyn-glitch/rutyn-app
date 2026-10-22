import { BarraFlotante } from '@/components/BarraFlotante'
import { Dumbbell, Salad, Home, MessageCircle, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AlunoBottomNav() {
  const { t } = useTranslation()
  const items = [
    { to: '/aluno/treinos', icon: Dumbbell, label: t('aluno:tabs.workouts') },
    { to: '/aluno/nutricao', icon: Salad, label: t('aluno:tabs.nutrition') },
    { to: '/aluno', icon: Home, label: t('aluno:tabs.home'), center: true },
    { to: '/aluno/chat', icon: MessageCircle, label: t('aluno:tabs.chat') },
    { to: '/aluno/avaliacao', icon: ClipboardList, label: t('aluno:tabs.assessment') },
  ]
  return <BarraFlotante items={items} inicio="/aluno" />
}
