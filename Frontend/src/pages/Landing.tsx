import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import logoImg from '../assets/logo.png'
import { KaTeX } from '../components/KaTeX'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* Landing Page — public marketing, logged-out users only             */
/* Single viewport (no scroll). Two-column layout: hero left,         */
/* interactive preview card right.                                    */
/* Redirect to /home if already authenticated.                        */
/* ------------------------------------------------------------------ */

// ── Preview tabs ─────────────────────────────────────────────────────

const PREVIEW_TABS = ['Write', 'Merge', 'Study'] as const
type PreviewTab = typeof PREVIEW_TABS[number]

function WritePreview() {
  return (
    <div>
      <div className="bg-forest/[0.03] border-l-4 border-sage p-4 squircle-sm">
        <KaTeX math="V^*(s) = \max_{a} \left[ R(s, a) + \gamma \sum_{s'} P(s' | s, a) \, V^*(s') \right]" display />
      </div>
      <p className="font-[family-name:var(--font-display)] text-sm text-sage/50 mt-2">
        Type LaTeX, chemistry, code — renders as you write
      </p>
    </div>
  )
}

function MergePreview() {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 bg-forest/[0.03] border border-forest/10 squircle-sm p-2.5">
          <span className="font-mono text-[8px] text-forest/25 tracking-wider block mb-1">CONTRIBUTOR A</span>
          <p className="font-[family-name:var(--font-body)] text-xs text-forest/60 leading-relaxed">
            "Chain rule: d/dx[f(g(x))] = f′(g(x)) · g′(x)"
          </p>
        </div>
        <div className="flex-1 bg-forest/[0.03] border border-forest/10 squircle-sm p-2.5">
          <span className="font-mono text-[8px] text-forest/25 tracking-wider block mb-1">CONTRIBUTOR B</span>
          <p className="font-[family-name:var(--font-body)] text-xs text-forest/60 leading-relaxed">
            "Differentiate outer first, then multiply by inner's derivative."
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-sage/20" />
        <span className="font-mono text-[8px] text-sage/50 tracking-wider">AI MERGE</span>
        <svg className="w-3 h-3 text-sage/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <div className="flex-1 h-px bg-sage/20" />
      </div>
      <div className="bg-sage/[0.07] border border-sage/20 squircle-sm p-2.5">
        <span className="font-mono text-[8px] text-sage/50 tracking-wider block mb-1">SYNTHESIZED</span>
        <p className="font-[family-name:var(--font-body)] text-xs text-forest/70 leading-relaxed">
          "Chain rule: d/dx[f(g(x))] = f′(g(x))·g′(x). Differentiate the outer at the inner, multiply by inner's derivative."
        </p>
      </div>
      <p className="font-[family-name:var(--font-display)] text-sm text-sage/50">
        AI merges ideas from every contributor
      </p>
    </div>
  )
}

function StudyPreview() {
  const cards = [
    { q: 'What is the chain rule?', a: 'd/dx[f(g(x))] = f′(g(x)) · g′(x)' },
    { q: 'When do you use it?', a: 'Any time you differentiate a composite function.' },
  ]
  return (
    <div className="space-y-2">
      {cards.map((c, i) => (
        <div key={i} className="bg-forest/[0.03] border border-forest/10 squircle-sm p-3">
          <p className="font-[family-name:var(--font-body)] text-xs font-medium text-forest/80 mb-1">Q: {c.q}</p>
          <p className="font-[family-name:var(--font-body)] text-xs text-forest/45 leading-relaxed border-t border-forest/[0.05] pt-1">A: {c.a}</p>
        </div>
      ))}
      <p className="font-[family-name:var(--font-display)] text-sm text-sage/50">
        Generate flashcards and practice exams instantly
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function Landing() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<PreviewTab>('Write')

  // Redirect authenticated users to /home
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-cream/80 backdrop-blur-sm border-b border-forest/[0.06] z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="logo-wave flex items-center gap-1.5">
            <img src={logoImg} alt="Nootes logo" style={{ width: 36, height: 36 }} />
            <span className="font-[family-name:var(--font-display)] text-2xl text-forest flex">
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/repos"
              className="font-[family-name:var(--font-body)] text-sm text-forest/55 hover:text-forest transition-colors px-3 py-1.5"
            >
              Explore
            </Link>
            <Link
              to="/diff"
              className="font-[family-name:var(--font-body)] text-sm text-forest/55 hover:text-forest transition-colors px-3 py-1.5"
            >
              How it works
            </Link>
            <div className="h-4 w-px bg-forest/15 mx-1" />
            <Link
              to="/login"
              className="font-[family-name:var(--font-body)] text-sm text-forest/65 hover:text-forest transition-colors px-3 py-1.5 border border-forest/15 squircle-sm hover:border-forest/25"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="font-[family-name:var(--font-body)] text-sm bg-forest text-parchment px-4 py-1.5 squircle-sm hover:bg-forest-deep transition-colors"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Body — two columns ───────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* LEFT — Hero ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-12 xl:px-20 relative">
          {/* Decorative doodle */}
          <svg className="absolute bottom-12 left-8 w-36 h-36 opacity-[0.05] pointer-events-none" viewBox="0 0 150 150" fill="none">
            <path d="M20 130 Q40 20 130 50" stroke="#A3B18A" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M40 120 Q70 60 120 80" stroke="#264635" strokeWidth="1" strokeLinecap="round" />
          </svg>

          <div className="relative z-10 max-w-lg">
            <span className="font-mono text-[9px] text-sage/55 tracking-[0.4em] uppercase block mb-4">
              COLLABORATIVE KNOWLEDGE PLATFORM
            </span>

            <h1 className="logo-wave logo-wave-lg font-[family-name:var(--font-display)] text-[5.5rem] leading-[0.82] text-forest tracking-tight mb-5 flex cursor-default">
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </h1>

            <p className="font-[family-name:var(--font-body)] text-lg text-forest/60 leading-relaxed mb-3 max-w-md">
              Upload documents, share knowledge, build collective understanding — together.
            </p>

            <p className="font-[family-name:var(--font-display)] text-xl text-sage/40 mb-8">
              merge ideas, not just text ✦
            </p>

            {/* CTA buttons */}
            <div className="flex items-center gap-3">
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)]"
              >
                Open the Editor
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/repos"
                className="inline-flex items-center gap-2 border border-forest/20 text-forest px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest/[0.04] transition-colors"
              >
                Browse Nootbooks
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT — Preview card ──────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-8 xl:px-12 relative">
          {/* Decorative circle */}
          <svg className="absolute top-8 right-8 w-48 h-48 opacity-[0.05] pointer-events-none" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="#264635" strokeWidth="1" />
            <circle cx="100" cy="100" r="50" stroke="#A3B18A" strokeWidth="1" />
          </svg>

          <div className="bg-parchment border border-forest/10 p-6 squircle-xl shadow-[0_4px_40px_-12px_rgba(38,70,53,0.09)] w-full max-w-md">
            {/* Card header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sage" />
                <span className="font-mono text-[9px] text-forest/40 tracking-wider uppercase">WHAT NOOTES CAN DO</span>
              </div>
              {/* Tab buttons */}
              <div className="flex items-center gap-1">
                {PREVIEW_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`font-mono text-[8px] tracking-wider px-2 py-1 squircle-sm transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-forest text-parchment'
                        : 'text-forest/30 hover:text-forest hover:bg-forest/[0.06]'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div key={activeTab} className="animate-tab-enter">
              {activeTab === 'Write' && <WritePreview />}
              {activeTab === 'Merge' && <MergePreview />}
              {activeTab === 'Study' && <StudyPreview />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-forest/[0.07]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src={logoImg} alt="Nootes logo" style={{ width: 24, height: 24 }} />
            <span className="font-[family-name:var(--font-display)] text-base text-forest/50">nootes</span>
          </div>
          <p className="font-mono text-[9px] text-forest/35 tracking-wider">Built for learners, by learners.</p>
          <div className="flex items-center gap-4">
            <Link to="/repos" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">EXPLORE</Link>
            <Link to="/diff" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">HOW IT WORKS</Link>
            <Link to="/login" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">SIGN IN</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
