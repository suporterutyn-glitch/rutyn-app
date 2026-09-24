import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Star, ChevronLeft, GripVertical, UtensilsCrossed, AlertCircle, X, Search, Check, PlusCircle, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Filtro } from '../MeusProjetos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { objetivosDieta, etiquetaDe } from '@/lib/catalogos'
import { useDeslizar } from '@/lib/deslizar'
import { useArrastreLista, moverEnLista } from '@/lib/reordenar'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { FranjaMacros } from './RecipesTab'
import { sinAcentos } from './FoodsTab'
import { EditorDietaInline } from './dietas/EditorDietaInline'
import { SelecionarRefeicoes, type RefeicaoElegida } from './dietas/SelecionarRefeicoes'
import { SELECT_DIETA, macrosDieta, duplicarDieta, copiaParaAlumno, type Dieta } from './dietas/datos'

type Aviso = { kind: 'error' | 'success'; message: string }

export function DietsTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [items, setItems] = useState<Dieta[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [expandidas, setExpandidas] = useState<string[]>([])
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [formulario, setFormulario] = useState<Dieta | 'nueva' | null>(null)
  const [clonando, setClonando] = useState<Dieta | null>(null)
  const [borrando, setBorrando] = useState<Dieta[] | null>(null)
  const [destacada, setDestacada] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const refs = useRef(new Map<string, HTMLLIElement>())

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data, error } = await supabase.from('diets').select(SELECT_DIETA).eq('owner_id', profile.id)
      .order('position', { ascending: true, nullsFirst: false }).order('created_at')
    setErrorCarga(error ? error.message : null)
    setItems((data as Dieta[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id])

  async function recargarUna(id: string) {
    const { data } = await supabase.from('diets').select(SELECT_DIETA).eq('id', id).single()
    if (data) setItems((p) => p.map((d) => (d.id === id ? (data as Dieta) : d)))
  }

  const palabras = sinAcentos(query.trim()).split(/\s+/).filter(Boolean)
  const filtered = items
    .filter((d) => (filtro === 'favoritos' ? d.is_favorite : true))
    .filter((d) => palabras.every((p) => sinAcentos(d.name).includes(p)))
  const todas = filtered.length > 0 && filtered.every((d) => seleccion.includes(d.id))

  // El reordenamiento usa ids, no índices: con búsqueda activa no mueve la dieta equivocada.
  const arrastre = useArrastreLista<string>((desde, hasta) => void reordenar(desde, hasta))
  async function reordenar(desde: string, hasta: string) {
    const nuevo = moverEnLista(items, items.findIndex((d) => d.id === desde), items.findIndex((d) => d.id === hasta))
    setItems(nuevo)
    for (let i = 0; i < nuevo.length; i++) {
      if (nuevo[i].position !== i) await supabase.from('diets').update({ position: i }).eq('id', nuevo[i].id)
    }
  }

  async function favorito(d: Dieta) {
    setItems((p) => p.map((x) => (x.id === d.id ? { ...x, is_favorite: !x.is_favorite } : x)))
    const { error } = await supabase.from('diets').update({ is_favorite: !d.is_favorite }).eq('id', d.id)
    if (error) { setAviso({ kind: 'error', message: 'Erro ao favoritar' }); void load() }
  }

  async function duplicar(d: Dieta) {
    if (!profile?.id) return
    try {
      await duplicarDieta(d, profile.id, items.length)
      setAviso({ kind: 'success', message: 'Dieta duplicada' })
      await load()
    } catch {
      setAviso({ kind: 'error', message: 'Erro ao duplicar dieta' })
    }
  }

  async function borrar() {
    if (!borrando) return
    const ids = borrando.map((d) => d.id)
    const { error } = await supabase.from('diets').delete().in('id', ids)
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: 'Erro: ' + error.message }); return }
    setSeleccion((p) => p.filter((x) => !ids.includes(x)))
    await load()
  }

  async function creada(id: string) {
    setFormulario(null)
    await load()
    setExpandidas((p) => [...p, id])
    setDestacada(id)
    window.setTimeout(() => refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    window.setTimeout(() => setDestacada(null), 1200)
  }

  return (
    <div className="pb-24">
      {seleccion.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-surface-app/95 backdrop-blur flex items-center gap-2">
          <button onClick={() => setBorrando(items.filter((d) => seleccion.includes(d.id)))} className="px-5 py-2.5 rounded-[20px] bg-[#D32F2F] text-white text-rt-13 font-semibold">Excluir</button>
          <button onClick={() => setSeleccion(todas ? [] : filtered.map((d) => d.id))} className="ml-auto text-rt-13 text-grey-400">{todas ? 'Desselecionar tudo' : 'Selecionar tudo'}</button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
      ) : errorCarga ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <AlertCircle size={48} className="text-danger" />
          <span className="text-grey-400 text-rt-16">Erro ao carregar dietas</span>
          <button onClick={() => void load()} className="mt-2 px-5 h-10 rounded-btn-pill bg-brand text-white text-rt-13 font-semibold">Tentar novamente</button>
        </div>
      ) : filtered.length === 0 ? (
        palabras.length > 0
          ? <EmptyState icon={UtensilsCrossed} title="Nenhuma dieta encontrada" body="Tente buscar por outro termo" />
          : filtro === 'favoritos'
            ? <EmptyState icon={UtensilsCrossed} title="Nenhuma dieta favorita" body="Favorite dietas para vê-las aqui" />
            : <EmptyState icon={UtensilsCrossed} title="Nenhuma dieta cadastrada" body="Crie sua primeira dieta" />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((d) => (
            <li
              key={d.id}
              ref={(el) => { if (el) refs.current.set(d.id, el); else refs.current.delete(d.id); arrastre.registrar(d.id, el) }}
              onPointerMove={arrastre.alMover}
              onPointerUp={arrastre.alSoltar}
              className={'rounded-[16px] overflow-hidden border transition ' +
                (seleccion.includes(d.id) ? 'border-2 border-brand bg-brand/10 ' : 'border-brand/30 bg-[#1E1E1E] ') +
                (arrastre.arrastrando === d.id ? 'scale-[1.02] shadow-2xl opacity-90 ' : '') +
                (arrastre.encima === d.id && arrastre.arrastrando !== d.id ? 'border-dashed border-brand ' : '') +
                (destacada === d.id ? 'shadow-[0_0_24px_rgba(124,179,66,0.4)] scale-[1.02] ' : '')}
            >
              <FranjaMacros m={macrosDieta(d)} />
              <CabeceraDieta
                d={d}
                lang={lang}
                expandida={expandidas.includes(d.id)}
                seleccionada={seleccion.includes(d.id)}
                onGrip={arrastre.alBajar(d.id)}
                onExpandir={() => setExpandidas((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                onMarcar={() => setSeleccion((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                onFavorito={() => void favorito(d)}
                onClonar={() => setClonando(d)}
                onDuplicar={() => void duplicar(d)}
                onEditar={() => setFormulario(d)}
                onExcluir={() => setBorrando([d])}
              />
              {expandidas.includes(d.id) && <EditorDietaInline dieta={d} onRecargar={() => recargarUna(d.id)} />}
            </li>
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="w-full h-12 rounded-[12px] bg-[#2D2D2D] border border-[#616161] text-white text-rt-14 font-semibold flex items-center justify-center gap-2" onClick={() => setFormulario('nueva')}>
          <Plus size={18} /> Criar nova Dieta
        </button>
      </FixedBottomActions>

      {formulario && (
        <DietSheet
          dieta={formulario === 'nueva' ? undefined : formulario}
          posicion={items.length}
          onClose={() => setFormulario(null)}
          onCreada={(id) => void creada(id)}
          onEditada={() => { setFormulario(null); void load() }}
        />
      )}
      {clonando && <ClonarDieta dieta={clonando} onCerrar={() => setClonando(null)} onResultado={(a) => { setClonando(null); setAviso(a) }} />}
      {borrando && (
        <ConfirmDialog
          message={borrando.length === 1 ? 'Excluir dieta' : 'Excluir dietas'}
          detail={borrando.length === 1 ? `Tem certeza que deseja excluir "${borrando[0].name}"?` : `Tem certeza que deseja excluir ${borrando.length} dieta(s)?`}
          confirmLabel="Excluir"
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      )}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
    </div>
  )
}

function CabeceraDieta({ d, lang, expandida, seleccionada, onGrip, onExpandir, onMarcar, onFavorito, onClonar, onDuplicar, onEditar, onExcluir }: {
  d: Dieta
  lang: string
  expandida: boolean
  seleccionada: boolean
  onGrip: (e: React.PointerEvent) => void
  onExpandir: () => void
  onMarcar: () => void
  onFavorito: () => void
  onClonar: () => void
  onDuplicar: () => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const { dx, abierto, handlers, cerrar, fueArrastre } = useDeslizar(280)
  return (
    <div className="relative overflow-hidden border-t border-[#333333]">
      <div className="absolute inset-y-0 right-0 flex w-[280px]">
        {([['CLONAR', '#424242', onClonar], ['DUPLICAR', '#616161', onDuplicar], ['EDITAR', '#757575', onEditar], ['EXCLUIR', '#B71C1C', onExcluir]] as const).map(([t, c, fn]) => (
          <button key={t} onClick={() => { cerrar(); fn() }} className="flex-1 text-white text-[9px] font-semibold" style={{ background: c }}>{t}</button>
        ))}
      </div>
      <div
        {...handlers}
        style={{ transform: `translateX(${dx}px)` }}
        className="relative bg-[#1E1E1E] h-[72px] px-3 flex items-center gap-2.5 transition-transform touch-pan-y select-none"
      >
        <button onClick={onMarcar} aria-label={seleccionada ? 'Desmarcar' : 'Marcar'}
          className={'w-[22px] h-[22px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 text-rt-12 ' + (seleccionada ? 'bg-brand border-brand text-white' : 'border-grey-500')}>
          {seleccionada && '✓'}
        </button>
        <button onPointerDown={onGrip} aria-label="Arrastar para reordenar" className="touch-none cursor-grab shrink-0"><GripVertical size={18} className="text-grey-600" /></button>
        <button onClick={() => { if (fueArrastre()) return; if (abierto) { cerrar(); return } onExpandir() }} className="flex-1 min-w-0 text-left">
          <span className="block text-white text-rt-14 font-bold truncate">{d.name}</span>
          {d.goal && <span className="inline-block mt-1 text-rt-10 px-2 py-0.5 rounded-[10px] bg-[#2D2D2D] text-grey-400">{etiquetaDe(objetivosDieta, d.goal, lang)}</span>}
        </button>
        <button onClick={onFavorito} aria-label="Favorito" className="shrink-0 p-0.5">
          <Star size={22} className={d.is_favorite ? 'text-brand fill-brand' : 'text-brand'} />
        </button>
        <button onClick={() => (abierto ? cerrar() : onExpandir())} aria-label={expandida ? 'Recolher' : 'Expandir'} className="shrink-0">
          <ChevronLeft size={20} className={'text-grey-500 transition-transform ' + (abierto ? 'rotate-180' : expandida ? '-rotate-90' : '')} />
        </button>
      </div>
    </div>
  )
}

function DietSheet({ dieta, posicion, onClose, onCreada, onEditada }: {
  dieta?: Dieta
  posicion: number
  onClose: () => void
  onCreada: (id: string) => void
  onEditada: () => void
}) {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [nombre, setNombre] = useState(dieta?.name ?? '')
  const [objetivo, setObjetivo] = useState(dieta?.goal ?? 'maintenance')
  const [comidas, setComidas] = useState<RefeicaoElegida[]>([])
  const [abriendo, setAbriendo] = useState<'objetivo' | 'comidas' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombre.trim()) { setError('Nome da dieta é obrigatório'); return }
    if (!profile?.id) return
    setGuardando(true)
    // Editar cambia solo nombre y objetivo: las refeições se editan en el card
    // (en el app original, editar borraba los alimentos).
    if (dieta) {
      const { error: e } = await supabase.from('diets').update({ name: nombre.trim(), goal: objetivo }).eq('id', dieta.id)
      setGuardando(false)
      if (e) { setError('Erro ao salvar: ' + e.message); return }
      onEditada()
      return
    }
    const { data, error: e } = await supabase.from('diets').insert({ owner_id: profile.id, name: nombre.trim(), goal: objetivo, position: posicion }).select('id').single()
    if (e) { setGuardando(false); setError('Erro ao salvar: ' + e.message); return }
    if (comidas.length > 0) {
      const { error: e2 } = await supabase.from('meals').insert(comidas.map((c, i) => ({ diet_id: data.id, name: c.name, time_of_day: c.time, meal_type: c.meal_type, position: i })))
      if (e2) { setGuardando(false); setError('Erro ao salvar refeições: ' + e2.message); return }
    }
    setGuardando(false)
    onCreada(data.id)
  }

  return (
    <FullScreenSheet title={dieta ? 'Editar Dieta' : 'Nova Dieta'} onClose={onClose}>
      {error && (
        <div className="mb-5 rounded-[10px] bg-danger/10 border border-danger/30 px-3 py-2.5 flex items-center gap-2 text-[#EF5350] text-rt-12">
          <AlertCircle size={16} /><span className="flex-1">{error}</span><button onClick={() => setError(null)} aria-label="Fechar"><X size={14} /></button>
        </div>
      )}
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">Nome da Dieta</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ex: Dieta A · Dia de Treino"
            className="w-full h-[52px] px-4 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand" />
        </div>
        <CajaSelector label="Objetivo" valor={objetivo} placeholder="Manutenção" lista={objetivosDieta} lang={lang} onAbrir={() => setAbriendo('objetivo')} />
        {!dieta && (
          <div>
            <label className="block text-white text-rt-13 font-semibold mb-2">Refeição</label>
            <button onClick={() => setAbriendo('comidas')} className="w-full h-[52px] px-4 rounded-[12px] bg-[#252525] flex items-center gap-2">
              <PlusCircle size={20} className={comidas.length ? 'text-brand' : 'text-grey-500'} />
              <span className={'flex-1 text-left text-rt-14 ' + (comidas.length ? 'text-brand' : 'text-grey-500')}>{comidas.length ? 'Adicionar mais refeições' : 'Selecionar refeições'}</span>
              <ChevronRight size={18} className="text-grey-500" />
            </button>
            {comidas.length > 0 && (
              <div className="mt-3 rounded-[12px] bg-[#252525] border border-[#333333] p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-grey-400 text-rt-12">{comidas.length} refeições selecionadas</span>
                  <button onClick={() => setComidas([])} className="text-[#EF5350] text-rt-12 font-semibold">Limpar</button>
                </div>
                <ul className="flex flex-col gap-2">
                  {comidas.map((c) => (
                    <li key={c.meal_type} className="rounded-[8px] bg-[#1E1E1E] border border-[#333333] px-3 py-2 flex items-center gap-2">
                      <span className={'w-7 h-7 rounded-[6px] flex items-center justify-center ' + (c.personalizada ? 'bg-brand/10' : 'bg-[#333333]')}>
                        {c.personalizada ? <Star size={14} className="text-brand" /> : <UtensilsCrossed size={14} className="text-grey-400" />}
                      </span>
                      <span className="flex-1 text-white text-rt-13">{c.name}</span>
                      <span className="flex items-center gap-1 text-rt-11 px-2 py-0.5 rounded-[6px] bg-[#333333] text-white"><Clock size={11} />{c.time}</span>
                      <button onClick={() => setComidas((p) => p.filter((x) => x.meal_type !== c.meal_type))} aria-label="Remover refeição"><X size={16} className="text-[#EF5350]" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-8">
        <button onClick={() => void guardar()} disabled={guardando} className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold shadow-[0_6px_16px_rgba(124,179,66,0.3)] disabled:opacity-60">
          {guardando ? 'Salvando…' : dieta ? 'Salvar Dieta' : 'Criar Dieta'}
        </button>
      </div>
      {abriendo === 'objetivo' && <HojaRadio lista={objetivosDieta} valor={objetivo} lang={lang} onElegir={(id) => { setObjetivo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {abriendo === 'comidas' && (
        <SelecionarRefeicoes
          bloqueados={comidas.map((c) => c.meal_type)}
          onCerrar={() => setAbriendo(null)}
          onElegir={(r) => { setComidas((p) => [...p, ...r].sort((a, b) => a.time.localeCompare(b.time))); setAbriendo(null) }}
        />
      )}
    </FullScreenSheet>
  )
}

const COLORES = ['#7CB342', '#42A5F5', '#AB47BC', '#FF7043', '#26A69A']

function ClonarDieta({ dieta, onCerrar, onResultado }: { dieta: Dieta; onCerrar: () => void; onResultado: (a: Aviso) => void }) {
  const { profile } = useAuth()
  const [alumnos, setAlumnos] = useState<{ id: string; full_name: string | null; email: string | null; link_status: string }[] | null>(null)
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void supabase.from('profiles').select('id,full_name,email,link_status').eq('teacher_id', profile.id).in('link_status', ['active', 'suspended'])
      .order('full_name').then(({ data }) => setAlumnos(((data as any[]) ?? []).sort((a, b) => (a.link_status === 'active' ? 0 : 1) - (b.link_status === 'active' ? 0 : 1))))
  }, [profile?.id])

  const q = sinAcentos(busca.trim())
  const lista = (alumnos ?? []).filter((a) => !q || sinAcentos(`${a.full_name ?? ''} ${a.email ?? ''}`).includes(q))
  const todos = lista.length > 0 && lista.every((a) => marcados.includes(a.id))

  async function clonar() {
    if (!profile?.id) return
    setEnviando(true)
    const copia = copiaParaAlumno(dieta)
    let ok = 0
    const nombres: string[] = []
    for (const id of marcados) {
      const { error } = await supabase.from('student_diets').insert({ student_id: id, teacher_id: profile.id, source_diet_id: dieta.id, name: dieta.name, data: copia })
      if (error) continue
      ok++
      nombres.push(alumnos?.find((a) => a.id === id)?.full_name ?? '')
      // El alumno se entera: lo que el profesor le asigna tiene que verse de su lado.
      await supabase.from('notifications').insert({ user_id: id, type: 'routine', title: 'Nova dieta', body: `${profile.full_name ?? 'Seu professor'} atribuiu a dieta "${dieta.name}".` })
    }
    const fallos = marcados.length - ok
    onResultado(fallos === 0
      ? { kind: 'success', message: ok === 1 ? `Dieta clonada para ${nombres[0]}` : `Dieta clonada para ${ok} alunos` }
      : ok > 0 ? { kind: 'error', message: `Clonada para ${ok} aluno(s). ${fallos} erro(s).` } : { kind: 'error', message: 'Erro ao clonar a dieta.' })
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-white text-rt-20 font-bold">Clonar Dieta</h1>
            <p className="text-grey-500 text-rt-13">Selecione os alunos para receber "{dieta.name}"</p>
          </div>
          <button onClick={onCerrar} aria-label="Fechar" className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={20} className="text-white" /></button>
        </div>
        <div className="relative mx-5 mt-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno..." className="w-full h-[50px] pl-10 pr-3 rounded-[12px] bg-[#2D2D2D] text-white text-rt-14 outline-none" />
        </div>
        <div className="flex items-center px-5 mt-3">
          {marcados.length > 0 && <span className="px-3 py-1 rounded-btn-pill bg-brand/20 text-brand text-rt-12 font-semibold">{marcados.length} selecionado(s)</span>}
          <button onClick={() => setMarcados(todos ? [] : lista.map((a) => a.id))} className="ml-auto text-brand text-rt-13 font-semibold">{todos ? 'Desselecionar todos' : 'Selecionar todos'}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {alumnos === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : lista.length === 0 ? (
            <p className="text-center text-white/60 text-rt-13 py-10">Nenhum aluno encontrado.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.map((a, i) => {
                const on = marcados.includes(a.id)
                return (
                  <li key={a.id}>
                    <button onClick={() => setMarcados((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                      className={'w-full rounded-[12px] p-3 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-brand' : 'bg-[#2D2D2D] border-transparent')}>
                      <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>{on && <Check size={14} className="text-white" />}</span>
                      <span className="w-12 h-12 rounded-full flex items-center justify-center text-rt-18 font-bold shrink-0"
                        style={on ? { background: 'rgba(124,179,66,0.2)', color: '#7CB342' } : { background: COLORES[i % COLORES.length], color: 'white' }}>
                        {(a.full_name ?? a.email ?? '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-white text-rt-15 font-semibold truncate">{a.full_name ?? a.email}</span>
                          <span className={'w-2.5 h-2.5 rounded-full shrink-0 ' + (a.link_status === 'active' ? 'bg-brand' : 'bg-danger')} />
                        </span>
                        <span className="block text-grey-500 text-rt-12 truncate">{a.email}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-grey-800">
          <button disabled={marcados.length === 0 || enviando} onClick={() => void clonar()}
            className={'w-full h-[54px] rounded-[12px] text-white text-rt-15 font-bold ' + (marcados.length ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F]' : 'bg-grey-700')}>
            {enviando ? 'Clonando…' : marcados.length ? `Clonar Dieta para ${marcados.length} aluno(s)` : 'Selecione ao menos 1 aluno'}
          </button>
        </div>
      </div>
    </div>
  )
}
