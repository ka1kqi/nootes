import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  sessionReady: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayNameFromUser(user: User): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Student'
  )
}

async function ensureProfile(user: User): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('profiles').insert({
      id: user.id,
      display_name: displayNameFromUser(user),
      avatar_url: user.user_metadata?.avatar_url ?? null,
      email: user.email ?? null,
      aura: 0,
      tier: 'seedling',
      badges: [],
    })
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  // Load session on mount + subscribe to auth changes
  useEffect(() => {
    // onAuthStateChange is the single source of truth for auth state.
    // It fires INITIAL_SESSION immediately on subscribe, so we don't need
    // a separate getSession() call. We call setLoading(false) right after
    // syncing user/session — before any async profile work — so the
    // ProtectedRoute unblocks as soon as auth state is known.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        // Unblock rendering immediately — profile loads in the background
        setLoading(false)

        // sessionReady gates data-fetching hooks to prevent stale-token queries.
        // If there's no session, or a fresh token just arrived, mark ready immediately.
        if (!session || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSessionReady(true)
        } else if (event === 'INITIAL_SESSION' && session) {
          // Token may be expired — only mark ready if it's still valid.
          // If expired, Supabase auto-refreshes and fires TOKEN_REFRESHED.
          const expiresAt = session.expires_at ?? 0
          const isValid = expiresAt > Math.floor(Date.now() / 1000) + 5
          if (isValid) setSessionReady(true)
          // else: wait for TOKEN_REFRESHED to set sessionReady
        }

        if (session?.user) {
          try {
            await ensureProfile(session.user)
            const p = await fetchProfile(session.user.id)
            setProfile(p)
          } catch (err) {
            console.error('Failed to load profile:', err)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    })
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      sessionReady,
      signInWithGoogle,
      signInWithEmail,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Export raw context for the hook ─────────────────────────────────────────

export { AuthContext }
