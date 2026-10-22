import { BarraFlotante } from '@/components/BarraFlotante'
import { FolderKanban, Users, Home, MessageCircle, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ProfessorBottomNav() {
  const { t } = useTranslation()
  const items = [
    { to: '/professor/projetos', icon: FolderKanban, label: t('professor:tabs.projects') },
    { to: '/professor/alunos', icon: Users, label: t('professor:tabs.students') },
    { to: '/professor', icon: Home, label: t('professor:tabs.home'), center: true },
    { to: '/professor/mensagens', icon: MessageCircle, label: t('professor:tabs.messages') },
    { to: '/professor/financeiro', icon: Wallet, label: t('professor:tabs.financial') },
  ]
  return <BarraFlotante items={items} inicio="/professor" />
}
