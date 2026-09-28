import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  categoriasAlimento, unidadesAlimento, categoriasExercicio, gruposMusculares, tiposMidia, type Catalogo,
} from '@/lib/catalogos'
import { adminApi } from './api'
import { Badge, Buscador, Error_, Formulario, Panel, Tabla, useAccion, type Campo } from './ui'

const op = (l: Catalogo[]) => l.map((c) => ({ v: c.id, l: c.es }))
const etq = (l: Catalogo[], id: string | null) => l.find((c) => c.id === id)?.es ?? id ?? '—'

type Config = {
  tabla: string
  titulo: string
  nuevo: Record<string, any>
  campos: Campo[]
  json?: string[]
  columnas: { label: string; render: (r: any) => any }[]
  texto: (r: any) => string
  // columnas viejas que la app todavía lee
  espejo?: (r: any) => Record<string, any>
}

export const CONFIGS: Record<string, Config> = {
  foods: {
    tabla: 'foods',
    titulo: 'Alimentos',
    nuevo: { portion_qty: 100, unit: 'g', category: 'none', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    campos: [
      { key: 'name_pt', label: 'Nombre (pt)' }, { key: 'name_es', label: 'Nombre (es)' }, { key: 'name_en', label: 'Nombre (en)' },
      { key: 'category', label: 'Categoría', tipo: 'select', opciones: op(categoriasAlimento) },
      { key: 'portion_qty', label: 'Porción (cantidad)', tipo: 'number' },
      { key: 'unit', label: 'Unidad', tipo: 'select', opciones: op(unidadesAlimento) },
      { key: 'calories', label: 'Calorías (kcal)', tipo: 'number' },
      { key: 'protein_g', label: 'Proteína (g)', tipo: 'number' },
      { key: 'carbs_g', label: 'Carbohidratos (g)', tipo: 'number' },
      { key: 'fats_g', label: 'Grasas (g)', tipo: 'number' },
    ],
    columnas: [
      { label: 'Nombre', render: (r) => r.name_es ?? r.name_pt ?? r.name },
      { label: 'Categoría', render: (r) => etq(categoriasAlimento, r.category) },
      { label: 'Porción', render: (r) => `${r.portion_qty ?? ''} ${r.unit ?? ''}` },
      { label: 'kcal', render: (r) => r.calories },
      { label: 'P / C / G', render: (r) => `${r.protein_g} / ${r.carbs_g} / ${r.fats_g}` },
    ],
    texto: (r) => `${r.name_pt} ${r.name_es} ${r.name_en}`,
    espejo: (r) => ({ name: r.name_pt || r.name_es || r.name, portion: `${r.portion_qty ?? ''} ${r.unit ?? ''}`.trim() }),
  },
  exercises: {
    tabla: 'exercises',
    titulo: 'Ejercicios',
    nuevo: { category: 'musculacao', media_type: 'video', muscle_groups: [] },
    campos: [
      { key: 'name_pt', label: 'Nombre (pt)' }, { key: 'name_es', label: 'Nombre (es)' }, { key: 'name_en', label: 'Nombre (en)' },
      { key: 'category', label: 'Categoría', tipo: 'select', opciones: op(categoriasExercicio) },
      { key: 'muscle_groups', label: `Grupos musculares (${gruposMusculares.map((g) => g.id).join(', ')})`, tipo: 'lista' },
      { key: 'equipment', label: 'Equipamiento' },
      { key: 'media_type', label: 'Tipo de medio', tipo: 'select', opciones: op(tiposMidia) },
      { key: 'video_url', label: 'URL del video / imagen' },
      { key: 'thumbnail_url', label: 'URL de la miniatura' },
      { key: 'description_pt', label: 'Descripción (pt)', tipo: 'textarea' },
      { key: 'description_es', label: 'Descripción (es)', tipo: 'textarea' },
      { key: 'description_en', label: 'Descripción (en)', tipo: 'textarea' },
    ],
    columnas: [
      { label: 'Nombre', render: (r) => r.name_es ?? r.name_pt ?? r.name },
      { label: 'Categoría', render: (r) => etq(categoriasExercicio, r.category) },
      { label: 'Músculos', render: (r) => (r.muscle_groups ?? []).map((g: string) => etq(gruposMusculares, g)).join(', ') || '—' },
      { label: 'Video', render: (r) => (r.video_url ? <Badge tono="ok">sí</Badge> : <Badge tono="warn">falta</Badge>) },
    ],
    texto: (r) => `${r.name_pt} ${r.name_es} ${r.name_en}`,
    espejo: (r) => ({ name: r.name_pt || r.name_es || r.name, description: r.description_pt ?? r.description, muscle_group: r.muscle_groups?.[0] ?? null }),
  },
  announcements: {
    tabla: 'announcements',
    titulo: 'Anuncios',
    nuevo: { audience: 'all', priority: 0, is_active: false },
    campos: [
      { key: 'is_active', label: 'Activo (se muestra en la app)', tipo: 'bool' },
      { key: 'audience', label: 'Para quién', tipo: 'select', opciones: [{ v: 'all', l: 'Todos' }, { v: 'teachers', l: 'Profesores' }, { v: 'students', l: 'Alumnos' }] },
      { key: 'priority', label: 'Prioridad (mayor = primero)', tipo: 'number' },
      { key: 'title_pt', label: 'Título (pt)' }, { key: 'title_es', label: 'Título (es)' }, { key: 'title_en', label: 'Título (en)' },
      { key: 'body_pt', label: 'Texto (pt)', tipo: 'textarea' }, { key: 'body_es', label: 'Texto (es)', tipo: 'textarea' }, { key: 'body_en', label: 'Texto (en)', tipo: 'textarea' },
      { key: 'media_url', label: 'Imagen / video (URL)' },
      { key: 'cta_url', label: 'Link del botón' },
      { key: 'cta_label_pt', label: 'Texto del botón (pt)' }, { key: 'cta_label_es', label: 'Texto del botón (es)' }, { key: 'cta_label_en', label: 'Texto del botón (en)' },
    ],
    columnas: [
      { label: 'Título', render: (r) => r.title_es ?? r.title_pt },
      { label: 'Para', render: (r) => ({ all: 'Todos', teachers: 'Profesores', students: 'Alumnos' } as any)[r.audience] ?? r.audience },
      { label: 'Estado', render: (r) => <Badge tono={r.is_active ? 'ok' : 'neutral'}>{r.is_active ? 'activo' : 'inactivo'}</Badge> },
      { label: 'Prioridad', render: (r) => r.priority },
    ],
    texto: (r) => `${r.title_pt} ${r.title_es} ${r.title_en}`,
  },
  anamnesis_templates: {
    tabla: 'anamnesis_templates',
    titulo: 'Plantillas de anamnesis',
    nuevo: { kind: 'global', priority: 0, is_active: true, questions: [] },
    campos: [
      { key: 'is_active', label: 'Activa', tipo: 'bool' },
      { key: 'name', label: 'Nombre (pt)' }, { key: 'name_es', label: 'Nombre (es)' }, { key: 'name_en', label: 'Nombre (en)' },
      { key: 'kind', label: 'Tipo', tipo: 'select', opciones: [{ v: 'global', l: 'General' }, { v: 'parq', l: 'PAR-Q' }, { v: 'nutrition', l: 'Nutrición' }] },
      { key: 'priority', label: 'Prioridad', tipo: 'number' },
      { key: 'questions', label: 'Preguntas (JSON)', tipo: 'textarea' },
    ],
    json: ['questions'],
    columnas: [
      { label: 'Nombre', render: (r) => r.name_es ?? r.name },
      { label: 'Tipo', render: (r) => r.kind },
      { label: 'Preguntas', render: (r) => (Array.isArray(r.questions) ? r.questions.length : '—') },
      { label: 'Estado', render: (r) => <Badge tono={r.is_active ? 'ok' : 'neutral'}>{r.is_active ? 'activa' : 'inactiva'}</Badge> },
    ],
    texto: (r) => `${r.name} ${r.name_es} ${r.name_en}`,
  },
}

export function SeccionCatalogo({ config }: { config: Config }) {
  const [filas, setFilas] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState<any | null>(null)
  const { error, correr } = useAccion()

  const cargar = () => correr(async () => setFilas((await adminApi<{ rows: any[] }>('row.list', { table: config.tabla })).rows))
  useEffect(() => { setFilas(null); setQ(''); void cargar() }, [config.tabla])

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (filas ?? []).filter((r) => !t || config.texto(r).toLowerCase().includes(t))
  }, [filas, q, config])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Buscador value={q} onChange={setQ} />
        <span className="text-grey-500 text-rt-12">{visibles.length} de {filas?.length ?? 0}</span>
        <button onClick={() => setEditando({ ...config.nuevo })} className="btn-create !w-auto ml-auto px-4 flex items-center gap-2">
          <Plus size={16} /> Nuevo
        </button>
      </div>
      <Error_ msg={error} />
      {!filas ? <div className="text-grey-400">Cargando…</div> : <Tabla rows={visibles} onRow={setEditando} cols={config.columnas} />}
      {editando && (
        <EditarFila
          config={config}
          fila={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await cargar() }}
        />
      )}
    </div>
  )
}

function EditarFila({ config, fila, onCerrar, onGuardado }: { config: Config; fila: any; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const inicial = { ...fila }
  for (const k of config.json ?? []) inicial[k] = JSON.stringify(fila[k] ?? [], null, 2)
  const [v, setV] = useState<Record<string, any>>(inicial)
  const { ocupado, error, correr, setError } = useAccion()

  const guardar = () =>
    correr(async () => {
      const row: Record<string, any> = { ...v }
      for (const k of config.json ?? []) {
        try { row[k] = JSON.parse(v[k] || '[]') } catch { setError(`"${k}" no es JSON válido`); throw new Error(`"${k}" no es JSON válido`) }
      }
      Object.assign(row, config.espejo?.(row) ?? {})
      await adminApi('row.save', { table: config.tabla, row })
      await onGuardado()
    })

  const borrar = () =>
    correr(async () => {
      if (!confirm('¿Borrar para siempre? Si algún profesor lo usa en una rutina o dieta, puede fallar.')) return
      await adminApi('row.delete', { table: config.tabla, id: fila.id })
      await onGuardado()
    })

  return (
    <Panel
      titulo={fila.id ? `Editar · ${config.titulo}` : `Nuevo · ${config.titulo}`}
      onCerrar={onCerrar}
      pie={
        <div className="flex gap-2">
          {fila.id && <button disabled={ocupado} onClick={borrar} className="px-4 h-12 rounded-lg border border-danger text-danger text-rt-13 font-semibold">Borrar</button>}
          <button className="btn-save flex-1" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
        </div>
      }
    >
      <Error_ msg={error} />
      <Formulario campos={config.campos} valores={v} onChange={(k, x) => setV((s) => ({ ...s, [k]: x }))} />
    </Panel>
  )
}
