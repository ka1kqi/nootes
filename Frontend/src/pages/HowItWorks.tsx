import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

/* ------------------------------------------------------------------ */
/* How It Works — public marketing page                                */
/* Walks through the 4-step nootes workflow                            */
/* ------------------------------------------------------------------ */

// ── Inline mockup components ─────────────────────────────────────────

function DiscoverMockup() {
  const repos = [
    { code: 'CS-UA 310', name: 'Intro to Algorithms', org: 'NYU', contributors: 47, notes: 23, tags: ['exam-relevant', 'midterm'], access: 'public' },
    { code: 'MATH-UA 121', name: 'Calculus I', org: 'NYU', contributors: 31, notes: 18, tags: ['final', 'practice'], access: 'public' },
    { code: 'CHEM-UA 125', name: 'General Chemistry', org: 'NYU', contributors: 19, notes: 11, tags: ['lab', 'midterm'], access: 'restricted' },
  ]
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl overflow-hidden shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)]">
      {/* search bar */}
      <div className="px-4 py-3 border-b border-forest/[0.07] bg-cream/60 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-forest/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <span className="font-mono text-[10px] text-forest/30 flex-1">Search repositories…</span>
        <span className="font-mono text-[9px] bg-forest/[0.05] text-forest/30 px-2 py-0.5 squircle-sm">NYU</span>
      </div>
      {/* repo list */}
      <div className="divide-y divide-forest/[0.05]">
        {repos.map((r, i) => (
          <div key={i} className="px-4 py-3 hover:bg-forest/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className="font-mono text-[9px] text-sage/50 tracking-wider">{r.code}</span>
                <p className="font-[family-name:var(--font-display)] text-sm text-forest leading-snug">{r.name}</p>
              </div>
              <span className={`font-mono text-[8px] px-1.5 py-0.5 squircle-sm border shrink-0 mt-0.5 ${r.access === 'public' ? 'text-sage/70 bg-sage/[0.08] border-sage/15' : 'text-amber-600/60 bg-amber-50/50 border-amber-200/40'}`}>
                {r.access}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-mono text-[8px] text-forest/25">{r.contributors} contributors · {r.notes} notes</span>
              <div className="flex gap-1">
                {r.tags.map((t, j) => (
                  <span key={j} className="font-mono text-[7px] bg-forest/[0.04] text-forest/30 px-1.5 py-0.5 squircle-sm">{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-forest/[0.06] bg-cream/40 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-sage/50" />
        <span className="font-mono text-[9px] text-forest/25">127 public repositories · 3 universities</span>
      </div>
    </div>
  )
}

function ForkMockup() {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl overflow-hidden shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)]">
      {/* titlebar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-forest/[0.07] bg-cream/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-forest/30">CS-UA 310 · Algorithms</span>
          <svg className="w-3 h-3 text-forest/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
          </svg>
          <span className="font-mono text-[10px] text-sage/60">you/week-4-notes</span>
        </div>
        <span className="font-mono text-[8px] bg-sage/[0.08] text-sage/60 border border-sage/15 px-2 py-0.5 squircle-sm">forked</span>
      </div>

      {/* editor body */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl text-forest">Dynamic Programming</span>
          <span className="font-mono text-[8px] text-sage/40 bg-sage/[0.06] px-2 py-0.5 squircle-sm ml-auto">your fork</span>
        </div>

        {/* existing master content (dimmed) */}
        <div className="bg-forest/[0.02] border border-forest/[0.05] squircle-sm p-3 opacity-50">
          <span className="font-mono text-[8px] text-forest/30 tracking-wider block mb-1">FROM MASTER</span>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/40 leading-snug">
            DP breaks problems into overlapping subproblems and stores results to avoid recomputation.
          </p>
        </div>

        {/* new content being added */}
        <div className="bg-sage/[0.06] border border-sage/20 squircle-sm p-3">
          <span className="font-mono text-[8px] text-sage/50 tracking-wider block mb-1.5">YOUR ADDITION ✦</span>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/65 leading-snug">
            Memoization vs tabulation: top-down recursion + cache vs bottom-up table fill. Both achieve O(n) on Fibonacci.
          </p>
          <div className="mt-2 bg-forest/[0.04] squircle-sm p-2 font-mono text-[9px] text-forest/45 leading-relaxed">
            <span className="text-sage/60">def</span> fib(n, memo=<span className="text-sage/60">{'{}'}</span>):<br />
            {'  '}<span className="text-sage/60">if</span> n <span className="text-sage/60">in</span> memo: <span className="text-sage/60">return</span> memo[n]
          </div>
        </div>
      </div>

      {/* status bar */}
      <div className="px-4 py-2 border-t border-forest/[0.06] flex items-center gap-3 bg-cream/40">
        <div className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse" />
        <span className="font-mono text-[9px] text-forest/25">auto-saved · ready to submit fork</span>
        <button className="ml-auto bg-forest text-parchment font-mono text-[8px] px-3 py-1 squircle-sm">Submit →</button>
      </div>
    </div>
  )
}

function MergeMockup() {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-5 shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)] space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-sage" />
        <span className="font-mono text-[10px] text-forest/35 tracking-wider uppercase">AI Merge · 3 branches</span>
      </div>

      {/* two contributors */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'ALICE / EXAMPLES', text: '"Let u = 3x+1, then h(x) = u². Apply chain rule: 2u · u′ = 6(3x+1)."', color: 'border-forest/10' },
          { label: 'BEN / PROOFS', text: '"By Fréchet derivative, if f,g differentiable then (f∘g)′ = (f′∘g)·g′."', color: 'border-forest/10' },
        ].map((c, i) => (
          <div key={i} className={`bg-forest/[0.02] border ${c.color} squircle-sm p-2.5`}>
            <span className="font-mono text-[8px] text-forest/25 tracking-wider block mb-1">{c.label}</span>
            <p className="font-[family-name:var(--font-body)] text-[10px] text-forest/50 leading-snug">{c.text}</p>
          </div>
        ))}
      </div>

      {/* merge arrow */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-sage/20" />
        <div className="flex items-center gap-1.5 px-2 py-1 bg-sage/[0.08] squircle-sm">
          <svg className="w-3 h-3 text-sage/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <span className="font-mono text-[8px] text-sage/60 tracking-wider">AI MERGE</span>
        </div>
        <div className="flex-1 h-px bg-sage/20" />
      </div>

      {/* synthesized */}
      <div className="bg-sage/[0.07] border border-sage/20 squircle-sm p-3">
        <span className="font-mono text-[8px] text-sage/50 tracking-wider block mb-1.5">SYNTHESIZED — main</span>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/65 leading-relaxed">
          The chain rule states <span className="font-mono text-[10px]">d/dx[f(g(x))] = f′(g(x))·g′(x)</span>.
          Intuitively: differentiate the outer function at the inner, then multiply by the inner's derivative.
          Example: <span className="font-mono text-[10px]">(3x+1)² → 2(3x+1)·3 = 6(3x+1)</span>.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
        <span className="font-[family-name:var(--font-body)] text-[11px] text-forest/35">All checks passed · ready to publish</span>
        <button className="ml-auto bg-sage text-parchment font-mono text-[9px] px-3 py-1.5 squircle-sm hover:bg-sage/80 transition-colors">Merge</button>
      </div>
    </div>
  )
}

function NootMockup() {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl overflow-hidden shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)]">
      {/* titlebar */}
      <div className="px-4 py-3 border-b border-forest/[0.07] bg-cream/60 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-sage/20 flex items-center justify-center text-[10px]">🐧</div>
        <span className="font-mono text-[10px] text-forest/40">Noot · AI Study Companion</span>
        <div className="ml-auto flex items-center gap-1">
          {['Write', 'Graphs', 'Concise'].map((m, i) => (
            <span key={i} className={`font-mono text-[8px] px-2 py-0.5 squircle-sm ${i === 1 ? 'bg-forest text-parchment' : 'text-forest/30'}`}>{m}</span>
          ))}
        </div>
      </div>

      {/* messages */}
      <div className="p-4 space-y-3">
        {/* user message */}
        <div className="flex justify-end">
          <div className="bg-forest/[0.06] border border-forest/[0.08] squircle-sm px-3 py-2 max-w-[80%]">
            <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/70">explain how Dijkstra's algorithm works</p>
          </div>
        </div>

        {/* noot graph response */}
        <div className="bg-sage/[0.06] border border-sage/15 squircle-sm p-3 space-y-2">
          <span className="font-mono text-[8px] text-sage/50 tracking-wider block">NOOT · GRAPH MODE</span>
          {/* mini graph viz */}
          <div className="relative h-24 bg-forest/[0.02] squircle-sm border border-forest/[0.05] overflow-hidden">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-forest text-parchment font-mono text-[8px] px-2 py-1 squircle-sm">Dijkstra's</div>
            <div className="absolute bottom-3 left-5 bg-parchment border border-forest/15 font-mono text-[7px] text-forest/50 px-1.5 py-0.5 squircle-sm">Priority Queue</div>
            <div className="absolute bottom-3 right-5 bg-parchment border border-forest/15 font-mono text-[7px] text-forest/50 px-1.5 py-0.5 squircle-sm">Greedy Choice</div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-parchment border border-forest/15 font-mono text-[7px] text-forest/50 px-1.5 py-0.5 squircle-sm">Relaxation</div>
            {/* connecting lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              <line x1="50%" y1="36" x2="22%" y2="76" stroke="#264635" strokeOpacity="0.1" strokeWidth="1"/>
              <line x1="50%" y1="36" x2="50%" y2="76" stroke="#264635" strokeOpacity="0.1" strokeWidth="1"/>
              <line x1="50%" y1="36" x2="78%" y2="76" stroke="#264635" strokeOpacity="0.1" strokeWidth="1"/>
            </svg>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/55 leading-relaxed">
            Dijkstra's finds shortest paths from a source using a priority queue. It greedily relaxes edges, always processing the closest unvisited node.
          </p>
          <button className="font-mono text-[8px] text-sage/60 border border-sage/20 px-2.5 py-1 squircle-sm hover:bg-sage/[0.08] transition-colors">
            + Add to my notes
          </button>
        </div>
      </div>

      {/* input bar */}
      <div className="px-4 py-3 border-t border-forest/[0.06] flex items-center gap-2 bg-cream/40">
        <div className="flex-1 bg-forest/[0.03] border border-forest/[0.07] squircle-sm px-3 py-1.5">
          <span className="font-mono text-[10px] text-forest/20">Ask Noot anything…</span>
        </div>
        <div className="w-7 h-7 bg-forest squircle-sm flex items-center justify-center">
          <svg className="w-3 h-3 text-parchment" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
// ── Step data ─────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    eyebrow: 'DISCOVER',
    title: 'Find knowledge repositories for your courses.',
    body: 'Browse public note repositories organized by course, university, and subject. Find the CS-UA 310 Algorithms repo, the Organic Chemistry master doc — curated, community-maintained, and ready to fork.',
    details: ['Organized by course & university', 'Public and restricted access tiers', 'Tag-based filtering (exam-relevant, midterm…)', 'Semantic search across all repositories'],
    mockup: <DiscoverMockup />,
    flip: false,
  },
  {
    number: '02',
    eyebrow: 'FORK & CONTRIBUTE',
    title: 'Fork any repo. Add your perspective.',
    body: 'Fork a repository into your own workspace. Write in Markdown with live LaTeX, code blocks, and diagrams — then add your examples, corrections, and insights on top of the existing master. Your fork is yours until you\'re ready to share.',
    details: ['Full rich-text editor with LaTeX & code', 'Fork inherits master content instantly', 'Aura points for quality contributions', 'Submit fork back when ready'],
    mockup: <ForkMockup />,
    flip: true,
  },
  {
    number: '03',
    eyebrow: 'AI MERGE',
    title: 'AI synthesizes every fork into one master.',
    body: 'When forks come in, our AI merge engine reads every contribution — resolving conflicts, preserving LaTeX and code exactly, and prioritizing pedagogical quality over recency. The result is a single, authoritative master document that gets better with every contributor.',
    details: ['Multi-document reasoning, not just text diff', 'Preserves LaTeX, code, and callout blocks', 'Resolves contradictions by correctness', 'Clean output — no merge annotations'],
    mockup: <MergeMockup />,
    flip: false,
  },
  {
    number: '04',
    eyebrow: 'LEARN WITH NOOT',
    title: 'Your AI study companion lives in the editor.',
    body: 'Ask Noot anything from inside your notes. It answers with live knowledge graphs, writes structured content blocks directly into your document, or gives concise explanations — whatever helps you understand best. Not a chatbot in a tab. A collaborator in your editor.',
    details: ['Knowledge graph generation', 'Writes directly into your notes', 'Concept breakdowns & deep analysis', 'Context-aware of your open document'],
    mockup: <NootMockup />,
    flip: true,
  },
]

// ── Main page ─────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-cream/80 backdrop-blur-sm border-b border-forest/[0.06] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="logo-wave flex items-center gap-1 hover:opacity-80 transition-opacity">
            <img src={logoImg} alt="Nootes logo" style={{ width: 36, height: 36 }} />
            <span className="font-[family-name:var(--font-display)] text-2xl text-forest flex">
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/explore" className="font-[family-name:var(--font-body)] text-sm text-forest/55 hover:text-forest transition-colors px-3 py-1.5">
              Explore
            </Link>
            <Link to="/how-it-works" className="font-[family-name:var(--font-body)] text-sm text-forest px-3 py-1.5 border-b border-forest/30">
              How it works
            </Link>
            <div className="h-4 w-px bg-forest/15 mx-1" />
            <div className="flex squircle-sm overflow-hidden border border-forest/15">
              <Link to="/login?mode=signin" className="font-[family-name:var(--font-body)] text-sm text-forest/65 hover:text-forest hover:bg-forest/[0.05] transition-colors px-5 py-1.5 text-center">
                Sign In
              </Link>
              <div className="w-px bg-forest/15" />
              <Link to="/login?mode=signup" className="font-[family-name:var(--font-body)] text-sm bg-forest text-parchment hover:bg-forest-deep transition-colors px-5 py-1.5 text-center">
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center stagger">
          <span className="font-mono text-[9px] text-sage/55 tracking-[0.4em] uppercase block mb-5">
            HOW IT WORKS
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-[4.5rem] leading-[0.88] text-forest tracking-tight mb-6">
            Knowledge, together.
          </h1>
          <p className="font-[family-name:var(--font-body)] text-lg text-forest/55 leading-relaxed max-w-xl mx-auto mb-8">
            Nootes is a living knowledge platform — discover course repositories, fork and contribute your insights, let AI synthesize the best of everyone's work, and learn with an AI companion built into your editor.
          </p>
          {/* step pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {steps.map(s => (
              <a
                key={s.number}
                href={`#step-${s.number}`}
                className="flex items-center gap-2 bg-parchment border border-forest/10 squircle px-4 py-2 hover:border-forest/20 hover:shadow-[0_2px_12px_-4px_rgba(38,70,53,0.08)] transition-all group"
              >
                <span className="font-mono text-[10px] text-forest/25 group-hover:text-forest/40 transition-colors">{s.number}</span>
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/55 group-hover:text-forest/80 transition-colors">{s.eyebrow.charAt(0) + s.eyebrow.slice(1).toLowerCase()}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Steps ────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 pb-24 space-y-28">
          {steps.map((step) => (
            <section
              key={step.number}
              id={`step-${step.number}`}
              className={`flex flex-col lg:flex-row items-center gap-12 ${step.flip ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* text side */}
              <div className="flex-1 max-w-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-[9px] text-sage/45 tracking-[0.35em]">{step.eyebrow}</span>
                  <div className="h-px flex-1 bg-forest/[0.07]" />
                  <span className="font-[family-name:var(--font-display)] text-5xl text-forest/[0.07] leading-none select-none">{step.number}</span>
                </div>

                <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest leading-[1.05] mb-4">
                  {step.title}
                </h2>

                <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/55 leading-relaxed mb-6">
                  {step.body}
                </p>

                <ul className="space-y-2">
                  {step.details.map((d, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <svg className="w-3.5 h-3.5 text-sage shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="font-[family-name:var(--font-body)] text-sm text-forest/55">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* mockup side */}
              <div className="flex-1 w-full max-w-lg">
                {step.mockup}
              </div>
            </section>
          ))}
        </div>

        {/* ── Supporting features strip ─────────────────────────────── */}
        <section className="border-y border-forest/[0.07] bg-parchment/50">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <span className="font-mono text-[9px] text-sage/45 tracking-[0.35em] uppercase block text-center mb-10">
              EVERYTHING ELSE
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '⌘', title: 'Spotlight Search', desc: 'Jump to any repo, note, or contributor instantly across the whole network.' },
                { icon: '◎', title: 'Knowledge Graphs', desc: 'Visualize how concepts branch and connect as an interactive graph.' },
                { icon: '✦', title: 'Aura', desc: 'Earn reputation for every quality contribution. The more you give, the more you grow.' },
                { icon: '⎋', title: 'Rich Editor', desc: 'LaTeX, code blocks, Mermaid diagrams, callouts — everything renders live as you write.' },
              ].map((f, i) => (
                <div key={i} className="text-center">
                  <span className="text-2xl text-forest/20 block mb-3">{f.icon}</span>
                  <p className="font-[family-name:var(--font-display)] text-base text-forest mb-1">{f.title}</p>
                  <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 py-24 text-center stagger">
          <span className="font-mono text-[9px] text-sage/45 tracking-[0.4em] uppercase block mb-5">GET STARTED</span>
          <h2 className="font-[family-name:var(--font-display)] text-5xl text-forest leading-[0.9] mb-5">
            Start learning with your community.
          </h2>
          <p className="font-[family-name:var(--font-body)] text-base text-forest/50 leading-relaxed mb-8 max-w-md mx-auto">
            Join classmates already building the best course knowledge repositories together.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_20px_-4px_rgba(38,70,53,0.3)]"
            >
              Create a free account
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 border border-forest/20 text-forest px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest/[0.04] transition-colors"
            >
              Browse Repositories
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="border-t border-forest/[0.07]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <img src={logoImg} alt="Nootes logo" style={{ width: 24, height: 24 }} />
              <span className="font-[family-name:var(--font-display)] text-base text-forest/50">nootes</span>
            </div>
            <p className="font-mono text-[9px] text-forest/35 tracking-wider">Built for learners, by learners.</p>
            <div className="flex items-center gap-4">
              <Link to="/explore" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">EXPLORE</Link>
              <Link to="/how-it-works" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">HOW IT WORKS</Link>
              <Link to="/login" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">SIGN IN</Link>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
