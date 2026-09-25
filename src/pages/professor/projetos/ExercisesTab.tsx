import { useEffect, useRef, useState } from 'react'
import { coincide, textosEjercicio } from '@/lib/busqueda'
import { Plus, Dumbbell, Star, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { Filtro } from '../MeusProjetos'
import { useFavoritos } from '@/lib/favoritos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MiniaturaMedia, ReproductorMedia } from '@/components/MediaExercicio'
import { CombinarExercicios } from './CombinarExercicios'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { CajaMulti, HojaMulti } from '@/components/professor/SelectorMulti'
import { gruposMusculares, categoriasExercicio, tiposMidia, etiquetasDe, etiquetaDe } from '@/lib/catalogos'
import { useAuth } from '@/lib/auth'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { nombreEjercicio, type ConTraducciones } from '@/lib/nombreEjercicio'
import { mensajeError, detalleError } from '@/lib/errores'

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
  equipment?: string | null
} & ConTraducciones

export function ExercisesTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editando, setEditando] = useState<Exercise | null>(null)
  const [viendo, setViendo] = useState<Exercise | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [combinando, setCombinando] = useState(false)
  const [borrando, setBorrando] = useState<{ propios: Exercise[]; enUso: { nombre: string; rutina: string }[] } | null>(null)
  const [aviso, setAviso] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('exercises').select('*').order('name')
    if (error) setAviso({ kind: 'error', message: t('projetos:ex.loadError', { msg: detalleError(error) }) })
    setItems((data as Exercise[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const { esFavorito, alternar, error: errorFav, limpiarError } = useFavoritos('exercise')

  const q = query.trim().toLowerCase()
  const filtered = items
    .filter((e) => (filtro === 'favoritos' ? esFavorito(e.id) : true))
    .filter((e) => (filtro === 'minhas' ? e.trainer_id === profile?.id : true))
    .filter((e) => coincide(query, textosEjercicio(e)))
    .sort((x, y) => nombreEjercicio(x, i18n.language).localeCompare(nombreEjercicio(y, i18n.language)))

  const enSeleccion = seleccion.length > 0
  const todosMarcados = filtered.length > 0 && filtered.every((e) => seleccion.includes(e.id))

  function alternarSeleccion(id: string) {
    setSeleccion((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  function tocar(e: Exercise) {
    if (enSeleccion) { alternarSeleccion(e.id); return }
    if (!e.video_url && !e.thumbnail_url) {
      setAviso({ kind: 'error', message: t('projetos:ex.noMedia') })
      return
    }
    setViendo(e)
  }

  // Del catálogo del app no se borra nada: solo lo que creó el profesor.
  async function pedirBorrado() {
    const propios = items.filter((e) => seleccion.includes(e.id) && e.trainer_id === profile?.id)
    if (propios.length === 0) {
      setAviso({ kind: 'error', message: t('projetos:ex.cantDeleteApp') })
      return
    }
    const { data } = await supabase
      .from('routine_exercises')
      .select('exercise_id, routines(name)')
      .in('exercise_id', propios.map((e) => e.id))
    const enUso = ((data as any[]) ?? []).map((r) => ({
      nombre: nombreEjercicio(propios.find((e) => e.id === r.exercise_id), i18n.language),
      rutina: r.routines?.name ?? t('projetos:ex.routine'),
    }))
    setBorrando({ propios, enUso })
  }

  async function borrar() {
    if (!borrando) return
    const ids = borrando.propios.map((e) => e.id)
    if (borrando.enUso.length > 0) {
      const { error } = await supabase.from('routine_exercises').delete().in('exercise_id', ids)
      if (error) { setBorrando(null); setAviso({ kind: 'error', message: mensajeError(error) }); return }
    }
    const { error } = await supabase.from('exercises').delete().in('id', ids)
    const ignorados = seleccion.length - ids.length
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); return }
    setSeleccion([])
    setAviso({
      kind: 'success',
      message: t('projetos:ex.deleted', { n: ids.length }) + (ignorados > 0 ? t('projetos:ex.kept', { n: ignorados }) : ''),
    })
    await load()
  }

  return (
    <div className="pb-24">
      {enSeleccion && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-surface-app/95 backdrop-blur flex items-center gap-2">
          <button onClick={() => setCombinando(true)} className="px-5 py-2.5 rounded-[20px] bg-brand text-white text-rt-13 font-semibold">
            {t('projetos:c.combine')}
          </button>
          <button onClick={() => void pedirBorrado()} className="px-5 py-2.5 rounded-[20px] bg-[#D32F2F] text-white text-rt-13 font-semibold">
            {t('projetos:c.delete')}
          </button>
          <button
            onClick={() => setSeleccion(todosMarcados ? [] : filtered.map((e) => e.id))}
            className="ml-auto text-rt-13 text-grey-400"
          >
            {todosMarcados ? t('projetos:c.deselectAll') : t('projetos:c.selectAll')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        filtro === 'favoritos'
          ? <EmptyState icon={Dumbbell} title={t('projetos:ex.noFav')} body={t('projetos:ex.noFavBody')} />
          : filtro === 'minhas'
            ? <EmptyState icon={Dumbbell} title={t('projetos:ex.noOwn')} body={t('projetos:ex.createFirst')} />
            : q ? null : <EmptyState icon={Dumbbell} title={t('projetos:ex.none')} body={t('projetos:ex.createFirst')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((e) => (
            <TarjetaCatalogo
              key={e.id}
              e={e}
              lang={i18n.language}
              propio={e.trainer_id === profile?.id}
              favorito={esFavorito(e.id)}
              seleccionado={seleccion.includes(e.id)}
              onTocar={() => tocar(e)}
              onMarcar={() => alternarSeleccion(e.id)}
              onFavorito={() => void alternar(e.id)}
              onEditar={() => setEditando(e)}
            />
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button
          className="w-full h-12 rounded-[12px] bg-[#2D2D2D] border border-[#616161] text-white text-rt-14 font-semibold flex items-center justify-center gap-2"
          onClick={() => setShowNew(true)}
        >
          <Plus size={18} /> {t('projetos:ex.createNew')}
        </button>
      </FixedBottomActions>

      {viendo && <ReproductorMedia media={viendo} onCerrar={() => setViendo(null)} />}
      {showNew && <NewExerciseSheet onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
      {editando && (
        <NewExerciseSheet
          exercicio={editando}
          onClose={() => setEditando(null)}
          onCreated={() => { setEditando(null); void load() }}
        />
      )}
      {combinando && (
        <CombinarExercicios
          ejercicios={items.filter((e) => seleccion.includes(e.id))}
          onCerrar={() => setCombinando(false)}
          onListo={(mensaje) => { setCombinando(false); setSeleccion([]); setAviso({ kind: 'success', message: mensaje }) }}
          onError={(m) => setAviso({ kind: 'error', message: m })}
        />
      )}
      {borrando && (borrando.enUso.length === 0 ? (
        <ConfirmDialog
          message={t('projetos:ex.deleteTitle')}
          detail={t('projetos:ex.deleteDetail', { n: borrando.propios.length })}
          confirmLabel={t('projetos:c.delete')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      ) : (
        <ConfirmDialog
          message={t('projetos:ex.inUse')}
          detail={t('projetos:ex.inUseDetail')}
          confirmLabel={t('projetos:ex.deleteAnyway')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        >
          <ul className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {borrando.enUso.map((u, i) => (
              <li key={i} className="text-rt-12 text-white/70">• {u.nombre} — <span className="text-white">{u.rutina}</span></li>
            ))}
          </ul>
        </ConfirmDialog>
      ))}

      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
      {errorFav && <FeedbackDialog kind="error" message={errorFav} onClose={limpiarError} />}
    </div>
  )
}

function TarjetaCatalogo({ e, lang, propio, favorito, seleccionado, onTocar, onMarcar, onFavorito, onEditar }: {
  e: Exercise
  lang: string
  propio: boolean
  favorito: boolean
  seleccionado: boolean
  onTocar: () => void
  onMarcar: () => void
  onFavorito: () => void
  onEditar: () => void
}) {
  const { t } = useTranslation()
  // Toque largo entra en modo selección; el click que le sigue no debe abrir el video.
  const timer = useRef<number | null>(null)
  const largo = useRef(false)
  function bajar() {
    largo.current = false
    timer.current = window.setTimeout(() => { largo.current = true; onMarcar() }, 500)
  }
  function soltar() { if (timer.current) window.clearTimeout(timer.current) }

  const grupos = etiquetasDe(gruposMusculares, e.muscle_groups?.length ? e.muscle_groups : (e.muscle_group ? [e.muscle_group] : []), lang)
  const tags = [...grupos, ...(e.category ? [etiquetaDe(categoriasExercicio, e.category, lang)] : [])]

  return (
    <li
      onPointerDown={bajar}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      onContextMenu={(ev) => ev.preventDefault()}
      onClick={() => { if (largo.current) { largo.current = false; return } onTocar() }}
      className={
        'rounded-[16px] p-3 flex items-center gap-3 border cursor-pointer select-none transition ' +
        (seleccionado ? 'bg-brand/15 border-brand' : 'bg-[#1E1E1E] border-brand/30')
      }
    >
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); onMarcar() }}
        aria-label={seleccionado ? t('projetos:c.unmark') : t('projetos:c.mark')}
        className={
          'w-[22px] h-[22px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 text-rt-12 ' +
          (seleccionado ? 'bg-brand border-brand text-white' : 'border-grey-500')
        }
      >
        {seleccionado && '✓'}
      </button>
      <MiniaturaMedia media={e} />
      <div className="flex-1 min-w-0">
        <div className="text-white text-rt-14 font-semibold leading-snug line-clamp-2">{nombreEjercicio(e, lang)}</div>
        <div className="flex gap-1 mt-1.5 overflow-x-auto no-scrollbar">
          {tags.map((t) => (
            <span key={t} className="shrink-0 text-rt-10 px-2.5 py-1 rounded-[12px] border border-[#757575] text-[#BDBDBD]">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button type="button" onClick={(ev) => { ev.stopPropagation(); onFavorito() }} aria-label={t('projetos:c.favorite')} className="p-0.5">
          <Star size={24} className={favorito ? 'text-[#FFC107] fill-[#FFC107]' : 'text-grey-500'} />
        </button>
        {propio && (
          <button type="button" onClick={(ev) => { ev.stopPropagation(); onEditar() }} aria-label={t('projetos:ex.edit')} className="p-0.5">
            <Pencil size={22} className="text-brand" />
          </button>
        )}
      </div>
    </li>
  )
}

export function NewExerciseSheet({ exercicio, onClose, onCreated }: {
  exercicio?: Exercise
  onClose: () => void
  onCreated: (id?: string) => void
}) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
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
  const [subiendo, setSubiendo] = useState(false)
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
    const { data: creado, error: e } = await supabase.from('exercises').insert({ trainer_id: user.id, ...campos }).select('id').single()
    setSaving(false)
    if (e) { setError(mensajeError(e)); return }
    onCreated(creado.id)
  }

  async function guardar(propagar: boolean) {
    if (!exercicio) return
    setSaving(true)
    const { error: e } = await supabase.from('exercises').update(campos).eq('id', exercicio.id)
    if (e) { setSaving(false); setError(mensajeError(e)); return }

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
    <FullScreenSheet title={editando ? t('projetos:ex.editTitle') : t('projetos:ex.newTitle')} onClose={onClose}>
      <div className="flex flex-col gap-7">
        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">{t('projetos:ex.name')}</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('projetos:ex.namePh')}
          />
        </div>

        <CajaMulti
          label={t('projetos:ex.muscleGroupReq')}
          valores={grupos}
          placeholder={t('projetos:ex.chooseOneOrMore')}
          lista={gruposMusculares}
          lang={i18n.language}
          onAbrir={() => setAbriendo('grupos')}
        />

        <CajaSelector
          label={t('projetos:ex.categoryReq')}
          valor={categoria}
          placeholder={t('projetos:ex.categoryPh')}
          lista={categoriasExercicio}
          lang={i18n.language}
          onAbrir={() => setAbriendo('categoria')}
        />

        <CajaSelector
          label={t('projetos:ex.media')}
          valor={tipoMidia}
          placeholder={t('projetos:ex.noMediaPh')}
          lista={tiposMidia}
          lang={i18n.language}
          onAbrir={() => setAbriendo('midia')}
        />

        {tipoMidia === 'youtube' && (
          <div>
            <label className="block text-white text-rt-15 font-bold mb-2">{t('projetos:ex.youtubeLink')}</label>
            <input
              className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
              value={midiaUrl}
              onChange={(e) => setMidiaUrl(e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>
        )}

        {(tipoMidia === 'video' || tipoMidia === 'gif') && (
          <SubirArchivo
            etiqueta={tipoMidia === 'gif' ? t('projetos:ex.gifLabel') : t('projetos:ex.videoLabel')}
            accept={tipoMidia === 'gif' ? 'image/gif' : 'video/*'}
            url={midiaUrl}
            textoActual={tipoMidia === 'gif' ? t('projetos:ex.gifKept') : t('projetos:ex.videoKept')}
            textoElegir={tipoMidia === 'gif' ? t('projetos:ex.pickGif') : t('projetos:ex.pickVideo')}
            onSubiendo={setSubiendo}
            onSubido={setMidiaUrl}
            onError={setError}
          />
        )}

        <SubirArchivo
          etiqueta={t('projetos:ex.cover')}
          accept="image/*"
          url={capaUrl}
          textoActual={t('projetos:ex.coverCurrent')}
          textoElegir={t('projetos:ex.pickImage')}
          imagen
          onSubiendo={setSubiendo}
          onSubido={setCapaUrl}
          onError={setError}
        />

        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">{t('projetos:ex.notes')}</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('projetos:ex.notesPh')}
          />
        </div>
      </div>

      <div className="mt-10">
        <button className="btn-save" disabled={saving || subiendo || !completo} onClick={save}>
          {subiendo ? t('projetos:ex.uploading') : saving ? t('projetos:c.saving') : editando ? t('projetos:ex.saveChanges') : t('projetos:ex.create')}
        </button>
      </div>

      {abriendo === 'grupos' && (
        <HojaMulti
          titulo={t('projetos:ex.muscleGroup')}
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
          onElegir={(id) => { if (id !== tipoMidia) setMidiaUrl(''); setTipoMidia(id); setAbriendo(null) }}
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
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/70" onClick={onCerrar}>
      <div className="w-full max-w-[350px] rounded-[16px] bg-[#2D2D2D] border border-grey-700 px-6 pt-6 pb-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white text-rt-18 font-bold">{t('projetos:ex.updateTitle')}</h2>
        <p className="text-white/70 text-rt-14 leading-[1.5] mt-2">
          {t('projetos:ex.updateDetail', { count: usadoEn })}
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={onTodas} className="w-full h-11 rounded-btn-pill bg-brand text-white text-rt-14 font-semibold">
            {t('projetos:ex.updateAll')}
          </button>
          <button onClick={onSoloTemplate} className="w-full h-11 rounded-btn-pill border border-grey-700 text-white/80 text-rt-14 font-semibold">
            {t('projetos:ex.onlyTemplate')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Sube un archivo al bucket exercise-media, en la carpeta del profesor, y devuelve su URL pública. */
export function SubirArchivo({ etiqueta, accept, url, textoActual, textoElegir, imagen, onSubiendo, onSubido, onError }: {
  etiqueta: string
  accept: string
  url: string
  textoActual: string
  textoElegir: string
  imagen?: boolean
  onSubiendo: (v: boolean) => void
  onSubido: (url: string) => void
  onError: (m: string) => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)

  async function subir(f: File) {
    if (!user?.id) return
    if (f.size > 50 * 1024 * 1024) { onError(t('projetos:ex.tooBig')); return }
    setCargando(true); onSubiendo(true)
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase()
    const ruta = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('exercise-media').upload(ruta, f, { contentType: f.type, upsert: false })
    setCargando(false); onSubiendo(false)
    if (error) { onError(t('projetos:ex.uploadError', { msg: detalleError(error) })); return }
    onSubido(supabase.storage.from('exercise-media').getPublicUrl(ruta).data.publicUrl)
  }

  return (
    <div>
      {etiqueta && <label className="block text-white text-rt-15 font-bold mb-2">{etiqueta}</label>}
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void subir(f) }}
      />
      {cargando ? (
        <div className="rounded-[14px] bg-surface-input border border-surface-line p-4">
          <div className="text-white/80 text-rt-13 mb-2">{t('projetos:c.sending')}</div>
          <div className="h-1.5 rounded-full bg-grey-700 overflow-hidden">
            <div className="h-full w-1/3 bg-brand rounded-full animate-[progreso_1.2s_ease-in-out_infinite]" />
          </div>
        </div>
      ) : url ? (
        <div className="rounded-[14px] bg-surface-input border border-brand/40 p-3 flex items-center gap-3">
          {imagen ? (
            <img src={url} alt="" className="w-14 h-14 rounded-[8px] object-cover" />
          ) : (
            <MiniaturaMedia media={{ video_url: url, media_type: accept === 'image/gif' ? 'gif' : 'video' }} tamano={56} />
          )}
          <span className="flex-1 text-white text-rt-13">{textoActual}</span>
          <button type="button" onClick={() => input.current?.click()} className="text-brand text-rt-13 font-semibold">{t('projetos:c.change')}</button>
          <button type="button" onClick={() => onSubido('')} className="text-grey-500 text-rt-13">{t('projetos:c.remove')}</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="w-full h-[60px] rounded-[14px] border border-dashed border-grey-600 text-white/70 text-rt-14 flex items-center justify-center gap-2"
        >
          <Plus size={18} className="text-brand" /> {textoElegir}
        </button>
      )}
    </div>
  )
}
