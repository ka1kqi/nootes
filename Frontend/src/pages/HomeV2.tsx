import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'
import { SpotlightSearch } from '../components/SpotlightSearch'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* HomeV2 — "Bauhaus Blocks"                                           */
/* Mondrian-inspired geometric layout. The page is divided into bold   */
/* colored blocks of varying sizes. Search occupies a prominent block. */
/* Other blocks contain stats, featured equations, code, and pure      */
/* geometric color fills. Asymmetric, architectural, very Bauhaus.     */
/* ------------------------------------------------------------------ */

const EQUATIONS = [
  { label: 'Euler', latex: 'e^{i\\pi} + 1 = 0' },
  { label: 'Bellman', latex: "V^*(s) = \\max_{a}\\left[R(s,a)+\\gamma\\sum_{s'}P(s'|s,a)V^*(s')\\right]" },
  { label: 'Bayes', latex: 'P(A|B) = \\dfrac{P(B|A)\\cdot P(A)}{P(B)}' },
  { label: 'Shannon', latex: 'H(X) = -\\sum_{i} p(x_i) \\log_2 p(x_i)' },
]

const CODE_SNIPPET = `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    L = merge_sort(arr[:mid])
    R = merge_sort(arr[mid:])
    return merge(L, R)`

const SUBJECTS = [
  { name: 'Mathematics', count: 142, color: '#D4A843' },
  { name: 'Computer Science', count: 98, color: '#264635' },
  { name: 'Physics', count: 67, color: '#5C7A6B' },
  { name: 'Philosophy', count: 43, color: '#8B6E4E' },
  { name: 'Biology', count: 58, color: '#4A6741' },
]

export default function HomeV2() {
  const { profile } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'
  const [activeEq, setActiveEq] = useState(0)

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">
      <Navbar variant="light" breadcrumbs={[{ label: firstName }, { label: 'Home' }]} />

      {/* ── Grid layout ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-[3px] p-[3px] min-h-0 bg-forest/[0.06]">

        {/* ── BLOCK A: Search (spans 5 cols, 3 rows) ─────────────── */}
        <div className="col-span-5 row-span-3 bg-cream p-6 flex flex-col justify-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-forest mb-1">
            What are we learning today?
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-forest/30 mb-5">
            Search across all nootbooks, or ask the AI anything.
          </p>
          <SpotlightSearch
            mode="inline"
            placeholder={`Ask anything, ${firstName}…`}
            variant="light"
          />
        </div>

        {/* ── BLOCK B: Featured Equation (4 cols, 2 rows) ─────────── */}
        <div className="col-span-4 row-span-2 bg-parchment p-5 flex flex-col">
          <span className="font-mono text-[7px] text-forest/20 tracking-[0.4em] uppercase mb-2">Featured Formula</span>
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-forest/[0.03] border-l-2 border-sage/30 pl-4 py-3 pr-3 squircle-sm overflow-x-auto">
              <KaTeX math={EQUATIONS[activeEq].latex} display />
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {EQUATIONS.map((eq, i) => (
              <button
                key={eq.label}
                onClick={() => setActiveEq(i)}
                className={`font-mono text-[7px] tracking-wider px-2 py-1 squircle-sm transition-all cursor-pointer ${
                  i === activeEq ? 'bg-forest text-parchment' : 'text-forest/25 hover:text-forest/50 hover:bg-forest/[0.04]'
                }`}
              >
                {eq.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── BLOCK C: Geometric accent (3 cols, 2 rows) ──────────── */}
        <div className="col-span-3 row-span-2 bg-forest flex items-center justify-center relative overflow-hidden">
          {/* Bauhaus circles */}
          <svg className="absolute w-full h-full" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="70" stroke="#A3B18A" strokeWidth="1" opacity="0.2" />
            <circle cx="100" cy="100" r="45" stroke="#E9E4D4" strokeWidth="0.8" opacity="0.15" />
            <circle cx="100" cy="100" r="20" fill="#A3B18A" opacity="0.15" />
          </svg>
          <span className="font-[family-name:var(--font-display)] text-5xl text-parchment/20 relative z-10 select-none">✦</span>
        </div>

        {/* ── BLOCK D: Stats (3 cols, 1 row) ──────────────────────── */}
        <div className="col-span-3 row-span-1 bg-sage/10 p-4 flex items-center justify-around">
          {[
            { n: '12.8K', l: 'nootes' },
            { n: '487', l: 'books' },
            { n: '3.2K', l: 'learners' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <span className="font-mono text-sm text-forest/60 font-medium block">{s.n}</span>
              <span className="font-mono text-[7px] text-forest/25 tracking-wider">{s.l}</span>
            </div>
          ))}
        </div>

        {/* ── BLOCK E: Code preview (4 cols, 3 rows) ──────────────── */}
        <div className="col-span-4 row-span-3 bg-forest-deep p-4 flex flex-col overflow-hidden">
          <span className="font-mono text-[7px] text-sage/30 tracking-[0.4em] uppercase mb-2">Latest Code</span>
          <div className="flex-1 overflow-hidden">
            <CodeBlock code={CODE_SNIPPET} language="python" theme="dark" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-4 h-4 rounded-full bg-sage/20 flex items-center justify-center text-[6px] text-parchment/60">J</div>
            <span className="font-mono text-[8px] text-sage/30">James L. · Algorithms</span>
          </div>
        </div>

        {/* ── BLOCK F: Subjects list (5 cols, 3 rows) ─────────────── */}
        <div className="col-span-5 row-span-3 bg-cream p-5 flex flex-col">
          <span className="font-mono text-[7px] text-forest/20 tracking-[0.4em] uppercase mb-3">Browse by Subject</span>
          <div className="flex-1 space-y-1.5">
            {SUBJECTS.map(s => (
              <a
                key={s.name}
                href="/repos"
                className="flex items-center gap-3 px-3 py-2 squircle-sm hover:bg-parchment transition-all group"
              >
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-[family-name:var(--font-body)] text-sm text-forest/60 group-hover:text-forest transition-colors flex-1">{s.name}</span>
                <span className="font-mono text-[9px] text-forest/20">{s.count}</span>
              </a>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-forest/[0.06]">
            <p className="font-[family-name:var(--font-display)] text-sm text-sage/30 text-center">
              knowledge is better together ✿
            </p>
          </div>
        </div>

        {/* ── BLOCK G: Geometric accent 2 (3 cols, 1 row) ─────────── */}
        <div className="col-span-3 row-span-1 bg-sage/20 flex items-center justify-center">
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-forest/20 rounded-full" />
            <div className="w-5 h-5 bg-amber/30" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
            <div className="w-5 h-5 bg-forest/15" />
          </div>
        </div>
      </div>
    </div>
  )
}
