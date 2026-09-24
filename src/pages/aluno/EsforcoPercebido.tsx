import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DragSlider } from '@/components/DragSlider'

/** Escala de percepción de esfuerzo, 1 a 5, como en las capturas 040 a 044. */
const NIVELES: { emoji: string; frase: string; color: string }[] = [
  { emoji: '😌', frase: 'treino:effort1', color: '#7CB342' },
  { emoji: '🙂', frase: 'treino:effort2', color: '#9CCC65' },
  { emoji: '😐', frase: 'treino:effort3', color: '#FF9800' },
  { emoji: '😓', frase: 'treino:effort4', color: '#FB8C00' },
  { emoji: '🥵', frase: 'treino:effort5', color: '#E53935' },
]

export function EsforcoPercebido({ onEnviar }: { onEnviar: (nivel: number, obs: string) => void }) {
  const { t } = useTranslation()
  const [nivel, setNivel] = useState(3)
  const [obs, setObs] = useState('')
  const actual = NIVELES[nivel - 1]

  return (
    <div className="app-shell bg-white">
      <div className="min-h-dvh text-grey-900 flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="flex flex-col items-center">
          <div className="w-[100px] h-[100px] rounded-full bg-brand flex items-center justify-center shadow-glow">
            <span className="text-white text-5xl">✓</span>
          </div>
          <h1 className="text-grey-900 text-rt-22 font-bold tracking-[1px] uppercase mt-5">{t('treino:finished')}</h1>
        </div>

        <h2 className="text-grey-900 text-rt-18 font-bold mt-8 leading-tight">
          {t('treino:effortQ')}
        </h2>

        <div className="text-center mt-6">
          <span className="text-rt-42 font-bold leading-none" style={{ color: actual.color }}>{nivel}</span>
        </div>

        <div className="relative mt-4">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value))}
            className="w-full accent-brand"
            style={{ accentColor: actual.color }}
            aria-label={t('treino:effort')}
          />
          <div className="flex justify-between mt-1 px-1">
            {NIVELES.map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNivel(i + 1)}
                className={'text-xl transition ' + (nivel === i + 1 ? 'scale-125' : 'opacity-40')}
                aria-label={t('treino:level', { n: i + 1 })}
              >
                {n.emoji}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-rt-14 leading-[1.4] mt-4" style={{ color: actual.color }}>
          {t(actual.frase)}
        </p>

        <label className="block text-grey-600 text-rt-13 mt-8 mb-2">
          Observações: (alguma coisa que queira me contar?)
        </label>
        <div className="relative">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.slice(0, 200))}
            placeholder={t('treino:typeHere')}
            rows={4}
            className="w-full rounded-[12px] border border-grey-300 p-3 text-grey-900 text-rt-14 outline-none focus:border-brand resize-none"
          />
          <span className="absolute bottom-3 right-3 text-grey-500 text-rt-11">{obs.length}/200</span>
        </div>

        <div className="mt-auto pt-8">
          <DragSlider label={t('treino:send')} onConfirm={() => onEnviar(nivel, obs.trim())} variant="light" />
        </div>
      </div>
    </div>
  )
}
