// Texto de un aviso sin depender de i18next: lo usa el service worker para mostrar
// las notificaciones del celular en el idioma del usuario.
import avisos from '@/i18n/avisos'

export type Idioma = 'pt' | 'es' | 'en'

/** Avisos que manda el alumno: sin nombre, "who" es "Aluno"; en el resto, "Seu professor". */
export const DEL_ALUMNO = new Set(['chargeOverdueTeacher', 'paymentDeclared', 'changeAccepted', 'changeRejected', 'counterAccepted', 'newInvite', 'anamnesisDone', 'joinedByLink'])

const PLAN: Record<string, Record<Idioma, string>> = {
  free: { pt: 'Grátis', es: 'Gratis', en: 'Free' },
  basic: { pt: 'Básico', es: 'Básico', en: 'Basic' },
  pro: { pt: 'Pro', es: 'Pro', en: 'Pro' },
}
const LOCALE: Record<Idioma, string> = { pt: 'pt-BR', es: 'es', en: 'en-US' }

export function textoPlano(lang: string | undefined, clave: string | undefined, datos: Record<string, unknown> = {}) {
  const idioma: Idioma = lang === 'es' || lang === 'en' ? lang : 'pt'
  const t = avisos[idioma] as unknown as Record<string, unknown>
  const item = clave ? (t[clave] as { title?: string; body?: string } | undefined) : undefined
  if (!item?.title) return null
  const p: Record<string, unknown> = { ...datos }
  if (!p.who) p.who = t[DEL_ALUMNO.has(clave!) ? 'student' : 'teacher']
  if (p.plan) p.plan = PLAN[String(p.plan)]?.[idioma] ?? p.plan
  if (p.fmt) p.per = (t.per as Record<string, string>)[p.fmt === 'monthly' ? 'monthly' : 'hourly']
  if (p.at) {
    const d = new Date(String(p.at))
    if (!isNaN(d.getTime())) p.when = d.toLocaleString(LOCALE[idioma], { dateStyle: 'short', timeStyle: 'short' })
  }
  const poner = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(p[k] ?? ''))
  return { title: poner(item.title), body: poner(item.body ?? '') }
}
