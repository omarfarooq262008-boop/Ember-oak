import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  is_admin: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: {
    full_name?: string
    phone?: string
  }) => Promise<{ ok: true } | { ok: false; message: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, is_admin')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(uid)
    setProfile(p)
  }, [session?.user?.id])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      return
    }
    void fetchProfile(session.user.id).then(setProfile)
  }, [session?.user?.id])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!supabase) {
        return { ok: false as const, message: 'Accounts are not configured.' }
      }
      if (password.length < 8) {
        return {
          ok: false as const,
          message: 'Password must be at least 8 characters.',
        }
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      })
      if (error) {
        return { ok: false as const, message: error.message }
      }
      return { ok: true as const }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { ok: false as const, message: 'Accounts are not configured.' }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      return { ok: false as const, message: error.message }
    }
    return { ok: true as const }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (patch: { full_name?: string; phone?: string }) => {
      if (!supabase || !session?.user?.id) {
        return { ok: false as const, message: 'Not signed in.' }
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          ...(patch.full_name !== undefined
            ? { full_name: patch.full_name }
            : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
      if (error) {
        return { ok: false as const, message: error.message }
      }
      await refreshProfile()
      return { ok: true as const }
    },
    [session?.user?.id, refreshProfile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
