import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'
import { SpotlightSearch } from '../components/SpotlightSearch'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* HomeV4 — "The Workshop"                                             */
/* Focus on creation and collaboration. Shows live activity, active    */
/* editors, recent contributions. The search sits in a horizontal     */
/* toolbar strip. Below: workspace cards showing what people are       */
/* working on. Feels alive, collaborative, purposeful.                 */
/* ------------------------------------------------------------------ */

interface WorkspaceCard {
  title: string
  subject: string
  editors: { name: string; color: string }[]
  status: 'active' | 'review' | 'merged'
  latex?: string
  code?: string
  excerpt?: string
  changes: number
}

const WORKSPACES: WorkspaceCard[] = [
  {
    title: 'Calculus II — Final Review',
    subject: 'Mathematics',
    editors: [{ name: 'PK', color: '#D4A843' }, { name: 'NB', color: '#5C7A6B' }],
    status: 'active',
    latex: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
    changes: 14,
  },
  {
    title: 'Sorting Algorithms Cheat Sheet',
    subject: 'Computer Science',
    editors: [{ name: 'JL', color: '#264635' }, { name: 'DC', color: '#4A6741' }, { name: 'RT', color: '#8B6E4E' }],
    status: 'active',
    code: 'def quicksort(arr, lo, hi):\n    if lo < hi:\n        p = partition(arr, lo, hi)\n        quicksort(arr, lo, p - 1)\n        quicksort(arr, p + 1, hi)',
    changes: 23,
  },
  {
    title: 'Quantum Mechanics — Wave Functions',
    subject: 'Physics',
    editors: [{ name: 'LC', color: '#5C7A6B' }],
    status: 'review',
    latex: '\\hat{H}|\\psi\\rangle = E|\\psi\\rangle',
    excerpt: 'The time-independent Schrödinger equation relates the Hamiltonian operator to energy eigenvalues.',
    changes: 8,
  },
  {
    title: 'Ethics of AI Consciousness',
    subject: 'Philosophy',
    editors: [{ name: 'AS', color: '#8B6E4E' }, { name: 'MP', color: '#264635' }],
    status: 'merged',
    excerpt: 'If an artificial system were to achieve phenomenal consciousness, what moral obligations would we have toward it? This collection explores frameworks from functionalism to panpsychism.',
    changes: 31,
  },
  {
    title: 'Bayesian Inference',
    subject: 'Statistics',
    editors: [{ name: 'NB', color: '#D4A843' }],
    status: 'active',
    latex: 'P(\\theta|D) = \\frac{P(D|\\theta) P(\\theta)}{P(D)}',
    changes: 6,
  },
  {
    title: 'RSA & Asymmetric Crypto',
    subject: 'Computer Science',
    editors: [{ name: 'DC', color: '#4A6741' }, { name: 'KA', color: '#264635' }],
    status: 'review',
    code: 'encrypt = lambda m: pow(m, e, n)\ndecrypt = lambda c: pow(c, d, n)',
    changes: 17,
  },
]

const STATUS_STYLES = {
  active: { bg: 'bg-sage/15', text: 'text-sage', label: 'Active', indicator: 'bg-sage' },
  review: { bg: 'bg-amber/10', text: 'text-amber', label: 'In Review', indicator: 'bg-amber' },
  merged: { bg: 'bg-forest/10', text: 'text-forest/50', label: 'Merged', indicator: 'bg-forest/40' },
}

export default function HomeV4() {
  const { profile } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">
      <Navbar variant="light" />

      {/* ── Toolbar strip with search ────────────────────────────── */}
      <div className="shrink-0 border-b border-forest/[0.08] bg-cream">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
          {/* Left: context */}
          <div className="shrink-0 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-sage animate-pulse-soft" style={{ animationDuration: '2s' }} />
              <span className="font-mono text-[8px] text-forest/25 tracking-[0.3em] uppercase">Live</span>
            </div>
            <div className="w-px h-5 bg-forest/10" />
            <span className="font-mono text-[9px] text-forest/30">
              <span className="text-forest/50 font-medium">6</span> active workspaces
            </span>
          </div>

          {/* Center: search */}
          <div className="flex-1 max-w-xl">
            <SpotlightSearch
              mode="inline"
              placeholder="Search workspaces, ask a question…"
              variant="light"
            />
          </div>

          {/* Right: stats */}
          <div className="shrink-0 flex items-center gap-4">
            {[{ n: '12.8K', l: 'nootes' }, { n: '487', l: 'books' }].map(s => (
              <div key={s.l} className="flex items-baseline gap-1">
                <span className="font-mono text-xs text-forest/40 font-medium">{s.n}</span>
                <span className="font-mono text-[7px] text-forest/18 tracking-wider">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workspaces grid ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-12">
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] text-forest/20 tracking-[0.3em] uppercase">Active Workspaces</span>
            </div>
            <div className="flex gap-3">
              {Object.entries(STATUS_STYLES).map(([key, s]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.indicator}`} />
                  <span className="font-mono text-[7px] text-forest/25 tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 stagger-fast">
            {WORKSPACES.map((ws, i) => {
              const statusStyle = STATUS_STYLES[ws.status]
              return (
                <div
                  key={i}
                  className="bg-parchment border border-forest/[0.08] squircle-xl p-5 hover:border-forest/15 hover:shadow-[0_4px_24px_-8px_rgba(38,70,53,0.08)] transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-lg text-forest leading-snug group-hover:text-forest transition-colors">{ws.title}</p>
                      <p className="font-mono text-[7px] text-sage/40 tracking-[0.3em] uppercase mt-0.5">{ws.subject}</p>
                    </div>
                    <span className={`font-mono text-[7px] tracking-wider px-2 py-0.5 squircle-sm shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label.toUpperCase()}
                    </span>
                  </div>

                  {/* Content preview */}
                  {ws.latex && (
                    <div className="bg-forest/[0.03] border-l-2 border-sage/30 pl-3 py-2 squircle-sm mb-3 overflow-x-auto">
                      <KaTeX math={ws.latex} display={false} />
                    </div>
                  )}
                  {ws.code && (
                    <div className="mb-3">
                      <CodeBlock code={ws.code} language="python" theme="dark" />
                    </div>
                  )}
                  {ws.excerpt && (
                    <p className="font-[family-name:var(--font-body)] text-xs text-forest/45 leading-relaxed mb-3">{ws.excerpt}</p>
                  )}

                  {/* Footer: editors + changes */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-forest/[0.05]">
                    <div className="flex items-center">
                      <div className="flex -space-x-1.5">
                        {ws.editors.map((ed, j) => (
                          <div
                            key={j}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[6px] text-parchment font-medium border-2 border-parchment"
                            style={{ backgroundColor: ed.color }}
                          >
                            {ed.name[0]}
                          </div>
                        ))}
                      </div>
                      <span className="font-mono text-[8px] text-forest/20 ml-2">
                        {ws.editors.length} editor{ws.editors.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-mono text-[8px] text-forest/20">
                      {ws.changes} changes
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer message */}
          <div className="text-center mt-10">
            <p className="font-[family-name:var(--font-display)] text-base text-sage/25">
              the best nootes are written together ✦
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
