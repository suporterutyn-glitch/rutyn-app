import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const MSG: Record<string, { title: string; body: string }> = {
  suspenso: { title: 'Conta Suspensa', body: 'Fale com seu professor para regularizar.' },
  desativada: { title: 'Conta Desativada', body: 'Entre em contato com o suporte.' },
  exclusao: { title: 'Conta em Exclusão', body: 'Sua conta está em processo de exclusão.' },
  assinatura: { title: 'Assinatura Expirada', body: 'Regularize sua assinatura para continuar.' },
}

export function BloqueadoPage() {
  const [sp] = useSearchParams()
  const { signOut } = useAuth()
  const motivo = sp.get('motivo') || 'desativada'
  const m = MSG[motivo] ?? MSG.desativada

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh items-center justify-center px-6 gap-6">
        <h1 className="text-white text-rt-22 font-bold text-center">{m.title}</h1>
        <p className="text-white/80 text-center text-rt-14">{m.body}</p>
        <button
          className="btn-primary-pill"
          onClick={() => window.open('https://wa.me/', '_blank')}
        >
          Falar com Suporte
        </button>
        <button className="text-white/60 text-rt-13 font-semibold" onClick={signOut}>
          Sair
        </button>
      </div>
    </div>
  )
}
