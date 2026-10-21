import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Search, Camera, Mic, Paperclip, Play, Pause, FileText, X, ArrowUp, Loader2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'
import { localeDe } from '@/lib/fechas'

// Chat al estilo de los mensajes directos de Instagram, con los colores de Rutyn.
// Texto, fotos, videos cortos, audios y documentos (bucket privado "chat", carpeta = id de la conversación).

type Conv = {
  id: string; teacher_id: string; student_id: string
  last_message: string | null; last_message_at: string | null; last_sender_id: string | null
  teacher_last_read_at: string | null; student_last_read_at: string | null
  other?: { id: string; full_name: string | null; avatar_url: string | null }
}

type Tipo = 'text' | 'image' | 'video' | 'audio' | 'file'
type Msg = {
  id: string; conversation_id: string; sender_id: string; body: string; created_at: string
  kind: Tipo; file_path: string | null; file_name: string | null; file_size: number | null; file_mime: string | null; duration_s: number | null
  /** Mensaje que se está enviando (todavía sin fila en la base). */
  local?: string
}

const MAX_ARCHIVO = 25 * 1024 * 1024
const MAX_AUDIO_S = 120
const COLORES = ['#91C145', '#E1306C', '#5B8DEF', '#F5A623', '#9B59B6', '#1ABC9C', '#E67E22']

function Avatar({ url, nombre, size = 56 }: { url?: string | null; nombre?: string | null; size?: number }) {
  const ini = (nombre ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
  const color = COLORES[[...(nombre ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length]
  return (
    <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-white" style={{ width: size, height: size, background: url ? '#222' : color, fontSize: size * 0.38 }}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : ini}
    </div>
  )
}

function useHace() {
  const { t } = useTranslation()
  return (iso: string | null) => {
    if (!iso) return ''
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return t('general:chat.now')
    if (s < 3600) return t('general:chat.min', { n: Math.floor(s / 60) })
    if (s < 86400) return t('general:chat.h', { n: Math.floor(s / 3600) })
    if (s < 7 * 86400) return t('general:chat.d', { n: Math.floor(s / 86400) })
    return new Date(iso).toLocaleDateString(localeDe(), { day: 'numeric', month: 'short' })
  }
}

/**
 * Canal en vivo con la sesión ya cargada: si se abre antes, la base lo trata como anónimo
 * y no manda nada (los mensajes nuevos no aparecían solos).
 */
function enVivo(nombre: string, armar: (c: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>) {
  let canal: ReturnType<typeof supabase.channel> | null = null
  let activo = true
  void supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) await supabase.realtime.setAuth(data.session.access_token)
    if (!activo) return
    canal = armar(supabase.channel(nombre)).subscribe()
  })
  return () => { activo = false; if (canal) void supabase.removeChannel(canal) }
}

/** Texto del último mensaje en la lista ("::image" → "📷 Foto"). */
function textoPrevio(m: string | null, t: (k: string) => string) {
  if (!m) return ''
  return m.startsWith('::') ? t(`general:chat.kind.${m.slice(2)}`) : m
}

/** En escritorio la lista queda a la izquierda y la conversación a la derecha. */
export function ConversasPage() {
  const { t } = useTranslation()
  return (
    <div className="lg:flex lg:gap-4 lg:h-[calc(100dvh-72px)] lg:pt-2">
      <div className="lg:w-[360px] lg:shrink-0 lg:overflow-y-auto no-scrollbar"><ListaConversas /></div>
      <div className="hidden lg:flex flex-1 card-dark items-center justify-center flex-col gap-3 text-white/50">
        <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center"><MessageSquare size={36} className="text-white/70" /></div>
        <div className="text-white text-rt-18 font-semibold">{t('general:chat.title')}</div>
        <div className="text-rt-14">{t('general:extra.tapToChat')}</div>
      </div>
    </div>
  )
}

function ListaConversas({ activoId }: { activoId?: string }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const nav = useNavigate()
  const hace = useHace()
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const isTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if (!profile?.id) return
    void loadOrBoot()
    return enVivo('conv-changes', (c) => c
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void loadOrBoot(false) }))
  }, [profile?.id])

  async function loadOrBoot(primeraVez = true) {
    if (!profile?.id) return
    if (primeraVez) setLoading(true)
    if (primeraVez) {
      if (isTeacher) {
        // Una conversación por cada alumno activo.
        const { data: students } = await supabase.from('profiles').select('id').eq('teacher_id', profile.id).eq('link_status', 'active')
        if (students && students.length > 0) {
          const upserts = students.map((s: any) => ({ teacher_id: profile.id, student_id: s.id }))
          await supabase.from('conversations').upsert(upserts, { onConflict: 'teacher_id,student_id', ignoreDuplicates: true })
        }
      } else if (profile.teacher_id) {
        await supabase.from('conversations').upsert({ teacher_id: profile.teacher_id, student_id: profile.id }, { onConflict: 'teacher_id,student_id', ignoreDuplicates: true })
      }
    }
    const otherKey = isTeacher ? 'student_id' : 'teacher_id'
    const meKey = isTeacher ? 'teacher_id' : 'student_id'
    const { data } = await supabase
      .from('conversations')
      .select('id,teacher_id,student_id,last_message,last_message_at,last_sender_id,teacher_last_read_at,student_last_read_at')
      .eq(meKey, profile.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
    const rows = (data as Conv[]) ?? []
    if (rows.length > 0) {
      const ids = rows.map((r: any) => r[otherKey])
      const { data: others } = await supabase.from('profiles').select('id,full_name,avatar_url').in('id', ids)
      const map = new Map((others ?? []).map((o: any) => [o.id, o]))
      rows.forEach((r) => { r.other = map.get(isTeacher ? r.student_id : r.teacher_id) })
    }
    setConvs(rows)
    setLoading(false)
  }

  const visibles = useMemo(() => {
    const b = q.trim().toLowerCase()
    return b ? convs.filter((c) => (c.other?.full_name ?? '').toLowerCase().includes(b)) : convs
  }, [convs, q])

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24 lg:p-0">
      <div className="flex items-center gap-3 mb-4">
        {!isTeacher && (
          <button onClick={() => nav('/aluno')} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('back')}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-white text-rt-22 font-bold">{t('general:chat.title')}</h1>
      </div>

      <label className="flex items-center gap-2 h-10 px-3 mb-4 rounded-xl bg-surface-raised text-white/60 focus-within:ring-1 focus-within:ring-brand">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('general:chat.search')} className="flex-1 bg-transparent text-white text-rt-14 outline-none placeholder:text-white/40" />
      </label>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('common:loading')}</div>
      ) : convs.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('general:chat.none')} body={isTeacher ? t('general:chat.noneTeacher') : t('general:chat.noneStudent')} />
      ) : visibles.length === 0 ? (
        <div className="text-white/50 text-rt-13 py-8 text-center">{t('general:chat.noResults')}</div>
      ) : (
        <ul className="flex flex-col -mx-2 divide-y divide-white/[0.07]">
          {visibles.map((c) => {
            const goto = isTeacher ? `/professor/mensagens/${c.id}` : `/aluno/chat/${c.id}`
            const miLectura = isTeacher ? c.teacher_last_read_at : c.student_last_read_at
            const deOtro = !!c.last_sender_id && c.last_sender_id !== profile?.id
            const sinLeer = deOtro && !!c.last_message_at && (!miLectura || new Date(c.last_message_at) > new Date(miLectura))
            const previo = c.last_message
              ? (c.last_sender_id === profile?.id ? `${t('general:chat.you')}: ` : '') + textoPrevio(c.last_message, t)
              : t('general:extra.tapToChat')
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => nav(goto, { replace: !!activoId })}
                  className={'w-full text-left px-2 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 ' + (c.id === activoId ? 'bg-white/10' : '')}
                >
                  <Avatar url={c.other?.avatar_url} nombre={c.other?.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className={'text-white text-rt-15 truncate ' + (sinLeer ? 'font-bold' : 'font-medium')}>{c.other?.full_name ?? '...'}</div>
                    <div className={'text-rt-13 truncate ' + (sinLeer ? 'text-white font-semibold' : 'text-white/55')}>
                      {previo}{c.last_message_at ? <span className="text-white/45 font-normal"> · {hace(c.last_message_at)}</span> : null}
                    </div>
                  </div>
                  {sinLeer && <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" aria-label="●" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function tamaño(b: number | null) {
  if (!b) return ''
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
function minSeg(s: number) {
  const n = Math.max(0, Math.round(s))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}
function tipoDe(file: File): Tipo {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}
function extension(file: File) {
  const n = file.name.split('.').pop()
  if (n && n.length <= 5 && n !== file.name) return n.toLowerCase()
  return (file.type.split('/')[1] ?? 'bin').split(';')[0]
}

function BurbujaAudio({ url, duracion, mia }: { url?: string; duracion: number | null; mia: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [sonando, setSonando] = useState(false)
  const [pos, setPos] = useState(0)
  const [total, setTotal] = useState(duracion ?? 0)
  const barras = useMemo(() => Array.from({ length: 28 }, (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 1.7 + (duracion ?? 1))) * 70)), [duracion])
  const avance = total ? pos / total : 0
  return (
    <div className="flex items-center gap-2.5 py-1 w-[220px]">
      <button
        type="button"
        disabled={!url}
        onClick={() => { const a = ref.current; if (!a) return; if (a.paused) void a.play(); else a.pause() }}
        className={'w-8 h-8 rounded-full flex items-center justify-center shrink-0 ' + (mia ? 'bg-black/20' : 'bg-white/15')}
        aria-label={sonando ? 'Pause' : 'Play'}
      >
        {sonando ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-7">
        {barras.map((h, i) => (
          <span key={i} className={'flex-1 rounded-full ' + (i / barras.length <= avance ? (mia ? 'bg-black/70' : 'bg-white') : (mia ? 'bg-black/25' : 'bg-white/35'))} style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="text-rt-11 tabular-nums opacity-80 w-8 text-right">{minSeg(sonando || pos ? pos : total)}</span>
      {url && (
        <audio
          ref={ref} src={url} preload="metadata"
          onPlay={() => setSonando(true)} onPause={() => setSonando(false)}
          onEnded={() => { setSonando(false); setPos(0) }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => { if (isFinite(e.currentTarget.duration)) setTotal(e.currentTarget.duration) }}
        />
      )}
    </div>
  )
}

export function ConversaPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [conv, setConv] = useState<Conv | null>(null)
  const [other, setOther] = useState<{ full_name: string | null; avatar_url: string | null; role?: string } | null>(null)
  const [text, setText] = useState('')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [visor, setVisor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [grabando, setGrabando] = useState<null | { inicio: number }>(null)
  const [segundos, setSegundos] = useState(0)
  const rec = useRef<{ mr: MediaRecorder; trozos: Blob[]; stream: MediaStream; cancelar: boolean } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const docs = useRef<HTMLInputElement>(null)
  const soyProfe = !!conv && profile?.id === conv.teacher_id
  const colLectura = soyProfe ? 'teacher_last_read_at' : 'student_last_read_at'
  const lecturaOtro = conv ? (soyProfe ? conv.student_last_read_at : conv.teacher_last_read_at) : null

  async function marcarLeido() {
    if (!id || !conv) return
    await supabase.from('conversations').update({ [colLectura]: new Date().toISOString() }).eq('id', id)
  }

  useEffect(() => {
    if (!id) return
    setMsgs([]); setUrls({})
    void (async () => {
      const { data: c } = await supabase.from('conversations')
        .select('id,teacher_id,student_id,last_message,last_message_at,last_sender_id,teacher_last_read_at,student_last_read_at').eq('id', id).single()
      if (c) {
        setConv(c as Conv)
        const otherId = profile?.id === c.teacher_id ? c.student_id : c.teacher_id
        const { data: p } = await supabase.from('profiles').select('full_name,avatar_url,role').eq('id', otherId).single()
        setOther(p as any)
      }
      const { data: m } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
      setMsgs((m as Msg[]) ?? [])
    })()

    return enVivo(`msg-${id}`, (c) => c
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const n = payload.new as Msg
        setMsgs((prev) => (prev.some((x) => x.id === n.id) ? prev : [...prev, n]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, (payload) => {
        setConv((prev) => (prev ? { ...prev, ...(payload.new as Conv) } : prev))
      }))
  }, [id, profile?.id])

  // Leído: al abrir y cada vez que llega un mensaje del otro.
  const ultimoDelOtro = [...msgs].reverse().find((m) => m.sender_id !== profile?.id && !m.local)?.id
  useEffect(() => { void marcarLeido() }, [conv?.id, ultimoDelOtro])

  // Al abrir la conversación, sus avisos de "mensaje nuevo" quedan leídos.
  useEffect(() => {
    if (!id || !profile?.id) return
    void supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id).is('read_at', null).eq('data->>conversation_id', id)
      .then(() => {}) // la consulta solo corre con then/await
  }, [id, profile?.id, ultimoDelOtro])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  // Direcciones firmadas (1 hora) de los archivos que todavía no tienen.
  useEffect(() => {
    const faltan = msgs.filter((m) => m.file_path && !m.local && !urls[m.file_path]).map((m) => m.file_path!)
    if (!faltan.length) return
    void supabase.storage.from('chat').createSignedUrls(faltan, 3600).then(({ data }) => {
      if (!data) return
      setUrls((prev) => {
        const n = { ...prev }
        data.forEach((d) => { if (d.path && d.signedUrl) n[d.path] = d.signedUrl })
        return n
      })
    })
  }, [msgs])

  async function send() {
    if (!id || !profile?.id || !text.trim()) return
    const body = text.trim()
    setText('')
    const { data } = await supabase.from('messages').insert({ conversation_id: id, sender_id: profile.id, body, kind: 'text' }).select().single()
    if (data) setMsgs((prev) => (prev.some((x) => x.id === (data as Msg).id) ? prev : [...prev, data as Msg]))
  }

  async function enviarArchivo(file: File, duracion?: number) {
    if (!id || !profile?.id) return
    setError(null)
    if (file.size > MAX_ARCHIVO) { setError(t('general:chat.tooBig')); return }
    const kind = tipoDe(file)
    const local = URL.createObjectURL(file)
    const temp: Msg = {
      id: 'tmp-' + Math.random().toString(36).slice(2), conversation_id: id, sender_id: profile.id, body: '', created_at: new Date().toISOString(),
      kind, file_path: null, file_name: file.name, file_size: file.size, file_mime: file.type, duration_s: duracion ?? null, local,
    }
    setMsgs((prev) => [...prev, temp])
    const ruta = `${id}/${crypto.randomUUID()}.${extension(file)}`
    const subida = await supabase.storage.from('chat').upload(ruta, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (subida.error) {
      setMsgs((prev) => prev.filter((m) => m.id !== temp.id))
      setError(t('general:chat.uploadError'))
      return
    }
    const { data, error: e } = await supabase.from('messages').insert({
      conversation_id: id, sender_id: profile.id, body: '', kind, file_path: ruta, file_name: file.name, file_size: file.size, file_mime: file.type || null, duration_s: duracion ?? null,
    }).select().single()
    if (e || !data) { setMsgs((prev) => prev.filter((m) => m.id !== temp.id)); setError(t('general:chat.uploadError')); return }
    setUrls((prev) => ({ ...prev, [ruta]: local }))
    setMsgs((prev) => {
      const sin = prev.filter((m) => m.id !== temp.id)
      return sin.some((m) => m.id === (data as Msg).id) ? sin : [...sin, data as Msg]
    })
  }

  function elegidos(lista: FileList | null) {
    if (!lista) return
    ;[...lista].slice(0, 10).forEach((f) => { void enviarArchivo(f) })
  }

  // Grabación de audio (toque para empezar; enviar o cancelar).
  useEffect(() => {
    if (!grabando) return
    const iv = setInterval(() => {
      const s = (Date.now() - grabando.inicio) / 1000
      setSegundos(s)
      if (s >= MAX_AUDIO_S) terminarGrabacion(false)
    }, 200)
    return () => clearInterval(iv)
  }, [grabando])

  async function empezarGrabacion() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError(t('general:chat.micDenied')); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const tipo = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((x) => MediaRecorder.isTypeSupported?.(x))
      const mr = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined)
      const estado = { mr, trozos: [] as Blob[], stream, cancelar: false }
      rec.current = estado
      mr.ondataavailable = (e) => { if (e.data.size) estado.trozos.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const dur = (Date.now() - inicio) / 1000
        if (estado.cancelar || dur < 0.8) return
        const mime = (mr.mimeType || tipo || 'audio/webm').split(';')[0]
        const ext = mime.includes('mp4') ? 'm4a' : 'webm'
        void enviarArchivo(new File(estado.trozos, `audio-${Date.now()}.${ext}`, { type: mime }), Math.round(dur))
      }
      const inicio = Date.now()
      mr.start()
      setSegundos(0)
      setGrabando({ inicio })
    } catch {
      setError(t('general:chat.micDenied'))
    }
  }

  function terminarGrabacion(cancelar: boolean) {
    const r = rec.current
    if (!r) return
    r.cancelar = cancelar
    if (r.mr.state !== 'inactive') r.mr.stop()
    rec.current = null
    setGrabando(null)
  }

  const dia = (iso: string) => new Date(iso).toDateString()
  function etiquetaDia(iso: string) {
    const d = new Date(iso)
    const hoy = new Date()
    const ayer = new Date(Date.now() - 86400000)
    const hora = d.toLocaleTimeString(localeDe(), { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === hoy.toDateString()) return `${t('general:chat.today')} ${hora}`
    if (d.toDateString() === ayer.toDateString()) return `${t('general:chat.yesterday')} ${hora}`
    return `${d.toLocaleDateString(localeDe(), { weekday: 'short', day: 'numeric', month: 'short' })} ${hora}`
  }

  const ultimo = msgs[msgs.length - 1]
  const visto = !!ultimo && ultimo.sender_id === profile?.id && !ultimo.local && !!lecturaOtro && new Date(lecturaOtro) >= new Date(ultimo.created_at)

  function contenido(m: Msg, mia: boolean, forma: string): ReactNode {
    const url = m.local ?? (m.file_path ? urls[m.file_path] : undefined)
    const color = mia ? 'bg-gradient-to-br from-[#A6D35A] to-[#6E9A2E] text-[#0b0b0b]' : 'bg-[#262626] text-white'
    if (m.kind === 'image') {
      return (
        <button type="button" onClick={() => url && setVisor(url)} className={'block overflow-hidden bg-[#1a1a1a] ' + forma}>
          {url ? <img src={url} alt="" className="block max-w-[240px] max-h-[320px] object-cover" /> : <div className="w-[200px] h-[200px]" />}
        </button>
      )
    }
    if (m.kind === 'video') {
      return url
        ? <video src={url} controls playsInline preload="metadata" className={'block max-w-[240px] max-h-[360px] bg-black ' + forma} />
        : <div className={'w-[200px] h-[280px] bg-[#1a1a1a] ' + forma} />
    }
    if (m.kind === 'audio') {
      return <div className={'px-3 ' + color + ' ' + forma}><BurbujaAudio url={url} duracion={m.duration_s} mia={mia} /></div>
    }
    if (m.kind === 'file') {
      const ext = (m.file_name?.split('.').pop() ?? '').toUpperCase().slice(0, 4)
      return (
        <a href={url} target="_blank" rel="noopener" download={m.file_name ?? undefined} className={'flex items-center gap-3 px-3 py-2.5 w-[240px] ' + color + ' ' + forma}>
          <div className={'w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ' + (mia ? 'bg-black/15' : 'bg-white/10')}>
            <FileText size={18} /><span className="text-[8px] font-bold leading-none mt-0.5">{ext}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-rt-13 font-semibold truncate">{m.file_name}</div>
            <div className="text-rt-11 opacity-70">{tamaño(m.file_size)}</div>
          </div>
          <Download size={16} className="opacity-70 shrink-0" />
        </a>
      )
    }
    return <div className={'px-3.5 py-2 text-rt-15 leading-snug whitespace-pre-wrap break-words ' + color + ' ' + forma}>{m.body}</div>
  }

  const rol = other?.role === 'teacher' ? t('general:chat.teacher') : other?.role === 'student' ? t('general:chat.student') : ''

  return (
    <div className="lg:flex lg:gap-4 lg:h-[calc(100dvh-72px)] lg:pt-2">
    <div className="hidden lg:block lg:w-[360px] lg:shrink-0 lg:overflow-y-auto no-scrollbar"><ListaConversas activoId={id} /></div>
    <div className="fixed inset-0 z-30 h-dvh bg-[#0b0b0b] lg:static lg:z-auto lg:h-full lg:flex-1 lg:rounded-card lg:overflow-hidden lg:border lg:border-surface-line-strong">
      <div className="h-full flex flex-col">
        <div className="shrink-0 z-20 bg-[#0b0b0b]/95 backdrop-blur-md px-3 pt-[calc(env(safe-area-inset-top)+10px)] lg:pt-3 pb-2.5 flex items-center gap-3 border-b border-white/10">
          <button onClick={() => nav(-1)} className="lg:hidden w-9 h-9 flex items-center justify-center text-white" aria-label={t('back')}>
            <ArrowLeft size={24} />
          </button>
          <Avatar url={other?.avatar_url} nombre={other?.full_name} size={38} />
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-15 font-bold truncate leading-tight">{other?.full_name ?? '...'}</div>
            {rol && <div className="text-white/50 text-rt-12 leading-tight">{rol}</div>}
          </div>
        </div>

        <div className="chat-fondo flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 flex flex-col">
          {msgs.map((m, i) => {
            const mia = m.sender_id === profile?.id
            const prev = msgs[i - 1]
            const next = msgs[i + 1]
            const nuevoDia = !prev || dia(prev.created_at) !== dia(m.created_at) || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 3600000
            const juntoArriba = !!prev && !nuevoDia && prev.sender_id === m.sender_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 300000
            const nextNuevo = !next || dia(next.created_at) !== dia(m.created_at) || new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 3600000
            const juntoAbajo = !!next && !nextNuevo && next.sender_id === m.sender_id && new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 300000
            // Esquinas como Instagram: más rectas del lado de quien escribe cuando los mensajes van seguidos.
            const forma = 'rounded-[22px] ' + (mia
              ? (juntoArriba ? 'rounded-tr-[6px] ' : '') + (juntoAbajo ? 'rounded-br-[6px]' : '')
              : (juntoArriba ? 'rounded-tl-[6px] ' : '') + (juntoAbajo ? 'rounded-bl-[6px]' : ''))
            return (
              <div key={m.id}>
                {nuevoDia && <div className="text-center text-white/45 text-rt-11 font-medium my-4">{etiquetaDia(m.created_at)}</div>}
                <div className={'flex items-end gap-2 ' + (mia ? 'justify-end' : 'justify-start') + (juntoAbajo ? ' mb-[3px]' : ' mb-2')}>
                  {!mia && (juntoAbajo ? <span className="w-7 shrink-0" /> : <Avatar url={other?.avatar_url} nombre={other?.full_name} size={28} />)}
                  <div className={'relative max-w-[75%] lg:max-w-[60%] ' + (m.local ? 'opacity-60' : '')}>
                    {contenido(m, mia, forma)}
                    {m.local && <Loader2 size={18} className="absolute right-2 top-2 animate-spin text-white" />}
                  </div>
                </div>
              </div>
            )
          })}
          {visto && <div className="text-right text-white/50 text-rt-11 -mt-1 mr-1">{t('general:chat.seen')}</div>}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-danger/15 border border-danger/40 text-white text-rt-12 flex items-center gap-2">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} aria-label={t('general:chat.cancel')}><X size={16} /></button>
          </div>
        )}

        <div className="shrink-0 bg-[#0b0b0b] border-t border-white/5 px-3 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
          {grabando ? (
            <div className="flex items-center gap-3 h-12 pl-3 pr-1.5 rounded-full bg-[#262626]">
              <button onClick={() => terminarGrabacion(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white" aria-label={t('general:chat.cancel')}>
                <X size={18} />
              </button>
              <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
              <span className="flex-1 text-white text-rt-14">{t('general:chat.recording')} <span className="tabular-nums text-white/70">{minSeg(segundos)}</span></span>
              <button onClick={() => terminarGrabacion(false)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-black" aria-label={t('general:chat.send')}>
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 h-12 pl-1.5 pr-2 rounded-full bg-[#262626]">
              <button onClick={() => galeria.current?.click()} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A6D35A] to-[#6E9A2E] flex items-center justify-center text-black shrink-0" aria-label={t('general:chat.gallery')}>
                <Camera size={18} strokeWidth={2.2} />
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                placeholder={t('general:chat.placeholder')}
                className="flex-1 min-w-0 bg-transparent text-white text-rt-15 outline-none placeholder:text-white/45"
              />
              {text.trim() ? (
                <button onClick={() => void send()} className="px-2 text-brand text-rt-15 font-bold">{t('general:chat.send')}</button>
              ) : (
                <>
                  <button onClick={() => void empezarGrabacion()} className="w-9 h-9 flex items-center justify-center text-white" aria-label={t('general:chat.record')}><Mic size={22} /></button>
                  <button onClick={() => docs.current?.click()} className="w-9 h-9 flex items-center justify-center text-white" aria-label={t('general:chat.attach')}><Paperclip size={21} /></button>
                </>
              )}
            </div>
          )}
          <input ref={galeria} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { elegidos(e.target.files); e.target.value = '' }} />
          <input ref={docs} type="file" multiple hidden onChange={(e) => { elegidos(e.target.files); e.target.value = '' }} />
        </div>
      </div>
    </div>

    {visor && (
      <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center" onClick={() => setVisor(null)}>
        <button className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white" aria-label={t('general:chat.cancel')}>
          <X size={22} />
        </button>
        <img src={visor} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    )}
    </div>
  )
}
