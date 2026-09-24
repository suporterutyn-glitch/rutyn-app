import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bell, MessageSquare, Wallet, ClipboardCheck, Dumbbell, AlertTriangle, Megaphone, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'
import { textoAviso, type DatosAviso } from '@/lib/avisos'
import { localeDe } from '@/lib/fechas'

type N = {
  id: string
  type: string
  title: string
  body: string | null
  data: { image_url?: string; key?: string; params?: DatosAviso } | null
  read_at: string | null
  created_at: string
}

type Filtro = 'all' | 'payment' | 'routine' | 'evaluation' | 'message'

/** Qué tipos entran en cada chip del filtro. */
const EN_FILTRO: Record<Exclude<Filtro, 'all'>, string[]> = {
  // Los avisos de vencimiento y suspensión llegan como 'warning' pero son pagos.
  payment: ['payment', 'warning'],
  routine: ['routine'],
  evaluation: ['evaluation'],
  message: ['invite'],
}

const ICON: Record<string, any> = {
  invite: MessageSquare, payment: Wallet, evaluation: ClipboardCheck,
  routine: Dumbbell, warning: AlertTriangle, info: Megaphone, system: Bell,
}
/** Color del círculo del icono y del tag, como en el diseño. */
const TONO: Record<string, { fondo: string; texto: string; tag: string }> = {
  invite: { fondo: 'bg-info/20', texto: 'text-info-light', tag: 'bg-info/25 text-info-light' },
  payment: { fondo: 'bg-warning/20', texto: 'text-warning', tag: 'bg-warning/25 text-warning' },
  evaluation: { fondo: 'bg-info/20', texto: 'text-info-light', tag: 'bg-info/25 text-info-light' },
  routine: { fondo: 'bg-brand/20', texto: 'text-brand', tag: 'bg-brand/25 text-brand' },
  warning: { fondo: 'bg-warning/20', texto: 'text-warning', tag: 'bg-warning/25 text-warning' },
  info: { fondo: 'bg-brand/20', texto: 'text-brand', tag: 'bg-brand/25 text-brand' },
  system: { fondo: 'bg-surface-input', texto: 'text-white', tag: 'bg-surface-raised text-white/80' },
}

export function NotificacoesPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [crudas, setItems] = useState<N[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('all')
  const [abierta, setAbierta] = useState<N | null>(null)
  const [imagenGrande, setImagenGrande] = useState<string | null>(null)

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'all', label: t('notifications:filterAll') },
    { key: 'payment', label: t('notifications:filterPayments') },
    { key: 'routine', label: t('notifications:filterRoutines') },
    { key: 'evaluation', label: t('notifications:filterAssessments') },
    { key: 'message', label: t('notifications:filterMessages') },
  ]

  const TAG: Record<string, string> = {
    invite: t('notifications:tagChat'), payment: t('notifications:tagPayment'),
    evaluation: t('notifications:tagAssessment'), routine: t('notifications:tagRoutine'),
    warning: t('notifications:tagReminder'), info: t('notifications:tagTeacher'),
    system: t('notifications:tagInfo'),
  }

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100)
      setItems((data as N[]) ?? [])
      const sinLeer = ((data as N[]) ?? []).filter((n) => !n.read_at).map((n) => n.id)
      if (sinLeer.length > 0) {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', sinLeer)
      }
      setLoading(false)
    })()
  }, [profile?.id])

  // Los avisos de la app llegan como clave + datos: se traducen acá.
  const items = useMemo(
    () => crudas.map((n) => ({ ...n, ...textoAviso(n, t, i18n.language) })),
    [crudas, t, i18n.language],
  )

  const filtradas = useMemo(
    () => (filtro === 'all' ? items : items.filter((n) => EN_FILTRO[filtro].includes(n.type))),
    [items, filtro],
  )

  // El diseño separa lo de hoy de lo anterior.
  const inicioDeHoy = new Date(); inicioDeHoy.setHours(0, 0, 0, 0)
  const deHoy = filtradas.filter((n) => new Date(n.created_at) >= inicioDeHoy)
  const anteriores = filtradas.filter((n) => new Date(n.created_at) < inicioDeHoy)

  function Tarjeta({ n }: { n: N }) {
    const Icon = ICON[n.type] ?? Bell
    const tono = TONO[n.type] ?? TONO.system
    const imagen = n.data?.image_url
    return (
      <li>
        <button
          onClick={() => setAbierta(n)}
          className="w-full card-dark p-3 flex items-start gap-3 text-left active:scale-[0.99]"
        >
          <div className={'w-11 h-11 rounded-full flex items-center justify-center shrink-0 ' + tono.fondo}>
            <Icon size={20} className={tono.texto} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-14 font-semibold">{n.title}</div>
            {n.body && <div className="text-white/60 text-rt-12 mt-0.5 leading-[1.4]">{n.body}</div>}
            {imagen && (
              <img src={imagen} alt="" className="w-full h-[120px] object-cover rounded-[10px] mt-2" />
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-grey-500 text-rt-10">{haceCuanto(n.created_at, t('notifications:now'))}</span>
              <span className={'text-rt-10 font-semibold px-2 py-0.5 rounded-tag ' + tono.tag}>{TAG[n.type] ?? ''}</span>
            </div>
          </div>
        </button>
      </li>
    )
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('notifications:title')}</h1>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={
              'shrink-0 h-10 px-5 rounded-btn-pill text-rt-13 font-semibold border transition ' +
              (filtro === f.key ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-white/80')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('common:loading')}</div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon={Bell} title={t('notifications:none')} body={t('notifications:noneSub')} />
      ) : (
        <div className="flex flex-col gap-5">
          {deHoy.length > 0 && (
            <section>
              <h2 className="text-white text-rt-16 font-bold mb-2">{t('notifications:today')}</h2>
              <ul className="flex flex-col gap-2">{deHoy.map((n) => <Tarjeta key={n.id} n={n} />)}</ul>
            </section>
          )}
          {anteriores.length > 0 && (
            <section>
              <h2 className="text-white text-rt-16 font-bold mb-2">{t('notifications:earlier')}</h2>
              <ul className="flex flex-col gap-2">{anteriores.map((n) => <Tarjeta key={n.id} n={n} />)}</ul>
            </section>
          )}
        </div>
      )}

      {abierta && (
        <DetalleNotificacion
          n={abierta}
          tag={TAG[abierta.type] ?? ''}
          onVerImagen={(url) => setImagenGrande(url)}
          onClose={() => setAbierta(null)}
        />
      )}

      {imagenGrande && (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center" onClick={() => setImagenGrande(null)}>
          <img src={imagenGrande} alt="" className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => setImagenGrande(null)}
            className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white"
            aria-label={t('common:close')}
          >
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  )
}

function DetalleNotificacion({ n, tag, onVerImagen, onClose }: {
  n: N; tag: string; onVerImagen: (url: string) => void; onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const Icon = ICON[n.type] ?? Bell
  const tono = TONO[n.type] ?? TONO.system
  const imagen = n.data?.image_url
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-app rounded-t-[28px] bg-surface-card px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] max-h-[70dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={'w-12 h-12 rounded-full flex items-center justify-center shrink-0 ' + tono.fondo}>
            <Icon size={22} className={tono.texto} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-18 font-bold leading-tight">{n.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-grey-500 text-rt-11">{new Date(n.created_at).toLocaleString(localeDe(i18n.language))}</span>
              <span className={'text-rt-10 font-semibold px-2 py-0.5 rounded-tag ' + tono.tag}>{tag}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white shrink-0" aria-label={t('common:close')}>
            <X size={18} />
          </button>
        </div>

        {n.body && <p className="text-white/80 text-rt-14 leading-[1.5] mt-4 whitespace-pre-line">{n.body}</p>}

        {imagen && (
          <button onClick={() => onVerImagen(imagen)} className="block w-full mt-4">
            <img src={imagen} alt="" className="w-full rounded-[12px]" />
          </button>
        )}
      </div>
    </div>
  )
}

/** "agora", "3h", "2d" — como en el diseño, no la fecha completa. */
function haceCuanto(iso: string, etiquetaAhora: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return etiquetaAhora
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

