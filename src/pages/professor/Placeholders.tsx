import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function Screen({ title, body }: { title: string; body: string }) {
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <h1 className="text-white text-rt-20 font-bold mb-4">{title}</h1>
      <div className="card-dark p-4 text-white/70 text-rt-13">{body}</div>
    </div>
  )
}

function ScreenBack({ title, body }: { title: string; body: string }) {
  const nav = useNavigate()
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{title}</h1>
      </div>
      <div className="card-dark p-4 text-white/70 text-rt-13">{body}</div>
    </div>
  )
}

export const MensagensPage = () => <Screen title="Mensagens" body="Chat será construído na fase 5 (módulo 15)." />
export const NotificacoesPage = () => <ScreenBack title="Notificações" body="Central de notificações — em construção." />
export const AvaliacoesPage = () => <ScreenBack title="Avaliações" body="Avaliações físicas — fase 5 (módulo 06)." />
