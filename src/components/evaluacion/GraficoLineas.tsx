import { useId } from 'react'

export type Serie = { id: string; color: string; puntos: { x: number; y: number }[] }

/** Gráfico de líneas en SVG: una línea por serie sobre los mismos cortes del eje X. Las lagunas se unen directo. */
export function GraficoLineas({ series, etiquetasX, alto = 220, decimales = 1 }: { series: Serie[]; etiquetasX: string[]; alto?: number; decimales?: number }) {
  const uid = useId().replace(/:/g, '')
  const W = 320, H = alto, izq = 34, der = 12, arriba = 18, abajo = 24
  const todos = series.flatMap((s) => s.puntos.map((p) => p.y))
  if (todos.length === 0 || etiquetasX.length === 0) return null
  let min = Math.min(...todos), max = Math.max(...todos)
  if (min === max) { min -= 1; max += 1 }
  // Marcas del eje Y en pasos "redondos".
  const bruto = (max - min) / 4
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto
  const y0 = Math.floor(min / paso) * paso, y1 = Math.ceil(max / paso) * paso
  const marcas: number[] = []
  for (let v = y0; v <= y1 + paso / 2; v += paso) marcas.push(Math.round(v * 1000) / 1000)
  const n = etiquetasX.length
  const px = (x: number) => izq + (n === 1 ? (W - izq - der) / 2 : (x / (n - 1)) * (W - izq - der))
  const py = (y: number) => arriba + (1 - (y - y0) / (y1 - y0 || 1)) * (H - arriba - abajo)
  // Como mucho ~5 etiquetas en X para que no se pisen.
  const cadaX = Math.max(1, Math.ceil(n / 5))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-[8px] bg-[#1E1E1E]" role="img">
      <defs>
        {series.map((s) => (
          <linearGradient key={s.id} id={`g-${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {marcas.map((m) => (
        <g key={m}>
          <line x1={izq} x2={W - der} y1={py(m)} y2={py(m)} stroke="#2D2D2D" strokeWidth="1" />
          <text x={izq - 6} y={py(m) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)">{Number.isInteger(paso) ? m : m.toFixed(1)}</text>
        </g>
      ))}
      {etiquetasX.map((e, i) => (i % cadaX === 0 || i === n - 1) && (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">{e}</text>
      ))}
      {series.map((s) => {
        const pts = [...s.puntos].sort((a, b) => a.x - b.x)
        if (pts.length === 0) return null
        const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.y)}`).join(' ')
        const area = `${linea} L${px(pts[pts.length - 1].x)},${py(y0)} L${px(pts[0].x)},${py(y0)} Z`
        const ult = pts[pts.length - 1]
        return (
          <g key={s.id}>
            <path d={area} fill={`url(#g-${uid}-${s.id})`} />
            <path d={linea} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p) => <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r="5" fill={s.color} stroke="#1E1E1E" strokeWidth="2" />)}
            <text x={px(ult.x)} y={py(ult.y) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill={s.color}>{ult.y.toFixed(decimales)}</text>
          </g>
        )
      })}
    </svg>
  )
}
