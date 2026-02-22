import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'
import { SpotlightSearch } from '../components/SpotlightSearch'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* HomeV1 — "The Open Book"                                            */
/* Two-column layout like an open book lying flat. Left page holds      */
/* the search area + quick-access links. Right page holds a flowing    */
/* stream of featured nootes with LaTeX and code previews. A subtle    */
/* spine divider runs down the center. Warm paper feel.                */
/* ------------------------------------------------------------------ */

const FEATURED = [
  {
    title: 'The Chain Rule',
    subject: 'Calculus II',
    dept: 'Mathematics',
    deptColor: '#D4A843',
    latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
    excerpt: 'Essential for differentiating composite functions — apply outer derivative, multiply by inner.',
    contributor: 'Priya K.',
    aura: 412,
  },
  {
    title: 'Merge Sort',
    subject: 'Algorithms',
    dept: 'Computer Science',
    deptColor: '#264635',
    code: 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    L = merge_sort(arr[:mid])\n    R = merge_sort(arr[mid:])\n    return merge(L, R)',
    contributor: 'James L.',
    aura: 831,
  },
  {
    title: 'Bayes\' Theorem',
    subject: 'Probability',
    dept: 'Mathematics',
    deptColor: '#D4A843',
    latex: 'P(A|B) = \\dfrac{P(B|A)\\cdot P(A)}{P(B)}',
    excerpt: 'Updates prior belief with new evidence. Foundation of probabilistic reasoning.',
    contributor: 'Nadia B.',
    aura: 976,
  },
  {
    title: 'The Hard Problem',
    subject: 'Philosophy of Mind',
    dept: 'Philosophy',
    deptColor: '#8B6E4E',
    excerpt: 'Why do physical processes give rise to subjective experience? The "hard problem" asks why there is "something it is like" to be conscious — one of the deepest open questions.',
    contributor: 'Amir S.',
    aura: 267,
  },
  {
    title: 'Quantum Superposition',
    subject: 'Quantum Mechanics',
    dept: 'Physics',
    deptColor: '#5C7A6B',
    latex: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle',
    excerpt: 'A qubit exists in superposition until measured. |α|² + |β|² = 1.',
    contributor: 'Lin C.',
    aura: 631,
  },
]

const QUICK_LINKS = [
  { label: 'Browse nootbooks', href: '/repos' },
  { label: 'Open the editor', href: '/editor/scratch' },
  { label: 'See the diff engine', href: '/diff' },
  { label: 'Join a chat room', href: '/chat' },
]

export default function HomeV1() {
  const { profile } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">
      <Navbar variant="light" breadcrumbs={[{ label: firstName }, { label: 'Home' }]} />

      {/* ── Two-page book layout ──────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative">

        {/* ── LEFT PAGE — Search & Navigation ─────────────────────── */}
        <div className="w-[42%] flex flex-col px-10 xl:px-14 pt-10 pb-8 overflow-y-auto">

          {/* Decorative corner ornament */}
          <svg className="absolute top-20 left-6 w-16 h-16 opacity-[0.04] pointer-events-none" viewBox="0 0 60 60" fill="none">
            <path d="M5 5 L5 55 L55 55" stroke="#264635" strokeWidth="1.5" />
            <path d="M15 5 L15 45 L55 45" stroke="#A3B18A" strokeWidth="1" />
          </svg>

          {/* Greeting */}
          <div className="mb-8 stagger">
            <p className="font-mono text-[8px] text-forest/25 tracking-[0.4em] uppercase mb-3">Your Workspace</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest leading-snug mb-1">
              Good to see you, {firstName} ✦
            </h1>
            <p className="font-[family-name:var(--font-body)] text-sm text-forest/35 leading-relaxed">
              Pick up where you left off, or discover something new.
            </p>
          </div>

          {/* Static search bar */}
          <div className="mb-8">
            <SpotlightSearch
              mode="inline"
              placeholder={`Search nootes, ask a question…`}
              variant="light"
            />
          </div>

          {/* Quick links */}
          <div className="mb-8">
            <p className="font-mono text-[8px] text-forest/20 tracking-[0.3em] uppercase mb-3">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="bg-parchment border border-forest/[0.08] squircle-sm px-3.5 py-2.5 font-[family-name:var(--font-body)] text-xs text-forest/50 hover:text-forest hover:border-forest/20 transition-all"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-auto pt-4 border-t border-forest/[0.06]">
            <div className="flex items-center gap-4">
              {[
                { n: '12,847', l: 'nootes' },
                { n: '487', l: 'nootbooks' },
                { n: '3,214', l: 'learners' },
              ].map(s => (
                <div key={s.l} className="flex items-baseline gap-1.5">
                  <span className="font-mono text-xs text-forest/40 font-medium">{s.n}</span>
                  <span className="font-mono text-[8px] text-forest/20 tracking-wider">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doodle */}
          <svg className="mt-4 w-full h-6 opacity-[0.05]" viewBox="0 0 300 20" fill="none" preserveAspectRatio="none">
            <path d="M0 10 Q75 2 150 10 Q225 18 300 10" stroke="#264635" strokeWidth="1.2" />
          </svg>
        </div>

        {/* ── SPINE DIVIDER ───────────────────────────────────────── */}
        <div className="w-px bg-forest/[0.08] relative shrink-0">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sage/20" />
        </div>

        {/* ── RIGHT PAGE — Featured Nootes Stream ─────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 xl:px-10 pt-8 pb-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-sage/50 animate-pulse-soft" style={{ animationDuration: '2.4s' }} />
            <span className="font-mono text-[8px] text-forest/25 tracking-[0.3em] uppercase">Recommended for You</span>
          </div>

          <div className="space-y-4 stagger">
            {FEATURED.map((item, i) => (
              <article
                key={i}
                className="bg-parchment border border-forest/[0.08] squircle-xl overflow-hidden hover:border-forest/15 hover:shadow-[0_4px_24px_-8px_rgba(38,70,53,0.08)] transition-all group"
              >
                <div className="flex">
                  {/* Dept color strip */}
                  <div className="w-1 shrink-0" style={{ backgroundColor: item.deptColor }} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg text-forest leading-snug">{item.title}</p>
                        <p className="font-mono text-[7px] text-sage/50 tracking-[0.3em] uppercase mt-0.5">{item.dept} · {item.subject}</p>
                      </div>
                      <span className="font-mono text-[8px] text-sage/40 bg-sage/[0.06] px-1.5 py-0.5 squircle-sm shrink-0">✦ {item.aura}</span>
                    </div>

                    {item.latex && (
                      <div className="bg-forest/[0.03] border-l-2 border-sage/30 pl-3 py-2 squircle-sm mb-2 overflow-x-auto">
                        <KaTeX math={item.latex} display={false} />
                      </div>
                    )}
                    {item.code && (
                      <div className="mb-2">
                        <CodeBlock code={item.code} language="python" theme="dark" />
                      </div>
                    )}
                    {item.excerpt && (
                      <p className="font-[family-name:var(--font-body)] text-xs text-forest/50 leading-relaxed">{item.excerpt}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-forest/[0.04]">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] text-parchment font-medium" style={{ backgroundColor: item.deptColor }}>
                        {item.contributor[0]}
                      </div>
                      <span className="font-mono text-[8px] text-forest/25">{item.contributor}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Bottom flourish */}
          <div className="text-center mt-8">
            <p className="font-[family-name:var(--font-display)] text-base text-sage/25">
              every great idea starts as a noote ✿
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
