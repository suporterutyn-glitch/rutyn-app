import i18n from './i18n'

type ConCodigo = { message?: string; code?: string; error?: string } | string | null | undefined

// Mensaje conocido -> clave en errores.ts. Supabase responde en inglés y
// nuestras funciones SQL en portugués o español; el usuario lo ve en su idioma.
const REGLAS: [RegExp, string][] = [
  [/failed to fetch|networkerror|load failed|network request failed/i, 'offline'],
  [/invalid login credentials/i, 'invalidCredentials'],
  [/already (been )?registered|user_already_exists|email_exists/i, 'emailInUse'],
  [/password should be at least|weak_password/i, 'passwordShort'],
  [/different from the old password|same_password/i, 'samePassword'],
  [/email rate limit|over_email_send_rate_limit/i, 'tooManyEmails'],
  [/email not confirmed/i, 'emailNotConfirmed'],
  [/unable to validate email|invalid format|email_address_invalid/i, 'invalidEmail'],
  [/token has expired|otp_expired|link is invalid|invalid.*token/i, 'expiredLink'],
  [/jwt expired|auth session missing|not authenticated|invalid session|missing bearer/i, 'sessionExpired'],
  [/não vinculado|no pertenece a este profesor/i, 'notYourStudent'],
  [/rotina inexistente/i, 'routineNotFound'],
  [/convite inexistente/i, 'inviteGone'],
  [/entre 500 e 10\.000 ml/i, 'hydrationRange'],
  [/invalid plan or price/i, 'checkoutUnavailable'],
  [/duplicate key|already exists/i, 'duplicate'],
  [/violates foreign key/i, 'inUse'],
  [/row-level security|permission denied|only teachers/i, 'noPermission'],
]
const POR_CODIGO: Record<string, string> = { '23505': 'duplicate', '23503': 'inUse', '42501': 'noPermission', PGRST301: 'sessionExpired' }

/** Texto del error para mostrarle al usuario, en el idioma actual. */
export function mensajeError(e: ConCodigo | unknown): string {
  const x = e as ConCodigo
  const msg = typeof x === 'string' ? x : (x?.message || x?.error || '')
  const code = typeof x === 'object' && x ? x.code : undefined
  const espera = /after (\d+) seconds/i.exec(msg)
  if (espera) return i18n.t('errores:waitSeconds', { n: espera[1] })
  for (const [re, clave] of REGLAS) if (re.test(msg)) return i18n.t(`errores:${clave}`)
  if (code && POR_CODIGO[code]) return i18n.t(`errores:${POR_CODIGO[code]}`)
  if (!msg || /non-2xx status code/i.test(msg)) return i18n.t('errores:generic')
  return i18n.t('errores:genericDetail', { msg })
}

/** Para meter dentro de otro texto ("Erro ao salvar: …"): lo conocido, traducido; lo demás, tal cual. */
export function detalleError(e: ConCodigo | unknown): string {
  const x = e as ConCodigo
  const msg = typeof x === 'string' ? x : (x?.message || x?.error || '')
  const traducido = mensajeError(e)
  return traducido === i18n.t('errores:genericDetail', { msg }) ? msg : traducido
}

/**
 * Al pedir un correo (recuperar contraseña): solo se muestran los errores que
 * no dicen nada de la cuenta (límite de envíos, espera, sin conexión). El resto
 * se trata como enviado, para no revelar qué correos están registrados.
 */
export function errorDeEnvio(e: ConCodigo | unknown): string | null {
  const x = e as ConCodigo
  const msg = typeof x === 'string' ? x : (x?.message || x?.error || '')
  if (/rate limit|after \d+ seconds|failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return mensajeError(e)
  return null
}
