import { useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, ArrowLeft } from 'lucide-react'

export function TreinoResumoPage() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const dur = Number(sp.get('dur') ?? 0)
  const series = Number(sp.get('series') ?? 0)
  const total = Number(sp.get('total') ?? 0)
  const m = Math.floor(dur / 60), s = dur % 60

  return (
    <div className="app-shell bg-white">
      <div className="min-h-dvh text-grey-900 flex flex-col">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+16px)] flex items-center gap-3">
          <button onClick={() => nav('/aluno/treinos', { replace: true })} className="w-9 h-9 rounded-full bg-grey-200 flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-rt-20 font-bold">Treino finalizado</h1>
        </div>

        <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/15 flex items-center justify-center animate-pop-elastic">
            <span className="text-brand text-5xl">✓</span>
          </div>
          <div>
            <div className="text-rt-32 font-bold">Parabéns!</div>
            <div className="text-grey-600 text-rt-14 mt-1">Você concluiu mais um treino.</div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <Stat label="Duração" value={`${m}m ${s}s`} />
            <Stat label="Séries" value={`${series}/${total}`} />
          </div>
        </div>

        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex flex-col gap-3">
          <button className="btn-save flex items-center justify-center gap-2">
            <Share2 size={18} /> Compartilhar
          </button>
          <button
            onClick={() => nav('/aluno/treinos', { replace: true })}
            className="h-[52px] rounded-md bg-transparent border border-grey-300 text-grey-900 text-rt-14 font-semibold"
          >
            Voltar para treinos
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-surface-light p-4">
      <div className="text-grey-600 text-rt-11 uppercase font-semibold tracking-wide">{label}</div>
      <div className="text-grey-900 text-rt-22 font-bold mt-1">{value}</div>
    </div>
  )
}
