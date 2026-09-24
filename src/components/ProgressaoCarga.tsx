import { useEffect, useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BannerMedia, type Media } from '@/components/MediaExercicio'

type Punto = { fecha: string; carga: number }

type SerieHecha = { done?: boolean; load?: string; reps?: number }
type ExHecho = { name: string; series?: SerieHecha[] }
type Sesion = { started_at: string; data?: { exercises?: ExHecho[] } }

/**
 * Progresión de carga de un ejercicio (print 029 del módulo 13): la carga
 * máxima levantada en cada sesión, con su histórico.
 *
 * Sirve igual para el alumno (ve su progreso) y para el profesor (ve lo que
 * el alumno realmente hizo, que es lo que le permite ajustar la carga).
 */
export function ProgressaoCarga({ studentId, nombreExercicio, media, chips, onCerrar }: {
  studentId: string
  nombreExercicio: string
  media?: Media
  chips?: string[]
  onCerrar: () => void
}) {
  const [puntos, setPuntos] = useState<Punto[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('started_at,data')
        .eq('student_id', studentId)
        .order('started_at')
        .limit(200)

      const salida: Punto[] = []
      for (const s of (data as Sesion[]) ?? []) {
        const ex = (s.data?.exercises ?? []).find((e) => e.name === nombreExercicio)
        if (!ex) continue
        // La carga del día es la máxima de las series que marcó como hechas.
        const cargas = (ex.series ?? [])
          .filter((sr) => sr.done)
          .map((sr) => Number(sr.load) || 0)
          .filter((n) => n > 0)
        if (cargas.length === 0) continue
        salida.push({ fecha: s.started_at, carga: Math.max(...cargas) })
      }
      setPuntos(salida)
      setCargando(false)
    })()
  }, [studentId, nombreExercicio])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={onCerrar}>
      <div
        className="w-full max-w-app rounded-t-[20px] bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[88dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-1 rounded-full bg-grey-300 mx-auto mb-4" />

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-grey-900 text-rt-20 font-bold flex-1">{nombreExercicio}</h2>
          <button onClick={onCerrar} className="w-9 h-9 rounded-full bg-grey-200 flex items-center justify-center shrink-0" aria-label="Fechar">
            <X size={18} className="text-grey-600" />
          </button>
        </div>

        {media && (media.video_url || media.media_type) && (
          <div className="mt-4">
            <BannerMedia media={media} alto={190} />
          </div>
        )}

        {chips && chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {chips.map((c) => (
              <span key={c} className="text-rt-12 px-3 py-1.5 rounded-btn-pill border border-grey-300 text-grey-700">{c}</span>
            ))}
          </div>
        )}

        {cargando ? (
          <div className="text-grey-500 text-rt-13 py-10 text-center">…</div>
        ) : puntos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <TrendingUp size={36} className="text-grey-300" />
            <p className="text-grey-600 text-rt-14">Ainda não há treinos registrados com carga.</p>
            <p className="text-grey-500 text-rt-12">O gráfico aparece depois do primeiro treino concluído.</p>
          </div>
        ) : (
          <>
            <Grafico puntos={puntos} />

            <h3 className="text-grey-900 text-rt-16 font-bold mt-6 mb-2">Histórico</h3>
            <ul className="flex flex-col">
              {[...puntos].reverse().map((p, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 border-b border-grey-200 last:border-0">
                  <span className="text-grey-600 text-rt-14">
                    {new Date(p.fecha).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-grey-900 text-rt-15 font-bold">{p.carga} kg</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

/** Línea simple en SVG: no vale traer una librería de gráficos para esto. */
function Grafico({ puntos }: { puntos: Punto[] }) {
  const ancho = 320
  const alto = 170
  const margen = { izq: 34, der: 8, arriba: 10, abajo: 24 }

  const valores = puntos.map((p) => p.carga)
  const min = Math.max(0, Math.min(...valores) - 5)
  const max = Math.max(...valores) + 5
  const rango = max - min || 1

  const x = (i: number) => margen.izq + (i / Math.max(1, puntos.length - 1)) * (ancho - margen.izq - margen.der)
  const y = (v: number) => margen.arriba + (1 - (v - min) / rango) * (alto - margen.arriba - margen.abajo)

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.carga)}`).join(' ')
  const area = `${linea} L ${x(puntos.length - 1)} ${alto - margen.abajo} L ${x(0)} ${alto - margen.abajo} Z`

  const marcas = [min, min + rango / 2, max].map((v) => Math.round(v))

  return (
    <div className="mt-5 -mx-1">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label="Progressão de carga">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={margen.izq} x2={ancho - margen.der} y1={y(m)} y2={y(m)} stroke="#E0E0E0" strokeDasharray="4 4" />
            <text x={4} y={y(m) + 4} fontSize="9" fill="#9E9E9E">{m}</text>
          </g>
        ))}
        <path d={area} fill="#7CB342" opacity="0.12" />
        <path d={linea} fill="none" stroke="#7CB342" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.carga)} r="3.5" fill="#7CB342" />
        ))}
        <text x={margen.izq} y={alto - 6} fontSize="9" fill="#9E9E9E">
          {new Date(puntos[0].fecha).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </text>
        <text x={ancho - margen.der} y={alto - 6} fontSize="9" fill="#9E9E9E" textAnchor="end">
          {new Date(puntos[puntos.length - 1].fecha).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </text>
      </svg>
    </div>
  )
}
