import type { TFunction } from 'i18next'
import i18n from './i18n'
import avisos from '@/i18n/avisos'
import { localeDe } from './fechas'
import { planVisible } from './plans'

type Textos = typeof avisos.pt
export type ClaveAviso = { [K in keyof Textos]: Textos[K] extends { title: string } ? K : never }[keyof Textos]
export type DatosAviso = Record<string, string | number | null | undefined>

// Quién manda cada aviso: sin nombre, se muestra "Seu professor" o "Aluno".
const DEL_ALUMNO = new Set<ClaveAviso>(['paymentDeclared', 'changeAccepted', 'changeRejected', 'counterAccepted', 'newInvite', 'anamnesisDone'])

function completar(t: TFunction, clave: ClaveAviso, datos: DatosAviso, lang: string) {
  const p: Record<string, unknown> = { ...datos }
  if (!p.who) p.who = t(DEL_ALUMNO.has(clave) ? 'avisos:student' : 'avisos:teacher')
  if (p.plan) p.plan = t(`planes:name.${planVisible(String(p.plan))}`)
  if (p.fmt) p.per = t(`avisos:per.${p.fmt === 'monthly' ? 'monthly' : 'hourly'}`)
  if (p.at) p.when = new Date(String(p.at)).toLocaleString(localeDe(lang), { dateStyle: 'short', timeStyle: 'short' })
  return { ...p, interpolation: { escapeValue: false } }
}

/**
 * Fila lista para `notifications`: guarda la clave y los datos en `data`
 * y, como respaldo, el texto en portugués en title/body.
 */
export function aviso(clave: ClaveAviso, datos: DatosAviso = {}) {
  const t = i18n.getFixedT('pt')
  const p = completar(t, clave, datos, 'pt')
  return {
    title: t(`avisos:${clave}.title`, p) as string,
    body: t(`avisos:${clave}.body`, p) as string,
    data: { key: clave, params: datos },
  }
}

/** Título y cuerpo de un aviso en el idioma actual. */
export function textoAviso(
  n: { title: string; body: string | null; data?: { key?: string; params?: DatosAviso } | null },
  t: TFunction, lang: string,
) {
  const clave = n.data?.key as ClaveAviso | undefined
  if (!clave || !(clave in avisos.pt)) return { title: n.title, body: n.body }
  const p = completar(t, clave, n.data?.params ?? {}, lang)
  return { title: t(`avisos:${clave}.title`, p) as string, body: t(`avisos:${clave}.body`, p) as string }
}
