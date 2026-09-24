import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, Dumbbell, Clock, Weight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EsforcoPercebido } from './EsforcoPercebido'
import { FeedbackDialog } from '@/components/FeedbackDialog'

type SerieHecha = { done?: boolean; load?: string; reps?: number }
type ExHecho = { name: string; muscle_group?: string | null; series?: SerieHecha[] }

export function TreinoResumoPage() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { profile } = useAuth()

  const dur = Number(sp.get('dur') ?? 0)
  const sid = sp.get('sid')

  const [ejercicios, setEjercicios] = useState<ExHecho[]>([])
  const [esforcoEnviado, setEsforcoEnviado] = useState(!sid)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sid) return
    void (async () => {
      const { data } = await supabase.from('workout_sessions').select('data,effort_1_5').eq('id', sid).maybeSingle()
      const fila = data as { data?: { exercises?: ExHecho[] }; effort_1_5: number | null } | null
      setEjercicios(fila?.data?.exercises ?? [])
      if (fila?.effort_1_5 != null) setEsforcoEnviado(true)
    })()
  }, [sid])

  async function enviarEsforco(nivel: number, obs: string) {
    if (!sid) { setEsforcoEnviado(true); return }
    const { data: actual } = await supabase.from('workout_sessions').select('data').eq('id', sid).maybeSingle()
    const datos = (actual as { data?: Record<string, unknown> } | null)?.data ?? {}
    const { error: e } = await supabase.from('workout_sessions')
      .update({ effort_1_5: nivel, data: { ...datos, effort_note: obs || null } })
      .eq('id', sid)
    if (e) { setError(e.message); return }
    setEsforcoEnviado(true)
  }

  // Peso total movido: carga × repetições de cada série concluída.
  const pesoTotal = ejercicios.reduce((total, ex) => (
    total + (ex.series ?? []).reduce((n, sr) => (
      n + (sr.done ? (Number(sr.load) || 0) * (Number(sr.reps) || 0) : 0)
    ), 0)
  ), 0)

  const gruposMusculares = Array.from(
    new Set(ejercicios.map((e) => e.muscle_group).filter(Boolean) as string[]),
  )

  const h = Math.floor(dur / 3600)
  const m = Math.floor((dur % 3600) / 60)
  const s = dur % 60
  const tiempo = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  async function compartir() {
    const texto = `Finalizei mais um treino! ${ejercicios.length} exercícios, ${pesoTotal} kg movidos em ${tiempo}. — Rutyn`
    try {
      if (navigator.share) await navigator.share({ text: texto })
      else await navigator.clipboard.writeText(texto)
    } catch {
      // Cancelar el compartir no es un error que valga la pena mostrar.
    }
  }

  if (!esforcoEnviado) return <EsforcoPercebido onEnviar={(n, o) => void enviarEsforco(n, o)} />

  return (
    <div className="app-shell bg-white">
      <div className="min-h-dvh text-grey-900 flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+32px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex flex-col items-center">
          <div className="w-[100px] h-[100px] rounded-full bg-brand flex items-center justify-center animate-pop-elastic">
            <span className="text-white text-5xl">✓</span>
          </div>
          <h1 className="text-grey-900 text-rt-22 font-bold tracking-[1px] uppercase mt-5">Treino finalizado</h1>
        </div>

        {/* Tarjeta para compartir */}
        <div className="rounded-[20px] bg-grey-100 p-3 mt-8">
          <div className="rounded-[14px] bg-white p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-[10px] bg-grey-200 overflow-hidden shrink-0 flex items-center justify-center">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-grey-600 text-rt-18 font-bold">{(profile?.full_name?.[0] ?? '?').toUpperCase()}</span>}
            </div>
            <div className="flex-1 text-grey-900 text-rt-15">
              <em>Finalizei</em> mais um treino!
            </div>
            <span className="text-2xl">🎉</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-[14px] bg-white p-4">
              <div className="flex items-center gap-2">
                <Dumbbell size={20} className="text-grey-900" />
                <span className="text-grey-900 text-rt-29 font-bold leading-none">{ejercicios.length}</span>
              </div>
              <div className="text-grey-700 text-rt-13 mt-3">Exercícios de hoje</div>
              {gruposMusculares.length > 0 && (
                <div className="text-grey-500 text-rt-12 mt-1">{gruposMusculares.join(', ')}</div>
              )}
            </div>

            <div className="rounded-[14px] bg-white p-4">
              <div className="flex items-center gap-2">
                <Weight size={18} className="text-grey-900" />
                <span className="text-grey-900 text-rt-22 font-bold italic">{pesoTotal} kg</span>
              </div>
              <div className="text-grey-700 text-rt-12 mt-1">Peso total</div>
              <div className="flex items-center gap-2 mt-3">
                <Clock size={18} className="text-grey-900" />
                <span className="text-grey-900 text-rt-22 font-bold italic">{tiempo}</span>
              </div>
              <div className="text-grey-700 text-rt-12 mt-1">Tempo total</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="w-6 h-6 rounded-full bg-grey-900 flex items-center justify-center text-brand text-[10px] font-bold">R</span>
            <span className="text-grey-500 text-rt-13">Rutyn App</span>
          </div>
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-3">
          <button
            onClick={() => void compartir()}
            className="h-[52px] rounded-[12px] border border-grey-300 text-grey-900 text-rt-15 font-semibold flex items-center justify-center gap-2"
          >
            <Share2 size={18} /> Compartilhar
          </button>
          <button
            onClick={() => nav('/aluno/treinos', { replace: true })}
            className="h-[52px] rounded-[12px] bg-brand text-white text-rt-15 font-bold flex items-center justify-center gap-2"
          >
            Voltar para treinos
          </button>
        </div>

        {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
      </div>
    </div>
  )
}
