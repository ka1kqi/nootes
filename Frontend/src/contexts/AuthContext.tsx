/**
 * AuthContext — global authentication state for the Nootes app.
 *
 * Wraps Supabase Auth and exposes the current user, session, profile,
 * loading state, and auth action helpers. Consumed via {@link useAuth}.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape of the value provided by {@link AuthProvider}.
 * All auth state and actions are available here via {@link useAuth}.
 */
interface AuthContextValue {
  /** The currently authenticated Supabase user, or null when signed out. */
  user: User | null
  /** The user's Nootes profile row from the `profiles` table, or null. */
  profile: Profile | null
  /** The active Supabase session (contains access token, expiry, etc.), or null. */
  session: Session | null
  /** True while the initial auth state is being determined on mount. */
  loading: boolean
  /**
   * Incrementing counter that gates data-fetching hooks.
   * Increments on SIGNED_IN and TOKEN_REFRESHED so dependent effects
   * re-fire even when a token is silently refreshed after tab focus.
   */
  sessionReady: number
  /** Initiates Google OAuth sign-in via Supabase, redirecting to /home on success. */
  signInWithGoogle: () => Promise<void>
  /** Signs in with email/password. Returns `{ error }` on failure. */
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  /** Registers a new account with email/password. Returns `{ error }` on failure. */
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  /** Signs out the current user and clears local profile state. */
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

/** React context holding auth state; consumed through {@link useAuth}. */
const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derives a display name from a Supabase user's metadata.
 * Prefers `full_name` → `name` → email prefix → fallback 'Student'.
 */
function displayNameFromUser(user: User): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Student'
  )
}

/**
 * Creates the `profiles` row for a new user if it does not already exist.
 * Runs after every sign-in to handle first-time OAuth users.
 */
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

/** Fetches the full profile row for `userId` from the `profiles` table. */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides authentication state and actions to the entire React tree.
 * Must wrap every component that calls {@link useAuth}.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(0)

  // Load session on mount + subscribe to auth changes
  useEffect(() => {
    // onAuthStateChange is the single source of truth for auth state.
    // It fires INITIAL_SESSION immediately on subscribe, so we don't need
    // a separate getSession() call. We call setLoading(false) right after
    // syncing user/session — before any async profile work — so the
    // ProtectedRoute unblocks as soon as auth state is known.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      /** Fired on every auth state transition; syncs React state then loads the user's profile. */
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        // Unblock rendering immediately — profile loads in the background
        setLoading(false)

        // sessionReady is an incrementing counter that gates data-fetching hooks.
        // Using a counter (not boolean) ensures every TOKEN_REFRESHED increments
        // the value, triggering re-fetches even when the tab regains focus after
        // a token expiry — a boolean set-to-true would be a no-op in that case.
        if (!session || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSessionReady(v => v + 1)
        } else if (event === 'INITIAL_SESSION' && session) {
          // Token may be expired — only increment if it's still valid.
          // If expired, Supabase auto-refreshes and fires TOKEN_REFRESHED.
          const expiresAt = session.expires_at ?? 0
          const isValid = expiresAt > Math.floor(Date.now() / 1000) + 5
          if (isValid) setSessionReady(v => v + 1)
          // else: wait for TOKEN_REFRESHED to increment
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

    // Detach the auth listener when the provider unmounts to prevent memory leaks
    return () => subscription.unsubscribe()
  }, [])

  /** Reload the page when the tab regains visibility to re-hydrate expired sessions. */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') window.location.reload()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    // Remove the visibility listener when the provider unmounts
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  /** Initiates Google OAuth flow; redirects back to /home after success. */
  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    })
  }, [])

  /** Signs in with email + password. Returns `{ error: message }` on failure. */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  /** Creates a new account with email + password. Returns `{ error: message }` on failure. */
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  /** Signs out the current user and clears profile state. */
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

/** Raw context reference; prefer the {@link useAuth} hook instead. */
export { AuthContext }
