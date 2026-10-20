import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Error_, Tabla, Tarjeta } from './ui'

type Dia = { dia: string; vistas: number; visitantes: number; iniciaron: number; registros: number }
type Grupo = { k: string; v: string; n: number; r: number }
type Recorrido = {
  visitor: string; primera: string; ultima: string; paginas: string[]; vistas: number
  clic: boolean; formulario: boolean; envio: boolean; registro: boolean; pago: boolean; botones: string[] | null
  device: string | null; tz: string | null; lang: string | null; fuente: string; campana: string | null
  cuenta: string | null; nombre: string | null; email: string | null; interno: boolean
}
type Profesor = {
  id: string; nombre: string | null; email: string | null; creado: string; origen: 'home' | 'oferta' | 'app'
  confirmado: boolean; perfil: boolean; plan: string | null; plan_status: string | null
  ultimo_ingreso: string | null; alumnos: number; fuente: string | null
}
type Datos = {
  dias: Dia[]
  total: { vistas: number; visitantes: number; clics: number; iniciaron: number; enviaron: number; registros: number; planes: number; equipo: number }
  grupos: Grupo[]
  recorridos: Recorrido[]
}
type Pagina = '' | 'home' | 'oferta'
const PAGINA: Record<string, string> = { home: 'Portada', oferta: 'Oferta', app: 'Directo en la app' }
const PLAN: Record<string, string> = { free: 'Gratis', basic: 'Básico', pro: 'Pro' }
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
const si = (v: boolean) => (v ? <span className="text-brand font-bold">✓</span> : <span className="text-grey-600">✗</span>)

// País aproximado según la zona horaria del navegador (no se guarda la IP).
const PAIS: Record<string, string> = {
  'America/Sao_Paulo': 'Brasil', 'America/Fortaleza': 'Brasil', 'America/Recife': 'Brasil', 'America/Bahia': 'Brasil', 'America/Manaus': 'Brasil',
  'America/Belem': 'Brasil', 'America/Cuiaba': 'Brasil', 'America/Campo_Grande': 'Brasil', 'America/Maceio': 'Brasil', 'America/Porto_Velho': 'Brasil',
  'America/Montevideo': 'Uruguay', 'America/Argentina/Buenos_Aires': 'Argentina', 'America/Buenos_Aires': 'Argentina', 'America/Argentina/Cordoba': 'Argentina',
  'America/Santiago': 'Chile', 'America/Bogota': 'Colombia', 'America/Lima': 'Perú', 'America/Asuncion': 'Paraguay', 'America/La_Paz': 'Bolivia',
  'America/Guayaquil': 'Ecuador', 'America/Caracas': 'Venezuela', 'America/Mexico_City': 'México', 'America/Monterrey': 'México', 'America/Tijuana': 'México',
  'America/Panama': 'Panamá', 'America/Costa_Rica': 'Costa Rica', 'America/Guatemala': 'Guatemala', 'America/Santo_Domingo': 'Rep. Dominicana',
  'America/New_York': 'Estados Unidos', 'America/Chicago': 'Estados Unidos', 'America/Denver': 'Estados Unidos', 'America/Los_Angeles': 'Estados Unidos',
  'Europe/Madrid': 'España', 'Europe/Lisbon': 'Portugal', 'Europe/London': 'Reino Unido', 'Atlantic/Canary': 'España',
}
const FUENTE: [RegExp, string][] = [
  [/google\./i, 'Google'], [/instagram|ig$/i, 'Instagram'], [/facebook|fb\.|fbclid|^fb$/i, 'Facebook'], [/whatsapp|wa\.me/i, 'WhatsApp'],
  [/youtube|youtu\.be/i, 'YouTube'], [/tiktok/i, 'TikTok'], [/bing\./i, 'Bing'], [/t\.co|twitter|x\.com/i, 'X / Twitter'], [/linkedin/i, 'LinkedIn'],
]
const nombreFuente = (v: string) => FUENTE.find(([r]) => r.test(v))?.[1] ?? v
const DISPOSITIVO: Record<string, string> = { mobile: 'Celular', desktop: 'Computadora', tablet: 'Tablet' }
const IDIOMA: Record<string, string> = { es: 'Español', pt: 'Portugués', en: 'Inglés' }
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—')

/** Suma las filas que terminan con el mismo nombre (varias zonas horarias de un mismo país, etc.). */
function agrupar(filas: Grupo[], nombre: (v: string) => string) {
  const m = new Map<string, { n: number; r: number }>()
  for (const f of filas) {
    const k = nombre(f.v)
    const x = m.get(k) ?? { n: 0, r: 0 }
    x.n += f.n; x.r += f.r
    m.set(k, x)
  }
  return [...m.entries()].map(([v, x]) => ({ v, ...x })).sort((a, b) => b.n - a.n)
}

function Lista({ titulo, filas, conRegistros = true, total }: { titulo: string; filas: { v: string; n: number; r: number }[]; conRegistros?: boolean; total: number }) {
  return (
    <div className="bg-surface-card border border-surface-line rounded-xl p-4">
      <h3 className="text-white text-rt-14 font-bold mb-3">{titulo}</h3>
      {filas.length === 0 && <div className="text-grey-500 text-rt-12">Sin datos todavía</div>}
      <ul className="flex flex-col gap-2">
        {filas.slice(0, 8).map((f) => (
          <li key={f.v}>
            <div className="flex items-center justify-between gap-3 text-rt-13">
              <span className="text-white truncate">{f.v}</span>
              <span className="text-grey-400 whitespace-nowrap">
                <b className="text-white">{f.n}</b>{conRegistros && <> · {f.r} reg. · {pct(f.r, f.n)}</>}
              </span>
            </div>
            <div className="h-1 mt-1 rounded bg-white/10 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${total ? (f.n / total) * 100 : 0}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Landing() {
  const [dias, setDias] = useState(30)
  const [pagina, setPagina] = useState<Pagina>('')
  const [d, setD] = useState<Datos | null>(null)
  const [profes, setProfes] = useState<Profesor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [soloRegistro, setSoloRegistro] = useState(false)

  useEffect(() => {
    setD(null); setError(null)
    const p = { p_dias: dias, p_pagina: pagina || null }
    supabase.rpc('landing_resumen', p).then(({ data, error: e }) => {
      if (e) setError(e.message); else setD(data as Datos)
    })
    // Profesores registrados: con "Todas" se ven también los que se registraron directo en la app.
    supabase.rpc('landing_profesores', p).then(({ data }) => setProfes((data as Profesor[]) ?? []))
  }, [dias, pagina])

  const chip = (activo: boolean) =>
    'px-3 h-9 rounded-lg text-rt-12 font-semibold border whitespace-nowrap ' + (activo ? 'bg-brand border-brand text-white' : 'border-grey-700 text-grey-400')

  const g = (k: string) => (d?.grupos ?? []).filter((x) => x.k === k)
  const t = d?.total
  const visitantes = t?.visitantes ?? 0
  const hoy = d?.dias.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {[[1, 'Hoy'], [7, '7 días'], [30, '30 días'], [90, '90 días']].map(([n, l]) => (
          <button key={n} className={chip(dias === n)} onClick={() => setDias(n as number)}>{l}</button>
        ))}
        <span className="w-px h-6 bg-grey-700 mx-1" />
        {([['', 'Todas'], ['home', 'Portada'], ['oferta', 'Oferta 50%']] as [Pagina, string][]).map(([v, l]) => (
          <button key={l} className={chip(pagina === v)} onClick={() => setPagina(v)}>{l}</button>
        ))}
        <span className="text-grey-500 text-rt-12 ml-auto">{pagina === 'oferta' ? 'rutyn.com.br/oferta · desde el 20/10/2026' : 'rutyn.com.br · se cuenta desde el 05/10/2026'}</span>
      </div>
      <Error_ msg={error} />
      {!d && !error && <div className="text-grey-500 text-rt-13">Cargando…</div>}
      {d && t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tarjeta label="Visitantes únicos" valor={t.visitantes} nota={dias > 1 && hoy ? `${hoy.visitantes} hoy` : 'personas distintas'} />
            <Tarjeta label="Páginas vistas" valor={t.vistas} nota={visitantes ? `${Math.round((t.vistas / visitantes) * 10) / 10} por visitante` : undefined} />
            <Tarjeta label="Registros completados" valor={t.registros} nota={`${pct(t.registros, visitantes)} de los visitantes`} />
            <Tarjeta label="Fueron a pagar un plan" valor={t.planes} nota="desde la calculadora" />
          </div>

          <div className="bg-surface-card border border-surface-line rounded-xl p-4">
            <h3 className="text-white text-rt-16 font-bold mb-1">Embudo</h3>
            <p className="text-grey-500 text-rt-12 mb-4">De cada persona que entra, cuántas llegan a cada paso.</p>
            <div className="flex flex-col gap-3">
              {[
                ['Entraron a la landing', t.visitantes],
                ['Tocaron algún botón', t.clics],
                ['Empezaron el formulario', t.iniciaron],
                ['Enviaron el formulario', t.enviaron],
                ['Confirmaron el correo (registro completo)', t.registros],
              ].map(([l, n]) => (
                <div key={l as string}>
                  <div className="flex items-center justify-between text-rt-13 mb-1">
                    <span className="text-white">{l}</span>
                    <span className="text-grey-400"><b className="text-white">{n}</b> · {pct(n as number, visitantes)}</span>
                  </div>
                  <div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${visitantes ? Math.min(100, ((n as number) / visitantes) * 100) : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          {dias > 1 && (
            <div className="bg-surface-card border border-surface-line rounded-xl p-4">
              <h3 className="text-white text-rt-16 font-bold mb-4">Por día</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={d.dias.map((x) => ({ dia: `${x.dia.slice(8, 10)}/${x.dia.slice(5, 7)}`, Visitantes: x.visitantes, 'Empezaron el formulario': x.iniciaron, Registros: x.registros }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="dia" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} labelStyle={{ color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="Visitantes" fill="#8BC34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Empezaron el formulario" fill="#E6A23C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Registros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Lista titulo="De dónde vienen" filas={agrupar(g('fuente'), nombreFuente)} total={visitantes} />
            <Lista titulo="Campañas (utm_campaign)" filas={agrupar(g('campana'), (v) => v)} total={visitantes} />
            <Lista titulo="País (aproximado)" filas={agrupar(g('zona'), (v) => PAIS[v] ?? v.replace(/^.*\//, '').replace(/_/g, ' '))} total={visitantes} />
            <Lista titulo="Dispositivo" filas={agrupar(g('dispositivo'), (v) => DISPOSITIVO[v] ?? v)} total={visitantes} />
            <Lista titulo="Idioma de la página" filas={agrupar(g('idioma'), (v) => IDIOMA[v] ?? v)} total={visitantes} />
            <Lista titulo="Botones más tocados" filas={agrupar(g('boton'), (v) => v)} conRegistros={false} total={Math.max(1, ...g('boton').map((x) => x.n))} />
          </div>
          <div>
            <h3 className="text-white text-rt-16 font-bold mb-1">Profesores registrados ({profes.length})</h3>
            <p className="text-grey-500 text-rt-12 mb-3">Quién se registró en el período, por dónde entró y qué hizo después en la app.</p>
            <Tabla<Profesor>
              rows={profes}
              vacio="Nadie se registró en este período"
              cols={[
                { label: 'Profesor', render: (r) => <div><div className="text-white">{r.nombre || '—'}</div><div className="text-grey-500 text-rt-11">{r.email}</div></div> },
                { label: 'Registro', render: (r) => fecha(r.creado) },
                { label: 'Entró por', render: (r) => <span className={r.origen === 'oferta' ? 'text-warning font-semibold' : ''}>{PAGINA[r.origen] ?? r.origen}</span> },
                { label: 'Origen', render: (r) => (r.fuente ? nombreFuente(r.fuente) : '—') },
                { label: 'Correo', render: (r) => si(r.confirmado) },
                { label: 'Perfil', render: (r) => si(r.perfil) },
                { label: 'Alumnos', render: (r) => r.alumnos },
                { label: 'Plan', render: (r) => <span className={r.plan && r.plan !== 'free' ? 'text-brand font-bold' : ''}>{PLAN[r.plan ?? 'free'] ?? r.plan}</span> },
                { label: 'Último ingreso', render: (r) => fecha(r.ultimo_ingreso) },
              ]}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-white text-rt-16 font-bold">Persona por persona</h3>
              <label className="flex items-center gap-2 text-grey-400 text-rt-12 ml-auto">
                <input type="checkbox" className="accent-brand" checked={soloRegistro} onChange={(e) => setSoloRegistro(e.target.checked)} />
                Solo los que empezaron el registro
              </label>
            </div>
            <p className="text-grey-500 text-rt-12 mb-3">
              Cada fila es un navegador (las últimas 300). Muestra hasta dónde llegó y, si se registró, quién es.
              Tus visitas aparecen como <b className="text-warning">Vos / equipo</b> y no suman en los números de arriba{t.equipo ? ` (${t.equipo} en este período)` : ''}.
              Para marcar un celular o navegador como tuyo, abrí una vez en él <b className="text-white">rutyn.com.br/?soy=equipo</b> (se desmarca con ?soy=visitante). Los navegadores donde entraste a WordPress quedan marcados solos.
            </p>
            <Tabla<Recorrido>
              rows={d.recorridos.filter((r) => !soloRegistro || r.formulario)}
              vacio="Sin visitas en este período"
              cols={[
                { label: 'Última visita', render: (r) => fecha(r.ultima) },
                { label: 'Página', render: (r) => r.paginas.map((p) => PAGINA[p] ?? p).join(' + ') },
                { label: 'Origen', render: (r) => <div>{nombreFuente(r.fuente)}{r.campana && <div className="text-grey-500 text-rt-11">{r.campana}</div>}</div> },
                { label: 'Dispositivo', render: (r) => <div>{DISPOSITIVO[r.device ?? ''] ?? '—'}<div className="text-grey-500 text-rt-11">{r.tz ? (PAIS[r.tz] ?? r.tz.replace(/^.*\//, '').replace(/_/g, ' ')) : ''}</div></div> },
                { label: 'Tocó botón', render: (r) => <span title={(r.botones ?? []).join(' · ')}>{si(r.clic)}</span> },
                { label: 'Empezó form.', render: (r) => si(r.formulario) },
                { label: 'Envió', render: (r) => si(r.envio) },
                { label: 'Confirmó', render: (r) => si(r.registro) },
                { label: 'Fue a pagar', render: (r) => si(r.pago) },
                { label: 'Quién es', render: (r) => (r.interno ? <span className="text-warning font-semibold">Vos / equipo</span> : r.nombre || r.email ? <div><div className="text-white">{r.nombre}</div><div className="text-grey-500 text-rt-11">{r.email}</div></div> : <span className="text-grey-600">Anónimo</span>) },
              ]}
            />
          </div>

          <p className="text-grey-500 text-rt-11">
            Sin cookies ni datos personales: cada navegador tiene un identificador al azar. No se cuentan tus propias visitas cuando estás logueado en WordPress, ni los robots.
            "reg." = registros completados de quienes llegaron por esa vía. El nombre de una persona aparece solo si se registró desde la landing (desde el 20/10/2026).
          </p>
        </>
      )}
    </div>
  )
}
