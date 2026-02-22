import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'
import { SpotlightSearch } from '../components/SpotlightSearch'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* HomeV3 — "The Archive"                                              */
/* Dense, editorial, newspaper-style. Three-column layout with a       */
/* masthead banner. Formulae in margins, articles in the center,       */
/* marginalia on the right. Academic journal meets Bauhaus rigor.      */
/* ------------------------------------------------------------------ */

const SIDEBAR_FORMULAE = [
  { latex: "e^{i\\pi} + 1 = 0", label: "Euler's Identity" },
  { latex: "E = mc^2", label: 'Mass-Energy' },
  { latex: "\\oint \\vec{B} \\cdot d\\vec{l} = \\mu_0 I", label: "Ampère's Law" },
]

const ARTICLES = [
  {
    category: 'MATHEMATICS',
    title: 'On the Elegance of the Chain Rule',
    author: 'Priya K.',
    aura: 412,
    latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
    body: 'The chain rule is perhaps the most elegant result in differential calculus — a recursive principle that unlocks the differentiation of arbitrary compositions. Differentiate the outer at the inner, multiply by the derivative of the inner.',
  },
  {
    category: 'COMPUTER SCIENCE',
    title: 'Divide, Conquer, Merge',
    author: 'James L.',
    aura: 831,
    code: 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    L = merge_sort(arr[:mid])\n    R = merge_sort(arr[mid:])\n    return merge(L, R)',
    body: 'Merge sort embodies divide-and-conquer — splitting a problem into subproblems, solving each recursively, and combining results in O(n log n) time.',
  },
  {
    category: 'PHILOSOPHY',
    title: 'The Hard Problem of Consciousness',
    author: 'Amir S.',
    aura: 267,
    body: 'David Chalmers distinguished the "hard problem" from the "easy problems" of consciousness. While we can explain cognitive functions mechanistically, the question of why subjective experience exists at all remains one of the deepest open questions. It resists the reductive explanations that serve us well elsewhere in science.',
  },
]

const ACTIVITY = [
  { user: 'Nadia B.', action: 'forked', target: 'Probability Notes', time: '2m ago' },
  { user: 'James L.', action: 'merged', target: 'Sorting Algorithms', time: '8m ago' },
  { user: 'Lin C.', action: 'created', target: 'QM Problem Set 3', time: '14m ago' },
  { user: 'Marco P.', action: 'earned', target: '✦ 500 Aura', time: '22m ago' },
]

export default function HomeV3() {
  const { profile } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'

  return (
    <div className="h-screen bg-[#F5F0E4] flex flex-col overflow-hidden">
      <Navbar variant="light" />

      {/* ── Search banner ────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-forest/10 bg-[#F0EBDB]">
        <div className="max-w-2xl mx-auto px-8 py-4">
          <SpotlightSearch
            mode="inline"
            placeholder="Search the archive or ask a question…"
            variant="light"
          />
        </div>
      </div>

      {/* ── Three-column editorial body ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 pt-6 pb-16">
          <div className="grid grid-cols-12 gap-0">

            {/* LEFT — Formulae sidebar */}
            <div className="col-span-3 pr-6 border-r border-forest/10">
              <span className="font-mono text-[7px] text-forest/25 tracking-[0.4em] uppercase block mb-4">Formulæ</span>
              <div className="space-y-5">
                {SIDEBAR_FORMULAE.map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="bg-forest/[0.03] border border-forest/[0.06] squircle-sm p-3 group-hover:border-forest/15 transition-all overflow-x-auto">
                      <KaTeX math={item.latex} display={false} />
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-forest/30 mt-1.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Pull quote */}
              <div className="mt-8 pt-6 border-t border-forest/10">
                <blockquote className="font-[family-name:var(--font-display)] text-xl text-forest/40 leading-snug mb-2">
                  "Knowledge shared is knowledge squared."
                </blockquote>
                <span className="font-mono text-[7px] text-forest/20 tracking-[0.3em] uppercase">— The Nootes Manifesto</span>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t border-forest/10 space-y-2">
                {[{ n: '12,847', l: 'contributions' }, { n: '487', l: 'nootbooks' }, { n: '3,214', l: 'active scholars' }].map(s => (
                  <div key={s.l} className="flex items-baseline gap-2">
                    <span className="font-mono text-sm text-forest/45 font-medium">{s.n}</span>
                    <span className="font-mono text-[7px] text-forest/20 tracking-wider">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MAIN — Articles */}
            <div className="col-span-6 px-8">
              <span className="font-mono text-[7px] text-forest/25 tracking-[0.4em] uppercase block mb-4">Featured Nootes</span>

              {ARTICLES.map((article, i) => (
                <article
                  key={i}
                  className={`pb-6 mb-6 ${i < ARTICLES.length - 1 ? 'border-b border-forest/10' : ''}`}
                >
                  <span className="font-mono text-[7px] text-sage/40 tracking-[0.4em] uppercase">{article.category}</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mt-1 mb-2 leading-snug">{article.title}</h2>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-forest/35">by {article.author}</span>
                    <span className="font-mono text-[8px] text-sage/35">✦ {article.aura}</span>
                  </div>

                  {article.latex && (
                    <div className="bg-forest/[0.03] border-l-2 border-sage/30 pl-3 py-2.5 squircle-sm mb-3 overflow-x-auto">
                      <KaTeX math={article.latex} display />
                    </div>
                  )}
                  {article.code && (
                    <div className="mb-3">
                      <CodeBlock code={article.code} language="python" theme="dark" />
                    </div>
                  )}

                  <p className="font-[family-name:var(--font-body)] text-sm text-forest/50 leading-[1.8] first-letter:text-3xl first-letter:font-[family-name:var(--font-display)] first-letter:text-forest first-letter:float-left first-letter:mr-1.5 first-letter:mt-0.5">
                    {article.body}
                  </p>
                </article>
              ))}
            </div>

            {/* RIGHT — Activity & marginalia */}
            <div className="col-span-3 pl-6 border-l border-forest/10">
              <span className="font-mono text-[7px] text-forest/25 tracking-[0.4em] uppercase block mb-4">Activity</span>
              <div className="space-y-3">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-forest/10 flex items-center justify-center text-[6px] text-forest/40 font-medium shrink-0 mt-0.5">
                      {a.user[0]}
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-body)] text-[10px] text-forest/50 leading-snug">
                        <span className="font-medium text-forest/65">{a.user}</span>{' '}
                        {a.action}{' '}
                        <span className="text-forest/65">{a.target}</span>
                      </p>
                      <span className="font-mono text-[7px] text-forest/20">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick nav */}
              <div className="mt-6 pt-4 border-t border-forest/10">
                <span className="font-mono text-[7px] text-forest/25 tracking-[0.4em] uppercase block mb-3">Quick Links</span>
                {[
                  { label: 'Browse all nootbooks', to: '/repos' },
                  { label: 'See the diff engine', to: '/diff' },
                  { label: 'Open the editor', to: '/editor/scratch' },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.to}
                    className="block font-[family-name:var(--font-body)] text-xs text-forest/35 hover:text-forest transition-colors py-1.5 border-b border-forest/[0.05] hover:border-forest/15"
                  >
                    → {link.label}
                  </a>
                ))}
              </div>

              {/* Doodle */}
              <svg className="w-full h-10 opacity-[0.05] mt-6" viewBox="0 0 200 40" fill="none">
                <path d="M10 20 Q50 5 100 20 Q150 35 190 20" stroke="#264635" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="100" cy="20" r="3" fill="#A3B18A" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
