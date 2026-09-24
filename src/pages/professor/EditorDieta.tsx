import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { objetivosDieta, etiquetaDe } from '@/lib/catalogos'
import { FranjaMacros } from './projetos/RecipesTab'
import { EditorDietaInline } from './projetos/dietas/EditorDietaInline'
import { cargarDieta, macrosDieta, type Dieta } from './projetos/dietas/datos'

/** Acceso directo por URL al mismo editor que vive dentro del card en Meus Projetos. */
export function EditorDietaPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const [dieta, setDieta] = useState<Dieta | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function recargar() {
    if (!id) return
    try { setDieta(await cargarDieta(id)) } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { void recargar() }, [id])

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} aria-label={t('general:ui.back')} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-rt-20 font-bold truncate">{dieta?.name ?? '...'}</h1>
          {dieta?.goal && <div className="text-white/60 text-rt-11">{etiquetaDe(objetivosDieta, dieta.goal, i18n.language)}</div>}
        </div>
      </div>
      {error && <div className="text-danger text-rt-13">{error}</div>}
      {dieta && (
        <div className="rounded-[16px] overflow-hidden border border-brand/30 bg-[#1E1E1E]">
          <FranjaMacros m={macrosDieta(dieta)} />
          <EditorDietaInline dieta={dieta} onRecargar={recargar} />
        </div>
      )}
    </div>
  )
}
