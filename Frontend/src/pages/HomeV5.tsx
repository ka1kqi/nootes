import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { SpotlightSearch } from '../components/SpotlightSearch'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* HomeV5 — "Nocturne"                                                 */
/* Dark theme. Deep forest/charcoal background. Glowing search bar.   */
/* Organic, garden-like card arrangement. Constellation dots.          */
/* Peaceful nocturnal study aesthetic. Warm botanical accents.         */
/* ------------------------------------------------------------------ */

const CONSTELLATION_DOTS = [
  { x: 10, y: 15, r: 1.2 }, { x: 22, y: 8, r: 0.8 }, { x: 35, y: 20, r: 1 },
  { x: 50, y: 10, r: 1.5 }, { x: 65, y: 25, r: 0.9 }, { x: 78, y: 12, r: 1.1 },
  { x: 88, y: 28, r: 0.7 }, { x: 15, y: 40, r: 0.9 }, { x: 42, y: 50, r: 1.3 },
  { x: 70, y: 42, r: 1 }, { x: 85, y: 55, r: 0.8 }, { x: 28, y: 60, r: 1.1 },
  { x: 55, y: 68, r: 0.9 }, { x: 80, y: 72, r: 1.2 }, { x: 18, y: 78, r: 0.8 },
  { x: 48, y: 82, r: 1 }, { x: 75, y: 85, r: 0.7 },
]

const CONSTELLATION_LINES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [7, 8], [8, 9], [9, 10], [11, 12], [12, 13],
  [14, 15], [15, 16], [0, 7], [3, 8], [5, 9],
]

const GLOWING_CARDS = [
  {
    title: 'Bellman Equation',
    subject: 'Reinforcement Learning',
    latex: "V^*(s) = \\max_{a}\\left[R(s,a)+\\gamma\\sum_{s'}P(s'|s,a)V^*(s')\\right]",
    glow: '#A3B18A',
    contributor: 'Aisha M.',
    aura: 1847,
  },
  {
    title: "Euler's Identity",
    subject: 'Pure Mathematics',
    latex: 'e^{i\\pi} + 1 = 0',
    glow: '#D4A843',
    contributor: 'Petra N.',
    aura: 892,
  },
  {
    title: "Schrödinger's Equation",
    subject: 'Quantum Mechanics',
    latex: 'i\\hbar\\frac{\\partial}{\\partial t}|\\psi\\rangle = \\hat{H}|\\psi\\rangle',
    glow: '#5C7A6B',
    contributor: 'Lin C.',
    aura: 631,
  },
  {
    title: 'Shannon Entropy',
    subject: 'Information Theory',
    latex: 'H(X) = -\\sum_{i=1}^{n} p(x_i) \\log_2 p(x_i)',
    glow: '#8a9b75',
    contributor: 'Kwame A.',
    aura: 567,
  },
]

const FEATURES = [
  { icon: '◎', title: 'Collaborative Editing', desc: 'Write together in real-time with LaTeX and code.' },
  { icon: '⬡', title: 'Semantic Merges', desc: 'AI merging that understands meaning, not just text.' },
  { icon: '◈', title: 'Study Tools', desc: 'Generate flashcards and practice exams from nootes.' },
]

export default function HomeV5() {
  const { profile } = useAuth()
  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'

  return (
    <div className="h-screen bg-[#0a1510] flex flex-col overflow-hidden relative">

      {/* ── Constellation background ─────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {CONSTELLATION_LINES.map(([a, b], i) => (
          <line
            key={`l-${i}`}
            x1={CONSTELLATION_DOTS[a].x}
            y1={CONSTELLATION_DOTS[a].y}
            x2={CONSTELLATION_DOTS[b].x}
            y2={CONSTELLATION_DOTS[b].y}
            stroke="#A3B18A"
            strokeWidth="0.06"
            opacity="0.12"
          />
        ))}
        {CONSTELLATION_DOTS.map((d, i) => (
          <circle
            key={`d-${i}`}
            cx={d.x}
            cy={d.y}
            r={d.r * 0.12}
            fill="#A3B18A"
            opacity={0.15 + (i % 3) * 0.08}
          >
            <animate
              attributeName="opacity"
              values={`${0.12 + (i % 3) * 0.06};${0.25 + (i % 3) * 0.08};${0.12 + (i % 3) * 0.06}`}
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 35%, rgba(163,177,138,0.03) 0%, transparent 55%)',
      }} />

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <Navbar variant="dark" breadcrumbs={[{ label: firstName }, { label: 'Home' }]} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="flex flex-col items-center pt-16 pb-12 px-6">

          {/* Glowing sparkle */}
          <div className="mb-5 relative">
            <span className="text-sage/40 text-2xl animate-pulse-soft" style={{ animationDuration: '3s' }}>✦</span>
            <div className="absolute inset-0 blur-xl bg-sage/[0.06] rounded-full" />
          </div>

          {/* Title */}
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-parchment/70 tracking-tight mb-2 text-center">
            Good evening, {firstName}
          </h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-sage/25 mb-8 text-center max-w-md leading-relaxed">
            A sanctuary for late-night learning. What shall we study tonight?
          </p>

          {/* Search (dark, with glow) */}
          <div className="w-full max-w-xl relative mb-10">
            <div className="absolute -inset-3 bg-sage/[0.02] blur-2xl rounded-3xl pointer-events-none" />
            <SpotlightSearch
              mode="inline"
              placeholder="Search nootes, ask anything…"
              variant="dark"
            />
          </div>

          {/* ── Formula cards ──────────────────────────────────────── */}
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-sage/25 animate-pulse-soft" />
              <span className="font-mono text-[8px] text-sage/18 tracking-[0.3em] uppercase">Tonight's equations</span>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger-fast">
              {GLOWING_CARDS.map((card, i) => (
                <div key={i} className="relative group cursor-pointer">
                  <div
                    className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
                    style={{ backgroundColor: card.glow + '12' }}
                  />
                  <div className="relative bg-[#0f1f1a] border border-sage/[0.08] squircle-xl p-4 group-hover:border-sage/15 transition-all">
                    <span className="font-mono text-[7px] text-sage/20 tracking-[0.3em] uppercase block mb-2">{card.subject}</span>
                    <p className="font-[family-name:var(--font-display)] text-base text-parchment/55 mb-3 group-hover:text-parchment/75 transition-colors">{card.title}</p>
                    <div
                      className="bg-[#0a1510] border-l-2 pl-3 py-2 squircle-sm overflow-x-auto"
                      style={{ borderColor: card.glow + '35' }}
                    >
                      <KaTeX math={card.latex} display={false} className="text-parchment/60" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-sage/[0.06]">
                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[5px] text-parchment/50 font-medium" style={{ backgroundColor: card.glow + '30' }}>
                        {card.contributor[0]}
                      </div>
                      <span className="font-mono text-[7px] text-sage/20">{card.contributor}</span>
                      <span className="font-mono text-[7px] text-sage/15 ml-auto">✦ {card.aura}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Features ──────────────────────────────────────────── */}
          <div className="w-full max-w-5xl mt-10 pt-8 border-t border-sage/[0.06]">
            <div className="grid grid-cols-3 gap-8">
              {FEATURES.map((f, i) => (
                <div key={i} className="text-center">
                  <span className="text-sage/25 text-xl block mb-2">{f.icon}</span>
                  <p className="font-[family-name:var(--font-display)] text-lg text-parchment/40 mb-1">{f.title}</p>
                  <p className="font-[family-name:var(--font-body)] text-xs text-sage/20 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10">
            <p className="font-[family-name:var(--font-display)] text-sm text-sage/15 text-center">
              late nights, bright minds ✦
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
