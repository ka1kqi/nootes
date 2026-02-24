/**
 * useAuth — convenience hook for consuming {@link AuthContext}.
 *
 * Provides access to the current user, session, profile, loading state,
 * and all auth action helpers (signIn, signUp, signOut, etc.).
 * Must be called within an {@link AuthProvider}.
 */
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

/**
 * Returns the current authentication context value.
 * @throws If called outside of `<AuthProvider>`.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
