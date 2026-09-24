import { useEffect, useState } from 'react'
import { Plus, Dumbbell, Star, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { Filtro } from '../MeusProjetos'
import { useFavoritos } from '@/lib/favoritos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { CajaMulti, HojaMulti } from '@/components/professor/SelectorMulti'
import { gruposMusculares, categoriasExercicio, tiposMidia, etiquetasDe, etiquetaDe } from '@/lib/catalogos'
import { useAuth } from '@/lib/auth'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { nombreEjercicio, type ConTraducciones } from '@/lib/nombreEjercicio'

type Exercise = {
  id: string
  trainer_id: string | null
  name: string
  muscle_group: string | null
  muscle_groups: string[] | null
  category: string | null
  media_type: string | null
  video_url: string | null
  thumbnail_url: string | null
  description: string | null
} & ConTraducciones

export function ExercisesTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const [items, setItems] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editando, setEditando] = useState<Exercise | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name')
    setItems((data as Exercise[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const { esFavorito, alternar, error: errorFav, limpiarError } = useFavoritos('exercise')

  const filtered = items
    .filter((e) => (filtro === 'favoritos' ? esFavorito(e.id) : true))
    .filter((e) => (filtro === 'minhas' ? e.trainer_id === profile?.id : true))
    .filter((e) => nombreEjercicio(e, i18n.language).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="pb-24">

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum exercício" body="Adicione exercícios ao seu catálogo pessoal." />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((e) => (
            <li key={e.id} className="card-dark p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                <Dumbbell size={20} className="text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-rt-14 font-bold truncate">{nombreEjercicio(e, i18n.language)}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {etiquetasDe(gruposMusculares, e.muscle_groups?.length ? e.muscle_groups : (e.muscle_group ? [e.muscle_group] : []), i18n.language)
                    .map((g) => (
                      <span key={g} className="text-rt-10 px-2 py-0.5 rounded-tag bg-surface-raised text-white/70">{g}</span>
                    ))}
                  {e.category && (
                    <span className="text-rt-10 px-2 py-0.5 rounded-tag bg-brand/15 text-brand">
                      {etiquetaDe(categoriasExercicio, e.category, i18n.language)}
                    </span>
                  )}
                </div>
              </div>
              {e.trainer_id === null && (
                <span className="text-rt-9 font-bold px-2 py-0.5 rounded-tag bg-brand/15 text-brand border border-brand/30">
                  Global
                </span>
              )}
              {e.trainer_id === profile?.id && (
                <button
                  type="button"
                  onClick={() => setEditando(e)}
                  aria-label="Editar exercício"
                  className="w-8 h-8 rounded-md bg-surface-input flex items-center justify-center shrink-0"
                >
                  <Pencil size={16} className="text-brand" />
                </button>
              )}
              <button type="button" onClick={() => void alternar(e.id)} aria-label="Favorito" className="shrink-0 p-1">
                <Star size={20} className={esFavorito(e.id) ? 'text-brand fill-brand' : 'text-brand'} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="btn-primary-pill h-12 rounded-btn-pill" onClick={() => setShowNew(true)}>
          <Plus size={20} /> Novo Exercício
        </button>
      </FixedBottomActions>

      {showNew && <NewExerciseSheet onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
      {editando && (
        <NewExerciseSheet
          exercicio={editando}
          onClose={() => setEditando(null)}
          onCreated={() => { setEditando(null); void load() }}
        />
      )}

      {errorFav && <FeedbackDialog kind="error" message={errorFav} onClose={limpiarError} />}
    </div>
  )
}

function NewExerciseSheet({ exercicio, onClose, onCreated }: {
  exercicio?: Exercise
  onClose: () => void
  onCreated: () => void
}) {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const editando = Boolean(exercicio)
  const [name, setName] = useState(exercicio?.name ?? '')
  const [grupos, setGrupos] = useState<string[]>(
    exercicio?.muscle_groups?.length ? exercicio.muscle_groups : (exercicio?.muscle_group ? [exercicio.muscle_group] : []),
  )
  const [categoria, setCategoria] = useState(exercicio?.category ?? '')
  const [tipoMidia, setTipoMidia] = useState(exercicio?.media_type ?? '')
  const [midiaUrl, setMidiaUrl] = useState(exercicio?.video_url ?? '')
  const [capaUrl, setCapaUrl] = useState(exercicio?.thumbnail_url ?? '')
  const [description, setDescription] = useState(exercicio?.description ?? '')
  const [preguntaPropagar, setPreguntaPropagar] = useState(false)
  const [usadoEn, setUsadoEn] = useState(0)
  const [abriendo, setAbriendo] = useState<'grupos' | 'categoria' | 'midia' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nombre, grupo muscular y categoría son obligatorios según el módulo 07.
  const completo = name.trim() !== '' && grupos.length > 0 && categoria !== ''

  const campos = {
    name: name.trim(),
    muscle_groups: grupos,
    muscle_group: grupos[0] ?? null,
    category: categoria,
    media_type: tipoMidia || null,
    video_url: midiaUrl.trim() || null,
    thumbnail_url: capaUrl.trim() || null,
    description: description.trim() || null,
  }

  async function save() {
    if (!user?.id || !completo) return

    // Editar: si el ejercicio ya está en rutinas, el profesor decide si el
    // cambio alcanza también a esas rutinas o solo al modelo.
    if (exercicio) {
      const { count } = await supabase
        .from('routine_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('exercise_id', exercicio.id)
      if ((count ?? 0) > 0) { setUsadoEn(count ?? 0); setPreguntaPropagar(true); return }
      await guardar(false)
      return
    }

    setSaving(true)
    const { error: e } = await supabase.from('exercises').insert({ trainer_id: user.id, ...campos })
    setSaving(false)
    if (e) { setError(e.message); return }
    onCreated()
  }

  async function guardar(propagar: boolean) {
    if (!exercicio) return
    setSaving(true)
    const { error: e } = await supabase.from('exercises').update(campos).eq('id', exercicio.id)
    if (e) { setSaving(false); setError(e.message); return }

    if (propagar) {
      // El nombre viaja copiado a cada rutina: sin esto seguirían mostrando el viejo.
      const { error: e2 } = await supabase
        .from('routine_exercises')
        .update({ exercise_name_snapshot: campos.name })
        .eq('exercise_id', exercicio.id)
      if (e2) { setSaving(false); setError(e2.message); return }
    }
    setSaving(false)
    setPreguntaPropagar(false)
    onCreated()
  }

  return (
    <FullScreenSheet title={editando ? 'Editar Exercício' : 'Novo Exercício'} onClose={onClose}>
      <div className="flex flex-col gap-7">
        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">Nome do Exercício *</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Supino reto com barra"
          />
        </div>

        <CajaMulti
          label="Grupo Muscular *"
          valores={grupos}
          placeholder="Escolha um ou mais"
          lista={gruposMusculares}
          lang={i18n.language}
          onAbrir={() => setAbriendo('grupos')}
        />

        <CajaSelector
          label="Categoria *"
          valor={categoria}
          placeholder="Musculação"
          lista={categoriasExercicio}
          lang={i18n.language}
          onAbrir={() => setAbriendo('categoria')}
        />

        <CajaSelector
          label="Mídia"
          valor={tipoMidia}
          placeholder="Sem mídia"
          lista={tiposMidia}
          lang={i18n.language}
          onAbrir={() => setAbriendo('midia')}
        />

        {tipoMidia && (
          <div>
            <label className="block text-white text-rt-15 font-bold mb-2">
              {tipoMidia === 'youtube' ? 'Link do YouTube' : tipoMidia === 'gif' ? 'Link do GIF' : 'Link do vídeo'}
            </label>
            <input
              className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
              value={midiaUrl}
              onChange={(e) => setMidiaUrl(e.target.value)}
              placeholder="https://..."
            />
            {tipoMidia === 'video' && (
              <p className="text-white/50 text-rt-11 mt-2">
                Subir o arquivo do celular ainda não está disponível: por ora cole o link do vídeo.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">Capa (opcional)</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={capaUrl}
            onChange={(e) => setCapaUrl(e.target.value)}
            placeholder="https://... (imagem)"
          />
        </div>

        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">Observações (opcional)</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Desça a barra controlando"
          />
        </div>
      </div>

      <div className="mt-10">
        <button className="btn-save" disabled={saving || !completo} onClick={save}>
          {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Exercício'}
        </button>
      </div>

      {abriendo === 'grupos' && (
        <HojaMulti
          titulo="Grupo Muscular"
          lista={gruposMusculares}
          valores={grupos}
          lang={i18n.language}
          onCambiar={setGrupos}
          onCerrar={() => setAbriendo(null)}
        />
      )}
      {abriendo === 'categoria' && (
        <HojaRadio
          lista={categoriasExercicio}
          valor={categoria}
          lang={i18n.language}
          onElegir={(id) => { setCategoria(id); setAbriendo(null) }}
          onCerrar={() => setAbriendo(null)}
        />
      )}
      {abriendo === 'midia' && (
        <HojaRadio
          lista={tiposMidia}
          valor={tipoMidia}
          lang={i18n.language}
          onElegir={(id) => { setTipoMidia(id); setAbriendo(null) }}
          onCerrar={() => setAbriendo(null)}
        />
      )}

      {preguntaPropagar && (
        <DialogoPropagar
          usadoEn={usadoEn}
          onSoloTemplate={() => void guardar(false)}
          onTodas={() => void guardar(true)}
          onCerrar={() => setPreguntaPropagar(false)}
        />
      )}

      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
    </FullScreenSheet>
  )
}

/** "Atualizar exercício": el cambio puede quedar solo en el modelo o alcanzar las rotinas. */
function DialogoPropagar({ usadoEn, onSoloTemplate, onTodas, onCerrar }: {
  usadoEn: number
  onSoloTemplate: () => void
  onTodas: () => void
  onCerrar: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/70" onClick={onCerrar}>
      <div className="w-full max-w-[350px] rounded-[16px] bg-[#2D2D2D] border border-grey-700 px-6 pt-6 pb-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white text-rt-18 font-bold">Atualizar exercício</h2>
        <p className="text-white/70 text-rt-14 leading-[1.5] mt-2">
          Este exercício está em {usadoEn} {usadoEn === 1 ? 'rotina' : 'rotinas'}. Onde aplicar a alteração?
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={onTodas} className="w-full h-11 rounded-btn-pill bg-brand text-white text-rt-14 font-semibold">
            Atualizar todas
          </button>
          <button onClick={onSoloTemplate} className="w-full h-11 rounded-btn-pill border border-grey-700 text-white/80 text-rt-14 font-semibold">
            Apenas template
          </button>
        </div>
      </div>
    </div>
  )
}
