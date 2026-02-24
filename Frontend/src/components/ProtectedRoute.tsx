/**
 * @file ProtectedRoute.tsx
 * Route guard that redirects unauthenticated users to `/login`.
 * While the auth session is loading, a full-screen spinner is shown so
 * the page does not flash the protected content before the check completes.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Wraps a route's children with authentication enforcement.
 *
 * - While `loading` is true, shows a centred spinner.
 * - If `user` is `null`, redirects to `/login` preserving the intended
 *   destination in `location.state.from` so the login page can redirect back.
 * - Otherwise, renders `children` as-is.
 *
 * @param children - The protected route content to render when authenticated.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
          <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase">Loading</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
