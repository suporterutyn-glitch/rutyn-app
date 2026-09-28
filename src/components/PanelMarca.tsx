import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, LineChart, MessageCircle, MonitorSmartphone } from 'lucide-react'
import { RutynLogo } from '@/components/RutynLogo'

// Pantallas de acceso que en escritorio van a la derecha, con la marca a la izquierda.
const RUTAS = ['/identificacao', '/login', '/esqueci-senha', '/redefinir-senha', '/cadastro/professor', '/cadastro/aluno', '/aguardando', '/bloqueado']

/** Mitad izquierda de las pantallas de acceso en escritorio (≥1024px). */
export function PanelMarca() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const visible = RUTAS.includes(pathname)

  // La clase en <body> corre el formulario a la derecha (ver index.css).
  useEffect(() => {
    document.body.classList.toggle('con-marca', visible)
    return () => document.body.classList.remove('con-marca')
  }, [visible])

  if (!visible) return null
  const rasgos = [
    { icon: Dumbbell, texto: t('navegacion:brandF1') },
    { icon: LineChart, texto: t('navegacion:brandF2') },
    { icon: MessageCircle, texto: t('navegacion:brandF3') },
    { icon: MonitorSmartphone, texto: t('navegacion:brandF4') },
  ]
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[calc(100vw-var(--acceso-w))] flex-col justify-between p-14 xl:p-20 overflow-hidden">
      <div className="absolute inset-0 bg-[#0b0b0b] bg-gym bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-[#445B21]/60" />
      <div className="relative flex items-center gap-3">
        <RutynLogo size={48} />
        <span className="text-white text-rt-28 font-black tracking-tight">Rutyn</span>
      </div>
      <div className="relative max-w-[560px]">
        <h1 className="text-white text-[44px] xl:text-[52px] leading-[1.05] font-black tracking-tight">{t('navegacion:brandTitle')}</h1>
        <p className="text-white/70 text-rt-18 mt-5 leading-relaxed">{t('navegacion:brandSub')}</p>
        <ul className="mt-10 grid grid-cols-2 gap-4">
          {rasgos.map(({ icon: Icon, texto }) => (
            <li key={texto} className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] border border-white/10 backdrop-blur px-4 py-3.5">
              <span className="w-9 h-9 rounded-[10px] bg-brand-d flex items-center justify-center shrink-0"><Icon size={18} className="text-white" /></span>
              <span className="text-white text-rt-14 font-semibold leading-snug">{texto}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative text-white/40 text-rt-12">© {new Date().getFullYear()} Rutyn</div>
    </aside>
  )
}
