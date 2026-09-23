import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'teacher' | 'student' | null
export type AccountStatus = 'active' | 'deactivated' | 'deleting'
export type LinkStatus = 'none' | 'pending' | 'active' | 'suspended' | 'ended'

export type Profile = {
  id: string
  role: Role
  account_status: AccountStatus
  link_status: LinkStatus
  full_name: string | null
  email?: string | null
  country: string | null
  language: 'pt' | 'es' | null
  profile_complete: boolean
  teacher_id: string | null
  plan: 'free' | 'pro' | 'master' | 'elite' | null
  plan_expires_at: string | null
  marketplace_visible: boolean | null
  state?: string | null
  city?: string | null
  occupation?: string | null
  specialties?: string[] | null
  ideal_clients?: string[] | null
  work_formats?: string[] | null
  bio?: string | null
  bank_holder?: string | null
  bank_name?: string | null
  bank_agency?: string | null
  bank_account?: string | null
  pix_key?: string | null
  avatar_url?: string | null
  phone?: string | null
  created_at?: string | null
}

type AuthCtx = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    // Sin perfil los guardas expulsan a /identificacao, asi que un fallo mudo
    // aparece como "login que no entra". Dejar rastro.
    if (error) console.error('No se pudo cargar el perfil:', error.message)
    setProfile((data as Profile | null) ?? null)
  }

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    await loadProfile(session?.user.id)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // El perfil llega un tick mas tarde que la sesion. Sin esto, los guardas
      // ven sesion + profile null y expulsan al usuario recien logueado.
      setLoading(true)
      // supabase-js holds an internal lock during this callback; calling back
      // into the client from inside it deadlocks. Defer to the next tick.
      setTimeout(() => {
        void loadProfile(s?.user.id).finally(() => setLoading(false))
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
