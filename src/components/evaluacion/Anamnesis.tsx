import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList, Hourglass, Plus, X, ChevronRight, ChevronDown, ChevronUp, Pencil, Trash2, Eye, User, Users, CheckSquare, Square,
  FilePen, Repeat, ArrowLeft, ImagePlus, FileUp, FileText, ExternalLink, RefreshCw, CloudOff, ZoomIn,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { detalleError } from '@/lib/errores'
import { localeDe, hoyLocal } from '@/lib/fechas'
import { aviso } from '@/lib/avisos'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import type { Autor } from './Pruebas'
import { Campo, ModalEdicion, Selector, Texto } from './ui'

export type TipoPregunta = 'yesno' | 'text' | 'number' | 'image' | 'document' | 'select'
export type Pregunta = { id: string; type: TipoPregunta; label?: string; label_pt?: string; label_es?: string; label_en?: string; options?: string[]; options_es?: string[]; options_en?: string[] }
type Archivo = { path: string; name: string }
type Valor = string | number | Archivo | null
export type Anamnesis = {
  id: string; created_at: string; submitted_at: string | null; status: 'pending' | 'in_progress' | 'completed'
  current_index: number; questions: Pregunta[] | null; answers: Record<string, Valor> | null; comments: Record<string, string> | null
  template_id: string | null; template_name: string | null; template_name_es: string | null; template_name_en: string | null
  completed_by: 'student' | 'teacher' | null
}
type Modelo = { id: string; name: string; name_es: string | null; name_en: string | null; kind: 'global' | 'parq' | 'nutrition' | 'custom'; owner_id: string | null; questions: Pregunta[]; priority: number }
type Base = { studentId: string; teacherId: string; fichaId: string; autor: Autor }

const TIPOS: TipoPregunta[] = ['yesno', 'text', 'number', 'image', 'document']
const BUCKET = 'anamnesis-files'
const COLOR_ESTADO = { pending: '#FFA726', in_progress: '#42A5F5', completed: '#8BC34A' }

const lang2 = (l: string) => (l.startsWith('es') ? 'es' : l.startsWith('en') ? 'en' : 'pt')
export const textoPregunta = (q: Pregunta, l: string) => q[`label_${lang2(l)}` as 'label_pt'] || q.label || q.label_pt || q.label_es || q.label_en || ''
const nombreModelo = (m: { name: string; name_es: string | null; name_en: string | null }, l: string) => (lang2(l) === 'es' && m.name_es) || (lang2(l) === 'en' && m.name_en) || m.name
export const nombreAnamnesis = (a: Anamnesis, l: string) => nombreModelo({ name: a.template_name ?? '—', name_es: a.template_name_es, name_en: a.template_name_en }, l)
const esSi = (v: Valor) => v === 'yes' || v === 'Sim' || v === 'Sí' || v === 'Yes'
const esNo = (v: Valor) => v === 'no' || v === 'Não' || v === 'No'
const respondida = (v: Valor | undefined) => v != null && v !== '' && !(typeof v === 'object' && !v.path)
const cuenta = (a: Anamnesis) => { const qs = a.questions ?? []; return { hechas: qs.filter((q) => respondida(a.answers?.[q.id])).length, total: qs.length } }

/** Envía un modelo a varios alumnos: copia las preguntas, libera la sección y avisa a cada uno. */
async function enviar(modelo: Modelo, alumnos: string[], teacherId: string, nombreProfe: string | null) {
  for (const sid of alumnos) {
    await supabase.from('assessments').upsert({ student_id: sid, teacher_id: teacherId, taken_at: hoyLocal() }, { onConflict: 'student_id,teacher_id', ignoreDuplicates: true })
    const { data: ficha } = await supabase.from('assessments').select('id,student_editable_sections').eq('student_id', sid).eq('teacher_id', teacherId).maybeSingle()
    const ed = (ficha?.student_editable_sections as string[] | undefined) ?? []
    if (ficha && !ed.includes('anamnese')) await supabase.from('assessments').update({ student_editable_sections: [...ed, 'anamnese'] }).eq('id', ficha.id)
    const { error } = await supabase.from('anamnesis_answers').insert({
      student_id: sid, teacher_id: teacherId, template_id: modelo.id, questions: modelo.questions, answers: {},
      template_name: modelo.name, template_name_es: modelo.name_es, template_name_en: modelo.name_en,
    })
    if (error) throw error
    await supabase.from('notifications').insert({ user_id: sid, type: 'evaluation', ...aviso('anamnesisSent', { who: nombreProfe, name: modelo.name }) })
  }
}

// ---------------- Sección ----------------

export function SeccionAnamnesis({ lista, esProfe, puedeResponder, base, onCambio }: { lista: Anamnesis[]; esProfe: boolean; puedeResponder: boolean; base: Base; onCambio: () => void }) {
  const { t, i18n } = useTranslation()
  const [eligiendo, setEligiendo] = useState<{ reemplaza?: Anamnesis } | null>(null)
  const [acciones, setAcciones] = useState<Anamnesis | null>(null)
  const [abierta, setAbierta] = useState<{ a: Anamnesis; editar: boolean } | null>(null)
  const [borrando, setBorrando] = useState<Anamnesis | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {esProfe && (
        <button onClick={() => setEligiendo({})} className="h-11 rounded-[12px] bg-[#8BC34A]/15 border border-[#8BC34A]/30 text-[#8BC34A] text-rt-13 font-semibold flex items-center justify-center gap-1.5">
          <Plus size={18} />{t('evaluacion:anamSendNew')}
        </button>
      )}
      {lista.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          {esProfe ? <ClipboardList size={44} className="text-white/30" /> : <Hourglass size={44} className="text-white/30" />}
          <p className="text-white/50 text-rt-14">{esProfe ? t('evaluacion:anamneseEmpty') : t('evaluacion:anamWaiting')}</p>
        </div>
      )}
      {lista.map((a) => {
        const { hechas, total } = cuenta(a)
        const color = COLOR_ESTADO[a.status]
        const puedeLlenar = !esProfe && puedeResponder && a.status !== 'completed'
        return (
          <button key={a.id} onClick={() => (esProfe ? setAcciones(a) : setAbierta({ a, editar: puedeLlenar }))}
            className="w-full rounded-[12px] bg-[#252525] border border-[#2D2D2D] p-3.5 flex flex-col gap-2 text-left">
            <div className="flex items-center gap-2">
              <span className="flex-1 min-w-0 truncate text-white text-rt-13 font-semibold">{nombreAnamnesis(a, i18n.language)}</span>
              <span className="px-2 py-0.5 rounded-[12px] text-rt-11 font-semibold" style={{ color, background: color + '26' }}>{t(`evaluacion:anamStatus.${a.status}`)}</span>
            </div>
            <div className="h-1 rounded-full bg-[#2D2D2D] overflow-hidden"><div className="h-full" style={{ width: `${total ? (hechas / total) * 100 : 0}%`, background: color }} /></div>
            <div className="flex justify-between text-rt-11">
              <span className="text-white/50">{t('evaluacion:anamProgress', { n: hechas, total })}</span>
              <span className="text-white/40">{new Date(a.created_at).toLocaleDateString(localeDe(i18n.language))}</span>
            </div>
            {puedeLlenar && <span className="text-[#8BC34A] text-rt-11 font-medium">{a.status === 'pending' ? t('evaluacion:tapToFill') : t('evaluacion:tapToContinue')}</span>}
          </button>
        )
      })}

      {eligiendo && (
        <FlujoEnvio base={base} reemplaza={eligiendo.reemplaza} onCerrar={() => setEligiendo(null)} onEnviado={() => { setEligiendo(null); onCambio() }} />
      )}
      {acciones && (
        <HojaAcciones
          a={acciones}
          onCerrar={() => setAcciones(null)}
          onVer={() => { setAbierta({ a: acciones, editar: false }); setAcciones(null) }}
          onLlenar={() => { setAbierta({ a: acciones, editar: true }); setAcciones(null) }}
          onTrocar={() => { setEligiendo({ reemplaza: acciones }); setAcciones(null) }}
          onBorrar={() => { setBorrando(acciones); setAcciones(null) }}
        />
      )}
      {abierta && <Cuestionario a={abierta.a} editar={abierta.editar} base={base} esProfe={esProfe} onCerrar={() => { setAbierta(null); onCambio() }} />}
      {borrando && (
        <ConfirmDialog
          message={t('evaluacion:anamDeleteTitle')}
          detail={t('evaluacion:anamDeleteBody', { name: nombreAnamnesis(borrando, i18n.language) })}
          confirmLabel={t('evaluacion:delete')} tone="danger"
          onCancel={() => setBorrando(null)}
          onConfirm={async () => { await supabase.from('anamnesis_answers').delete().eq('id', borrando.id); setBorrando(null); onCambio() }}
        />
      )}
    </div>
  )
}

function Hoja({ titulo, subtitulo, onCerrar, alto, children }: { titulo: string; subtitulo?: string; onCerrar: () => void; alto?: string; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[16px] bg-[#1E1E1E] flex flex-col" style={{ maxHeight: alto ?? '80dvh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><span className="w-10 h-1 rounded-full bg-grey-500" /></div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-2">
          <div className="min-w-0">
            <div className="text-white text-rt-18 font-bold">{titulo}</div>
            {subtitulo && <div className="text-white/50 text-rt-13">{subtitulo}</div>}
          </div>
          <button onClick={onCerrar} aria-label={t('close')} className="w-[30px] h-[30px] shrink-0 rounded-full bg-[#333333] flex items-center justify-center text-white"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">{children}</div>
      </div>
    </div>
  )
}

// ---------------- Envío: modelos → enviar para ----------------

function FlujoEnvio({ base, reemplaza, onCerrar, onEnviado }: { base: Base; reemplaza?: Anamnesis; onCerrar: () => void; onEnviado: () => void }) {
  const { t, i18n } = useTranslation()
  const [modelos, setModelos] = useState<Modelo[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [elegido, setElegido] = useState<Modelo | null>(null)
  const [editando, setEditando] = useState<Modelo | 'nuevo' | null>(null)
  const [viendo, setViendo] = useState<Modelo | null>(null)
  const [borrando, setBorrando] = useState<Modelo | null>(null)
  const [enviado, setEnviado] = useState<number | null>(null)

  async function cargar() {
    setFallo(false); setModelos(null)
    const { data, error } = await supabase.from('anamnesis_templates').select('id,name,name_es,name_en,kind,owner_id,questions,priority').eq('is_active', true).order('priority').order('created_at')
    if (error) { setFallo(true); return }
    setModelos((data as Modelo[]) ?? [])
  }
  useEffect(() => { void cargar() }, [])

  const listos = (modelos ?? []).filter((m) => m.kind !== 'custom')
  const mios = (modelos ?? []).filter((m) => m.kind === 'custom')

  if (enviado != null) {
    return <FeedbackDialog kind="success" message={enviado === 1 ? t('evaluacion:anamSentOne') : t('evaluacion:anamSentMany', { n: enviado })} onClose={onEnviado} />
  }
  if (editando) {
    // Al guardar vuelve al selector con el modelo disponible (la app original cerraba todo).
    return <EditorModelo modelo={editando === 'nuevo' ? null : editando} teacherId={base.teacherId} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); setElegido(null); void cargar() }} />
  }
  if (viendo) return <HojaPreguntas modelo={viendo} onCerrar={() => setViendo(null)} />
  if (borrando) {
    return (
      <ConfirmDialog
        message={t('evaluacion:modelDeleteTitle')} detail={t('evaluacion:modelDeleteBody', { name: nombreModelo(borrando, i18n.language) })}
        confirmLabel={t('evaluacion:delete')} tone="danger" onCancel={() => setBorrando(null)}
        onConfirm={async () => { await supabase.from('anamnesis_templates').delete().eq('id', borrando.id); setBorrando(null); setElegido(null); void cargar() }}
      />
    )
  }
  if (elegido) {
    return (
      <HojaEnviar
        modelo={elegido} base={base} reemplaza={reemplaza}
        onCerrar={() => setElegido(null)} onEditar={() => setEditando(elegido)} onVer={() => setViendo(elegido)} onBorrar={() => setBorrando(elegido)}
        onEnviado={(n) => setEnviado(n)}
      />
    )
  }
  const Item = ({ m }: { m: Modelo }) => (
    <button onClick={() => setElegido(m)} className="w-full rounded-[12px] bg-[#252525] border border-[#2D2D2D] px-4 py-3.5 flex items-center gap-3 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-white text-rt-14 font-medium truncate">{nombreModelo(m, i18n.language)}</span>
        <span className="block text-white/40 text-rt-12">{t('evaluacion:nQuestions', { count: m.questions?.length ?? 0 })}</span>
      </span>
      {(m.kind === 'parq' || m.kind === 'nutrition') && <span className="px-2 py-0.5 rounded-[8px] bg-[#8BC34A]/15 text-[#8BC34A] text-[10px] font-semibold">{m.kind === 'parq' ? 'PAR-Q' : t('evaluacion:nutritionBadge')}</span>}
      <ChevronRight size={18} className="text-white/30" />
    </button>
  )
  return (
    <Hoja titulo={reemplaza ? t('evaluacion:anamReplaceTitle') : t('evaluacion:anamSelectTitle')} onCerrar={onCerrar}>
      {fallo ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CloudOff size={40} className="text-white/55" />
          <p className="text-white/70 text-rt-13">{t('evaluacion:anamLoadTimeout')}</p>
          <button onClick={() => void cargar()} className="px-5 h-10 rounded-[12px] bg-[#7CB342] text-white text-rt-13 font-semibold">{t('evaluacion:retry')}</button>
        </div>
      ) : !modelos ? (
        <div className="py-8 flex justify-center"><span className="w-7 h-7 rounded-full border-2 border-[#7CB342]/30 border-t-[#7CB342] animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {listos.length > 0 && <div className="text-white/60 text-rt-13 font-medium">{t('evaluacion:appTemplates')}</div>}
          {listos.map((m) => <Item key={m.id} m={m} />)}
          <button onClick={() => setEditando('nuevo')} className="h-11 rounded-[12px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-14 font-semibold">+ {t('evaluacion:createModel')}</button>
          {mios.length > 0 && <div className="text-white/60 text-rt-13 font-medium mt-1">{t('evaluacion:myTemplates')}</div>}
          {mios.map((m) => <Item key={m.id} m={m} />)}
        </div>
      )}
    </Hoja>
  )
}

function HojaEnviar({ modelo, base, reemplaza, onCerrar, onEditar, onVer, onBorrar, onEnviado }: {
  modelo: Modelo; base: Base; reemplaza?: Anamnesis
  onCerrar: () => void; onEditar: () => void; onVer: () => void; onBorrar: () => void; onEnviado: (n: number) => void
}) {
  const { t, i18n } = useTranslation()
  const [abierta, setAbierta] = useState(false)
  const [alumnos, setAlumnos] = useState<{ id: string; full_name: string | null }[] | null>(null)
  const [sel, setSel] = useState<string[]>([base.studentId])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const propio = modelo.kind === 'custom'

  useEffect(() => {
    if (!abierta || alumnos || reemplaza) return
    void supabase.from('profiles').select('id,full_name').eq('teacher_id', base.teacherId).eq('role', 'student').eq('link_status', 'active').order('full_name')
      .then(({ data }) => setAlumnos((data as { id: string; full_name: string | null }[]) ?? []))
  }, [abierta])

  async function mandar() {
    setError(''); setEnviando(true)
    try {
      if (reemplaza) await supabase.from('anamnesis_answers').delete().eq('id', reemplaza.id)
      await enviar(modelo, sel, base.teacherId, base.autor.nombre)
      onEnviado(sel.length)
    } catch (e) { setError(t('evaluacion:anamSendError', { msg: detalleError(e) })) }
    finally { setEnviando(false) }
  }

  return (
    <Hoja titulo={t('evaluacion:sendTo')} onCerrar={onCerrar} alto="75dvh">
      <div className="flex flex-col gap-3">
        <div className="rounded-[12px] bg-[#252525] border border-[#2D2D2D] p-3.5">
          <div className="text-white text-rt-14 font-medium">{nombreModelo(modelo, i18n.language)}</div>
          <div className="text-white/50 text-rt-12">{t('evaluacion:nQuestions', { count: modelo.questions?.length ?? 0 })}</div>
        </div>
        {propio ? (
          <div className="flex gap-2">
            <button onClick={onEditar} className="flex-1 h-10 rounded-[10px] bg-[#252525] border border-[#333333] text-white text-rt-13 flex items-center justify-center gap-1.5"><Pencil size={16} className="text-white/70" />{t('evaluacion:editModel')}</button>
            <button onClick={onBorrar} className="flex-1 h-10 rounded-[10px] bg-[#EF5350]/10 border border-[#EF5350]/30 text-[#EF5350] text-rt-13 flex items-center justify-center gap-1.5"><Trash2 size={16} />{t('evaluacion:deleteModel')}</button>
          </div>
        ) : (
          <button onClick={onVer} className="h-10 rounded-[10px] bg-[#252525] border border-[#333333] text-white text-rt-13 flex items-center justify-center gap-1.5"><Eye size={16} className="text-white/70" />{t('evaluacion:viewQuestions')}</button>
        )}
        {!reemplaza && (
          <button onClick={() => setAbierta(!abierta)} className="h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] flex items-center gap-2">
            {sel.length > 1 ? <Users size={18} className="text-[#8BC34A]" /> : <User size={18} className="text-[#8BC34A]" />}
            <span className="flex-1 text-left text-white text-rt-13">{sel.length === 1 && sel[0] === base.studentId ? t('evaluacion:currentStudent') : t('evaluacion:nStudentsSelected', { count: sel.length })}</span>
            {abierta ? <ChevronUp size={18} className="text-white/60" /> : <ChevronDown size={18} className="text-white/60" />}
          </button>
        )}
        {abierta && !reemplaza && (
          <div className="rounded-[12px] bg-[#252525] max-h-[250px] overflow-y-auto">
            {!alumnos ? (
              <div className="py-6 flex justify-center"><span className="w-6 h-6 rounded-full border-2 border-[#8BC34A]/30 border-t-[#8BC34A] animate-spin" /></div>
            ) : alumnos.length === 0 ? (
              <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:noStudents')}</p>
            ) : (
              <>
                <div className="flex justify-between px-3 py-2 text-rt-12">
                  <span className="text-white/50">{t('evaluacion:nStudents', { count: alumnos.length })}</span>
                  <button onClick={() => setSel(sel.length === alumnos.length ? [base.studentId] : alumnos.map((a) => a.id))} className="text-[#8BC34A] font-semibold">
                    {sel.length === alumnos.length ? t('evaluacion:deselectAll') : t('evaluacion:selectAll')}
                  </button>
                </div>
                {alumnos.map((a) => {
                  const on = sel.includes(a.id)
                  const actual = a.id === base.studentId
                  return (
                    <button key={a.id} onClick={() => setSel(on ? sel.filter((x) => x !== a.id) : [...sel, a.id])} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                      {on ? <CheckSquare size={20} className="text-[#8BC34A]" /> : <Square size={20} className="text-grey-500" />}
                      <span className={'flex-1 min-w-0 truncate text-white text-rt-13 ' + (actual ? 'font-semibold' : '')}>{a.full_name ?? '—'}</span>
                      {actual && <span className="px-1.5 rounded-[6px] bg-[#8BC34A]/15 text-[#8BC34A] text-[10px] font-semibold">{t('evaluacion:currentBadge')}</span>}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
        {error && <p className="text-[#EF5350] text-rt-12" role="alert">{error}</p>}
        <button disabled={sel.length === 0 || enviando} onClick={() => void mandar()}
          className={'h-[52px] rounded-[14px] text-white text-rt-15 font-bold flex items-center justify-center ' + (sel.length ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F] shadow-[0_4px_12px_rgba(124,179,66,0.3)]' : 'bg-[#333333]')}>
          {enviando ? <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : sel.length > 1 ? t('evaluacion:sendToN', { n: sel.length }) : t('evaluacion:send')}
        </button>
      </div>
    </Hoja>
  )
}

function HojaPreguntas({ modelo, onCerrar }: { modelo: Modelo; onCerrar: () => void }) {
  const { t, i18n } = useTranslation()
  return (
    <Hoja titulo={nombreModelo(modelo, i18n.language)} subtitulo={t('evaluacion:nQuestions', { count: modelo.questions.length })} onCerrar={onCerrar} alto="70dvh">
      <div className="flex flex-col gap-2">
        {modelo.questions.map((q, i) => (
          <div key={q.id} className="rounded-[10px] bg-[#252525] border border-[#2D2D2D] p-3 flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#8BC34A]/15 text-[#8BC34A] text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-white text-rt-13 font-medium">{textoPregunta(q, i18n.language)}</span>
              <span className="block text-white/40 text-rt-11">{t(`evaluacion:qtype.${q.type}`)}</span>
            </span>
          </div>
        ))}
      </div>
    </Hoja>
  )
}

function EditorModelo({ modelo, teacherId, onCerrar, onGuardado }: { modelo: Modelo | null; teacherId: string; onCerrar: () => void; onGuardado: () => void }) {
  const { t, i18n } = useTranslation()
  const [nombre, setNombre] = useState(modelo ? nombreModelo(modelo, i18n.language) : t('evaluacion:newFormDefault'))
  const [preguntas, setPreguntas] = useState<{ id: string; texto: string; type: TipoPregunta }[]>(
    modelo?.questions.map((q) => ({ id: q.id, texto: textoPregunta(q, i18n.language), type: q.type === 'select' ? 'text' : q.type })) ?? [{ id: crypto.randomUUID(), texto: '', type: 'text' }],
  )
  const [tipoDe, setTipoDe] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    if (!nombre.trim()) { setError(t('evaluacion:needFormName')); return }
    const validas = preguntas.filter((p) => p.texto.trim())
    if (validas.length === 0) { setError(t('evaluacion:needOneQuestion')); return }
    setGuardando(true)
    // Modelo propio en el idioma del profesor: el mismo texto sirve de respaldo para los tres.
    const questions: Pregunta[] = validas.map((p) => ({ id: p.id, type: p.type, label: p.texto.trim() }))
    const fila = { name: nombre.trim(), name_es: null, name_en: null, questions, kind: 'custom', owner_id: teacherId, is_active: true, priority: 1000 }
    const { error: err } = modelo
      ? await supabase.from('anamnesis_templates').update(fila).eq('id', modelo.id)
      : await supabase.from('anamnesis_templates').insert(fila)
    setGuardando(false)
    if (err) { setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    onGuardado()
  }

  const cat = (id: string) => { const x = t(`evaluacion:qtype.${id}`); return { id, pt: x, es: x, en: x } }
  return (
    <ModalEdicion
      titulo={modelo ? t('evaluacion:editModelTitle') : t('evaluacion:newModelTitle')} subtitulo={t('evaluacion:modelSubtitle')}
      guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}
      extra={tipoDe != null && (
        <HojaRadio lista={TIPOS.map(cat)} valor={preguntas[tipoDe].type} lang={i18n.language}
          onElegir={(id) => { setPreguntas(preguntas.map((p, i) => (i === tipoDe ? { ...p, type: id as TipoPregunta } : p))); setTipoDe(null) }} onCerrar={() => setTipoDe(null)} />
      )}
    >
      <Campo etiqueta={t('evaluacion:formName')}><Texto valor={nombre} onChange={setNombre} placeholder={t('evaluacion:newFormDefault')} /></Campo>
      {preguntas.map((p, i) => (
        <div key={p.id} className="rounded-[12px] bg-[#252525] border border-[#8BC34A]/30 px-3.5 py-3 flex flex-col gap-2">
          <span className="text-white/60 text-rt-12 font-medium">{t('evaluacion:questionN', { n: i + 1 })}</span>
          <input value={p.texto} onChange={(e) => setPreguntas(preguntas.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} placeholder={t('evaluacion:questionPh')}
            className="w-full h-11 px-3 rounded-[10px] bg-[#1E1E1E] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none placeholder:text-grey-600" />
          <span className="text-white/60 text-rt-12 font-medium">{t('evaluacion:answerType')}</span>
          <Selector valor={t(`evaluacion:qtype.${p.type}`)} onClick={() => setTipoDe(i)} />
          {preguntas.length > 1 && (
            <button onClick={() => setPreguntas(preguntas.filter((_, k) => k !== i))} className="self-center text-[#EF5350]/70 text-rt-12">{t('evaluacion:deleteQuestion')}</button>
          )}
        </div>
      ))}
      <button onClick={() => setPreguntas([...preguntas, { id: crypto.randomUUID(), texto: '', type: 'text' }])} className="h-11 rounded-[12px] border border-dashed border-[#8BC34A]/50 text-[#8BC34A] text-rt-13 font-semibold">+ {t('evaluacion:addQuestion')}</button>
    </ModalEdicion>
  )
}

function HojaAcciones({ a, onCerrar, onVer, onLlenar, onTrocar, onBorrar }: { a: Anamnesis; onCerrar: () => void; onVer: () => void; onLlenar: () => void; onTrocar: () => void; onBorrar: () => void }) {
  const { t, i18n } = useTranslation()
  const Fila = ({ icono: Icono, texto, onClick, peligro }: { icono: typeof Eye; texto: string; onClick: () => void; peligro?: boolean }) => (
    <button onClick={onClick} className={'w-full rounded-[12px] border px-4 py-3.5 flex items-center gap-3 text-left ' + (peligro ? 'bg-[#EF5350]/10 border-[#EF5350]/30 text-[#EF5350]' : 'bg-[#252525] border-[#2D2D2D] text-white')}>
      <Icono size={22} className={peligro ? '' : 'text-white/70'} />
      <span className="flex-1 text-rt-14 font-medium">{texto}</span>
      {!peligro && <ChevronRight size={18} className="text-white/30" />}
    </button>
  )
  return (
    <Hoja titulo={nombreAnamnesis(a, i18n.language)} subtitulo={t('evaluacion:whatToDo')} onCerrar={onCerrar}>
      <div className="flex flex-col gap-2">
        <Fila icono={Eye} texto={t('evaluacion:viewAnswers')} onClick={onVer} />
        {a.status !== 'completed' && <Fila icono={FilePen} texto={t('evaluacion:fillMyself')} onClick={onLlenar} />}
        <Fila icono={Repeat} texto={t('evaluacion:changeModel')} onClick={onTrocar} />
        <Fila icono={Trash2} texto={t('evaluacion:deleteAnamnesis')} onClick={onBorrar} peligro />
      </div>
    </Hoja>
  )
}

// ---------------- Cuestionario paso a paso ----------------

function Cuestionario({ a, editar, base, esProfe, onCerrar }: { a: Anamnesis; editar: boolean; base: Base; esProfe: boolean; onCerrar: () => void }) {
  const { t, i18n } = useTranslation()
  const preguntas = a.questions ?? []
  const [i, setI] = useState(editar ? Math.min(a.current_index ?? 0, Math.max(preguntas.length - 1, 0)) : 0)
  const [resp, setResp] = useState<Record<string, Valor>>(a.answers ?? {})
  const [coment, setComent] = useState<Record<string, string>>(a.comments ?? {})
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const cambio = useRef(false)
  const q = preguntas[i]

  // URLs firmadas de los adjuntos para verlos.
  useEffect(() => {
    const archivos = Object.entries(resp).filter(([, v]) => v && typeof v === 'object' && (v as Archivo).path) as [string, Archivo][]
    const faltan = archivos.filter(([k]) => !urls[k])
    if (faltan.length === 0) return
    void supabase.storage.from(BUCKET).createSignedUrls(faltan.map(([, v]) => v.path), 3600).then(({ data }) => {
      setUrls((u) => ({ ...u, ...Object.fromEntries(faltan.map(([k], n) => [k, data?.[n]?.signedUrl ?? ''])) }))
    })
  }, [resp])

  if (preguntas.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#1E1E1E] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-white/70 text-rt-14">{t('evaluacion:anamNoQuestions')}</p>
        <button onClick={onCerrar} className="text-[#8BC34A] text-rt-14 font-semibold">{t('close')}</button>
      </div>
    )
  }

  async function guardar(estado: Anamnesis['status'], indice: number) {
    const fila: Record<string, unknown> = { answers: resp, comments: coment, status: estado, current_index: indice }
    if (estado === 'completed') { fila.submitted_at = new Date().toISOString(); fila.completed_by = esProfe ? 'teacher' : 'student' }
    const { error: err } = await supabase.from('anamnesis_answers').update(fila).eq('id', a.id)
    if (err) throw err
  }

  async function avanzar() {
    setError('')
    const ultima = i === preguntas.length - 1
    if (ultima) {
      const falta = preguntas.findIndex((p) => !respondida(resp[p.id]))
      if (falta !== -1) { setI(falta); setError(t('evaluacion:anamMissing', { n: falta + 1 })); return }
    }
    setGuardando(true)
    try {
      await guardar(ultima ? 'completed' : 'in_progress', ultima ? i : i + 1)
      if (ultima) {
        if (!esProfe) await supabase.from('notifications').insert({ user_id: base.teacherId, type: 'evaluation', ...aviso('anamnesisDone', { who: base.autor.nombre, name: nombreAnamnesis(a, 'pt') }) })
        onCerrar()
      } else setI(i + 1)
    } catch (e) { setError(t('evaluacion:saveError', { msg: detalleError(e) })) }
    finally { setGuardando(false) }
  }

  async function salir() {
    // Solo guarda el progreso si realmente se respondió algo (la app original marcaba "en curso" igual).
    if (editar && cambio.current) {
      try { await guardar('in_progress', i) } catch (e) { setError(t('evaluacion:saveError', { msg: detalleError(e) })); return }
    }
    onCerrar()
  }

  function responder(v: Valor) { cambio.current = true; setResp({ ...resp, [q.id]: v }) }

  async function adjuntar(f: File) {
    setSubiendo(true); setError('')
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8)
    const path = `${base.studentId}/${base.teacherId}/${a.id}/${q.id}-${Date.now()}.${ext}`
    const { error: err } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined })
    setSubiendo(false)
    if (err) { setError(t('evaluacion:uploadError', { msg: detalleError(err) })); return }
    const previo = resp[q.id]
    if (previo && typeof previo === 'object' && previo.path) await supabase.storage.from(BUCKET).remove([previo.path])
    setUrls((u) => { const n = { ...u }; delete n[q.id]; return n })
    responder({ path, name: f.name })
  }

  const v = resp[q.id]
  const lectura = !editar
  const opciones = q.type === 'select' ? ((lang2(i18n.language) === 'es' && q.options_es) || (lang2(i18n.language) === 'en' && q.options_en) || q.options || []) : []
  const colorBarra = lectura ? '#64B5F6' : '#8BC34A'

  return (
    <div className="fixed inset-0 z-[60] bg-[#1E1E1E] flex flex-col">
      <div className="max-w-form w-full mx-auto flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-3">
        <button onClick={() => void salir()} aria-label={t('back')} className="p-1 text-white"><ArrowLeft size={20} /></button>
        <span className="flex-1 min-w-0 truncate text-white text-rt-16 font-semibold">{nombreAnamnesis(a, i18n.language)}</span>
        {lectura && <span className="px-2 py-0.5 rounded-[10px] bg-[#42A5F5]/15 text-[#90CAF9] text-rt-11 font-semibold">{t('evaluacion:viewing')}</span>}
        <span className="text-white/60 text-rt-13">{i + 1}/{preguntas.length}</span>
      </div>
      <div className="max-w-form w-full mx-auto px-4"><div className="h-1.5 rounded bg-[#2D2D2D] overflow-hidden"><div className="h-full transition-all" style={{ width: `${((i + 1) / preguntas.length) * 100}%`, background: colorBarra }} /></div></div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-form mx-auto p-5 flex flex-col gap-4">
          <div className="rounded-[16px] bg-[#252525] border border-[#2D2D2D] p-5 text-white text-rt-15 font-medium leading-relaxed">{textoPregunta(q, i18n.language)}</div>
          {lectura && <span className="text-white/50 text-rt-12">{t('evaluacion:answerLabel')}</span>}

          {q.type === 'yesno' && (
            <div className="grid grid-cols-2 gap-3">
              {(['yes', 'no'] as const).map((op) => {
                const on = op === 'yes' ? esSi(v) : esNo(v)
                const c = op === 'yes' ? '#8BC34A' : '#EF5350'
                return (
                  <button key={op} disabled={lectura} onClick={() => responder(on ? null : op)}
                    className="h-[52px] rounded-[12px] border-2 text-rt-15"
                    style={on ? { background: c + '33', borderColor: c, color: c, fontWeight: 700 } : { background: '#252525', borderColor: '#2D2D2D', color: 'rgba(255,255,255,0.7)' }}>
                    {op === 'yes' ? t('evaluacion:yesUpper') : t('evaluacion:noUpper')}
                  </button>
                )
              })}
            </div>
          )}
          {(q.type === 'text' || q.type === 'number') && (lectura ? (
            <p className={'text-rt-14 ' + (respondida(v) ? 'text-white' : 'text-white/40 italic')}>{respondida(v) ? String(v) : t('evaluacion:noAnswer')}</p>
          ) : q.type === 'text' ? (
            <textarea rows={4} value={(v as string) ?? ''} onChange={(e) => responder(e.target.value)} placeholder={t('evaluacion:typeAnswer')}
              className="w-full px-4 py-3 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none resize-none placeholder:text-grey-600" />
          ) : (
            <input inputMode="decimal" value={(v as string | number | null) ?? ''} onChange={(e) => responder(e.target.value.replace(/[^\d.,-]/g, ''))} placeholder={t('evaluacion:typeValue')}
              className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none placeholder:text-grey-600" />
          ))}
          {q.type === 'select' && (
            <div className="flex flex-col gap-2">
              {opciones.map((op, k) => {
                const on = v === (q.options?.[k] ?? op)
                return (
                  <button key={op} disabled={lectura} onClick={() => responder(q.options?.[k] ?? op)}
                    className={'h-12 px-4 rounded-[12px] border text-left text-rt-14 ' + (on ? 'bg-[#8BC34A]/20 border-[#8BC34A] text-[#8BC34A] font-semibold' : 'bg-[#252525] border-[#2D2D2D] text-white/80')}>{op}</button>
                )
              })}
            </div>
          )}
          {(q.type === 'image' || q.type === 'document') && (() => {
            const adj = v && typeof v === 'object' ? (v as Archivo) : null
            if (!adj) {
              return lectura
                ? <p className="text-white/40 italic text-rt-14">{q.type === 'image' ? t('evaluacion:noImage') : t('evaluacion:noDocument')}</p>
                : (
                  <button onClick={() => archivo.current?.click()} disabled={subiendo} className="rounded-[12px] bg-[#252525] border border-[#333333] p-8 flex flex-col items-center gap-2 text-white/60 text-rt-13">
                    {subiendo ? <span className="w-8 h-8 rounded-full border-2 border-[#8BC34A]/30 border-t-[#8BC34A] animate-spin" /> : q.type === 'image' ? <ImagePlus size={40} /> : <FileUp size={40} />}
                    {q.type === 'image' ? t('evaluacion:tapSelectImage') : t('evaluacion:tapSelectDocument')}
                  </button>
                )
            }
            return q.type === 'image' ? (
              <div className="flex flex-col items-start gap-2">
                <button onClick={() => urls[q.id] && setAmpliada(urls[q.id])} className="relative">
                  {urls[q.id] ? <img src={urls[q.id]} alt="" className="h-[200px] rounded-[12px] object-cover" /> : <div className="h-[200px] w-[150px] rounded-[12px] bg-[#252525]" />}
                  <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><ZoomIn size={16} className="text-white" /></span>
                </button>
                {!lectura && <button onClick={() => archivo.current?.click()} className="text-[#8BC34A] text-rt-13">{t('evaluacion:changeImage')}</button>}
              </div>
            ) : (
              <div className="rounded-[12px] bg-[#252525] border border-[#333333] p-3 flex items-center gap-3">
                <FileText size={22} className="text-[#8BC34A]" />
                <span className="flex-1 min-w-0 truncate text-white text-rt-13">{adj.name || t('evaluacion:documentAttached')}</span>
                {urls[q.id] && <a href={urls[q.id]} target="_blank" rel="noreferrer" aria-label={t('evaluacion:openDocument')} className="text-white/70"><ExternalLink size={18} /></a>}
                {!lectura && <button onClick={() => archivo.current?.click()} aria-label={t('evaluacion:changeDocument')} className="text-white/70"><RefreshCw size={18} /></button>}
              </div>
            )
          })()}
          <input ref={archivo} type="file" className="hidden" accept={q.type === 'image' ? 'image/*' : undefined}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void adjuntar(f) }} />

          {(!lectura || coment[q.id]) && (
            <div>
              <div className="text-white/60 text-rt-12 mb-1.5">{t('evaluacion:observations')}</div>
              {lectura ? <p className="text-white/80 text-rt-13">{coment[q.id]}</p> : (
                <textarea rows={2} value={coment[q.id] ?? ''} onChange={(e) => { cambio.current = true; setComent({ ...coment, [q.id]: e.target.value }) }} placeholder={t('evaluacion:observationsPh')}
                  className="w-full px-4 py-3 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-13 outline-none resize-none placeholder:text-grey-600" />
              )}
            </div>
          )}
          {error && <p className="text-[#EF5350] text-rt-13" role="alert">{error}</p>}
        </div>
      </div>

      <div className="border-t border-[#2D2D2D] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-form mx-auto flex gap-3">
          <button disabled={i === 0} onClick={() => setI(i - 1)} className="flex-1 h-12 rounded-[24px] border border-[#333333] text-white text-rt-14 font-semibold disabled:opacity-40">{t('evaluacion:previous')}</button>
          {lectura ? (
            <button disabled={i === preguntas.length - 1} onClick={() => setI(i + 1)} className="flex-1 h-12 rounded-[24px] bg-[#42A5F5]/20 text-[#90CAF9] text-rt-14 font-semibold disabled:opacity-40">{t('evaluacion:next')}</button>
          ) : (
            <button disabled={guardando || subiendo} onClick={() => void avanzar()} className="flex-1 h-12 rounded-[24px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-14 font-bold flex items-center justify-center">
              {guardando ? <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : i === preguntas.length - 1 ? t('evaluacion:finish') : t('evaluacion:advance')}
            </button>
          )}
        </div>
      </div>

      {ampliada && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
          <div className="p-4 pt-[calc(env(safe-area-inset-top)+12px)]"><button onClick={() => setAmpliada(null)} aria-label={t('back')} className="text-white"><ArrowLeft size={22} /></button></div>
          <div className="flex-1 overflow-auto flex items-center justify-center"><img src={ampliada} alt="" className="max-w-full max-h-full object-contain" /></div>
        </div>
      )}
    </div>
  )
}
