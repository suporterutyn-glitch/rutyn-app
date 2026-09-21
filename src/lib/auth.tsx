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

  async function loadProfile(userId: string) {
    try {
      // NOTE: Avoid RLS recursion by not loading profile here.
      // The profile is created by trigger when user signs up.
      // Components that need profile can fetch it as needed.
      setProfile(null)
    } catch (err) {
      console.error('Error in loadProfile:', err)
      setProfile(null)
    }
  }

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    // Don't load profile here to avoid RLS recursion
    setProfile(null)
    setLoading(false)
  }

  useEffect(() => {
    // Try to restore session from localStorage first
    if (typeof window !== 'undefined') {
      const tokenKey = Object.keys(localStorage).find(k => k.includes('auth'))
      if (tokenKey) {
        try {
          const tokenData = JSON.parse(localStorage.getItem(tokenKey) || '{}')
          if (tokenData.user) {
            // Create a minimal session object from localStorage
            setSession({
              access_token: tokenData.access_token,
              token_type: 'bearer',
              expires_in: tokenData.expires_in,
              expires_at: tokenData.expires_at,
              refresh_token: tokenData.refresh_token,
              user: tokenData.user,
            } as any)
            setLoading(false)
            return
          }
        } catch {
          // Fall through to refresh()
        }
      }
    }

    void refresh()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // Don't load profile on auth state change to avoid RLS recursion
      setProfile(null)
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

export async function getProfileUnsafe(userId: string) {
  try {
    // Fetch profile using anon key to avoid RLS issues
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    return (data[0] as Profile | null) ?? null
  } catch {
    return null
  }
}
