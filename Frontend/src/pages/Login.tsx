import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import logoImg from '../assets/logo.png'
import { KaTeX } from '../components/KaTeX'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* Login Page                                                          */
/* Google OAuth login with .edu verification for school features       */
/* Bauhaus geometric composition with warm botanical palette           */
/* ------------------------------------------------------------------ */

const floatingEquations = [
  { math: 'e^{i\\pi} + 1 = 0', x: '8%', y: '18%', delay: '0s', size: 'text-xs' },
  { math: '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}', x: '72%', y: '12%', delay: '0.5s', size: 'text-[10px]' },
  { math: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', x: '5%', y: '72%', delay: '1s', size: 'text-[11px]' },
  { math: 'H\\psi = E\\psi', x: '80%', y: '68%', delay: '1.5s', size: 'text-xs' },
  { math: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', x: '65%', y: '85%', delay: '0.8s', size: 'text-[10px]' },
  { math: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}', x: '12%', y: '45%', delay: '1.2s', size: 'text-[10px]' },
]

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/chat'

  // Redirect authenticated users (handles post-OAuth callback)
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showEduPrompt, setShowEduPrompt] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleGoogleSignIn() {
    setAuthError(null)
    await signInWithGoogle()
    // Redirect happens via OAuth callback
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setAuthError(null)
    setAuthLoading(true)
    const fn = mode === 'signup' ? signUp : signInWithEmail
    const { error } = await fn(email, password)
    setAuthLoading(false)
    if (error) {
      setAuthError(error)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <main className="min-h-screen bg-cream flex relative overflow-hidden">
      {/* Floating equations background */}
      {floatingEquations.map((eq, i) => (
        <div
          key={i}
          className={`absolute opacity-[0.06] ${eq.size} animate-float pointer-events-none select-none`}
          style={{
            left: eq.x,
            top: eq.y,
            animationDelay: eq.delay,
            animationDuration: `${4 + i * 0.7}s`,
          }}
        >
          <KaTeX math={eq.math} />
        </div>
      ))}

      {/* Decorative geometric shapes */}
      <svg className="absolute top-0 right-0 w-[500px] h-[500px] opacity-[0.03] pointer-events-none" viewBox="0 0 500 500" fill="none">
        <circle cx="400" cy="100" r="200" stroke="#264635" strokeWidth="1" />
        <circle cx="400" cy="100" r="140" stroke="#A3B18A" strokeWidth="0.5" />
        <rect x="300" y="0" width="200" height="200" stroke="#264635" strokeWidth="0.5" fill="none" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.03] pointer-events-none" viewBox="0 0 400 400" fill="none">
        <polygon points="0,400 200,0 400,400" stroke="#A3B18A" strokeWidth="1" fill="none" />
        <circle cx="200" cy="300" r="80" stroke="#264635" strokeWidth="0.5" />
      </svg>

      {/* Left decorative panel — visible on larger screens */}
      <div className="hidden lg:flex w-[45%] bg-forest relative items-center justify-center overflow-hidden">
        {/* Inner geometric pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 600 800" fill="none">
          <line x1="0" y1="0" x2="600" y2="800" stroke="#A3B18A" strokeWidth="0.5" />
          <line x1="600" y1="0" x2="0" y2="800" stroke="#A3B18A" strokeWidth="0.5" />
          <circle cx="300" cy="400" r="250" stroke="#E9E4D4" strokeWidth="0.5" />
          <circle cx="300" cy="400" r="180" stroke="#A3B18A" strokeWidth="0.5" />
          <circle cx="300" cy="400" r="110" stroke="#E9E4D4" strokeWidth="0.5" />
          <rect x="100" y="200" width="400" height="400" stroke="#A3B18A" strokeWidth="0.3" fill="none" />
        </svg>

        <div className="relative z-10 px-12 max-w-md stagger">
          <Link to="/" className="logo-wave logo-wave-lg flex mb-10">
            <span className="font-[family-name:var(--font-display)] text-[5.5rem] text-parchment leading-[0.85] flex">
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </span>
          </Link>

          <svg className="w-24 mb-6" viewBox="0 0 200 20" fill="none">
            <path d="M0 10 C 16 2, 32 18, 48 10 C 64 2, 80 18, 96 10 C 112 2, 128 18, 144 10 C 160 2, 176 18, 200 10" stroke="#A3B18A" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          </svg>

          <p className="font-[family-name:var(--font-display)] text-3xl text-parchment/70 leading-snug mb-6">
            merge ideas,<br />not just text
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm text-sage/50 leading-relaxed mb-10">
            Join the community that's building the world's best nootes — together. Write, fork, merge, and learn.
          </p>

          {/* Testimonial card */}
          <div className="bg-parchment/[0.06] border border-parchment/[0.08] squircle-xl p-5">
            <p className="font-[family-name:var(--font-display)] text-lg text-parchment/40 leading-relaxed mb-4">
              "I used to spend hours writing notes that disappeared after the semester. Now they compound."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sage/30 flex items-center justify-center text-[10px] text-parchment font-medium">PK</div>
              <div>
                <span className="font-[family-name:var(--font-body)] text-xs text-parchment/60 block">Priya K.</span>
                <span className="font-mono text-[9px] text-sage/40">NYU · CS · 1,240 aura</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-8">
            {[
              { value: '3.2k', label: 'contributors' },
              { value: '487', label: 'nootbooks' },
              { value: '98%', label: 'merge rate' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <span className="font-[family-name:var(--font-display)] text-2xl text-parchment/70 block">{s.value}</span>
                <span className="font-mono text-[8px] text-sage/40 tracking-[0.2em] uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-sm stagger">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <img src={logoImg} alt="Nootes" style={{ width: 36, height: 36 }} />
            <Link to="/" className="logo-wave flex">
              <span className="font-[family-name:var(--font-display)] text-3xl text-forest flex">
                {'nootes'.split('').map((letter, i) => (
                  <span key={i} className="wave-letter">{letter}</span>
                ))}
              </span>
            </Link>
          </div>

          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">WELCOME BACK</span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl text-forest mb-2 leading-tight">Sign in</h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-forest/45 mb-10">
            Pick up where you left off — your nootes are waiting.
          </p>

          {/* Google Sign-In button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-forest text-parchment px-6 py-3.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-all shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)] group"
          >
            <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#E9E4D4" fillOpacity="0.9" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#A3B18A" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#D4A843" fillOpacity="0.8" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#E9E4D4" fillOpacity="0.7" />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-forest/10" />
            <span className="font-mono text-[10px] text-forest/25 tracking-wider">OR</span>
            <div className="flex-1 h-px bg-forest/10" />
          </div>

          {/* Email fallback */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.15em] uppercase block mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setShowEduPrompt(e.target.value.length > 3 && !e.target.value.endsWith('.edu'))
                }}
                placeholder="you@university.edu"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-3 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
              {showEduPrompt && (
                <p className="font-mono text-[10px] text-amber/70 mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  Use a .edu email for school-specific nootbooks
                </p>
              )}
            </div>

            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.15em] uppercase block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-3 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>

            {authError && (
              <p className="font-mono text-[10px] text-amber/80 flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                {authError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={authLoading}
                className="flex-1 bg-forest/[0.06] text-forest px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest/[0.1] transition-all border border-forest/10 disabled:opacity-50"
              >
                {authLoading ? 'Loading…' : mode === 'signup' ? 'Create Account' : 'Continue with Email'}
              </button>
              <button
                type="button"
                onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
                className="font-mono text-[10px] text-forest/30 hover:text-forest/50 transition-colors whitespace-nowrap"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Fine print */}
          <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/25 text-center mt-8 leading-relaxed">
            By signing in, you agree to our{' '}
            <span className="underline hover:text-forest/40 cursor-pointer transition-colors">Terms of Service</span>{' '}
            and{' '}
            <span className="underline hover:text-forest/40 cursor-pointer transition-colors">Privacy Policy</span>.
          </p>

          {/* .edu benefits callout */}
          <div className="mt-8 bg-sage/[0.06] border border-sage/15 squircle-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
              <span className="font-[family-name:var(--font-display)] text-lg text-sage">Student?</span>
            </div>
            <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 leading-relaxed">
              Sign in with your <span className="font-mono text-sage/70">.edu</span> email to unlock class nootbooks, school channels, and campus leaderboards.
            </p>
          </div>

          {/* Back to landing */}
          <div className="mt-8 text-center">
            <Link to="/" className="font-[family-name:var(--font-body)] text-xs text-forest/30 hover:text-forest/60 transition-colors inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              Back to nootes
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
