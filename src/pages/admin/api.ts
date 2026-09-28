import { supabase } from '@/lib/supabase'

export async function adminApi<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', { body: { action, ...payload } })
  if (error) {
    const ctx = (error as any).context
    const msg = ctx?.json ? (await ctx.json().catch(() => null))?.error : null
    throw new Error(msg ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data as T
}

export type Perfil = {
  id: string
  role: 'teacher' | 'student'
  account_status: string
  full_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  language: string | null
  gender: string | null
  teacher_id: string | null
  link_status: string | null
  plan: string | null
  plan_seats: number | null
  plan_status: string | null
  plan_cancel_at_period_end: boolean | null
  stripe_subscription_id: string | null
  created_at: string
}

export const CAMPOS_PERFIL =
  'id,role,account_status,full_name,email,phone,country,language,gender,teacher_id,link_status,plan,plan_seats,plan_status,plan_cancel_at_period_end,stripe_subscription_id,created_at'

export const nombrePlan = (p: string | null) => (p === 'basic' ? 'Básico' : p === 'pro' ? 'Pro' : 'Gratis')
export const fecha = (s: string | number) => new Date(typeof s === 'number' ? s * 1000 : s).toLocaleDateString('es-ES')
export const dinero = (centavosOValor: number, moneda: string, enCentavos = false) =>
  (enCentavos ? centavosOValor / 100 : centavosOValor).toLocaleString(moneda.toUpperCase() === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: moneda.toUpperCase(),
  })
