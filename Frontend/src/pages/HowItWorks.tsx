import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* How It Works — public marketing page                                */
/* Walks through the 4-step nootes workflow                            */
/* ------------------------------------------------------------------ */

// ── Inline mockup components ─────────────────────────────────────────

function WriteMockup() {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl overflow-hidden shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)]">
      {/* editor titlebar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-forest/[0.07] bg-cream/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-forest/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-forest/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-forest/10" />
          </div>
          <span className="font-mono text-[10px] text-forest/30 ml-2">chain-rule.md</span>
        </div>
        <span className="font-mono text-[9px] bg-sage/10 text-sage px-2 py-0.5 squircle-sm">main</span>
      </div>
      {/* editor body */}
      <div className="p-5 space-y-3">
        <div>
          <span className="font-[family-name:var(--font-display)] text-xl text-forest">The Chain Rule</span>
        </div>
        <div className="bg-forest/[0.03] border-l-4 border-sage p-3 squircle-sm">
          <KaTeX math="\frac{d}{dx}[f(g(x))] = f'(g(x)) \cdot g'(x)" display />
        </div>
        <p className="font-[family-name:var(--font-body)] text-xs text-forest/50 leading-relaxed">
          Apply whenever differentiating a composite function — outer first, multiply by the inner's derivative.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-forest/[0.06]" />
          <span className="font-mono text-[9px] text-forest/20">### Example 1</span>
          <div className="h-px flex-1 bg-forest/[0.06]" />
        </div>
        <p className="font-mono text-[11px] text-forest/40 leading-relaxed">
          Find the derivative of <span className="text-sage/80">h(x) = (3x + 1)²</span>
        </p>
        <div className="bg-forest/[0.02] border border-forest/[0.06] squircle-sm p-2.5">
          <KaTeX math="h'(x) = 2(3x+1) \cdot 3 = 6(3x+1)" display />
        </div>
      </div>
      {/* status bar */}
      <div className="px-4 py-2 border-t border-forest/[0.06] flex items-center gap-3 bg-cream/40">
        <div className="w-1.5 h-1.5 rounded-full bg-sage/60" />
        <span className="font-mono text-[9px] text-forest/25">LaTeX · Markdown · auto-save on</span>
      </div>
    </div>
  )
}

function BranchMockup() {
  const contributors = [
    { name: 'Alice M.', initials: 'AM', branch: 'alice/examples', color: 'bg-forest/80', offset: 'mt-0', note: 'Added worked examples with substitution steps.' },
    { name: 'Ben K.', initials: 'BK', branch: 'ben/proofs', color: 'bg-sienna/60', offset: 'mt-6', note: 'Formal epsilon-delta proof of the chain rule.' },
    { name: 'Cora L.', initials: 'CL', branch: 'cora/intuition', color: 'bg-moss/60', offset: 'mt-12', note: 'Added geometric intuition + visual diagram.' },
  ]
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-5 shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)] space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-sage" />
        <span className="font-mono text-[10px] text-forest/35 tracking-wider uppercase">Nootbook · CS-UA 310</span>
      </div>

      {/* main branch line */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-forest/70 shrink-0" />
        <div className="flex-1 h-px bg-forest/20" />
        <span className="font-mono text-[9px] text-forest/30">main</span>
      </div>

      {/* contributor branches */}
      <div className="pl-4 space-y-3">
        {contributors.map((c, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-px h-2 bg-forest/10" />
              <div className={`w-2 h-2 rounded-full shrink-0 ${c.color} opacity-70`} />
            </div>
            <div className="flex-1 bg-forest/[0.02] border border-forest/[0.07] squircle-sm p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full ${c.color} flex items-center justify-center text-[7px] text-parchment font-medium`}>{c.initials}</div>
                  <span className="font-mono text-[9px] text-forest/40">{c.branch}</span>
                </div>
                <span className="font-mono text-[8px] text-sage/50 bg-sage/[0.07] px-1.5 py-0.5 squircle-sm">open</span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/45 leading-snug">{c.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1 border-t border-forest/[0.06] flex items-center justify-between">
        <span className="font-mono text-[9px] text-forest/25">3 open branches · 1 nootbook</span>
        <span className="font-mono text-[9px] text-sage/50">ready to merge ✦</span>
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

function StudyMockup() {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-5 shadow-[0_4px_32px_-8px_rgba(38,70,53,0.08)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sage" />
          <span className="font-mono text-[10px] text-forest/35 tracking-wider uppercase">Study Mode</span>
        </div>
        <div className="flex items-center gap-1">
          {['Flashcards', 'Quiz', 'Summary'].map((t, i) => (
            <span key={i} className={`font-mono text-[8px] px-2 py-1 squircle-sm ${i === 0 ? 'bg-forest text-parchment' : 'text-forest/30'}`}>{t}</span>
          ))}
        </div>
      </div>

      {/* flashcard stack */}
      <div className="relative h-32">
        {/* back cards */}
        <div className="absolute inset-0 bg-forest/[0.03] border border-forest/[0.06] squircle-xl translate-y-2 translate-x-2 scale-[0.97]" />
        <div className="absolute inset-0 bg-forest/[0.02] border border-forest/[0.04] squircle-xl translate-y-1 translate-x-1 scale-[0.985]" />
        {/* front card */}
        <div className="absolute inset-0 bg-parchment border border-forest/10 squircle-xl p-4 flex flex-col justify-between shadow-[0_2px_16px_-4px_rgba(38,70,53,0.08)]">
          <div>
            <span className="font-mono text-[8px] text-sage/50 tracking-wider uppercase block mb-2">Question 1 of 12</span>
            <p className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium">
              When do you need to use the chain rule?
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-forest/20">tap to reveal</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sage" />
              <div className="w-1.5 h-1.5 rounded-full bg-forest/15" />
              <div className="w-1.5 h-1.5 rounded-full bg-forest/15" />
            </div>
          </div>
        </div>
      </div>

      {/* progress + source badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-forest/30">4 / 12 reviewed</span>
          <span className="font-mono text-[9px] text-forest/25">generated from your nootbook</span>
        </div>
        <div className="h-1 bg-forest/[0.06] squircle-sm overflow-hidden">
          <div className="h-full w-1/3 bg-sage squircle-sm" />
        </div>
      </div>

      {/* exam button */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button className="bg-forest/[0.04] border border-forest/10 text-forest/50 font-mono text-[9px] py-2 squircle-sm hover:bg-forest/[0.07] transition-colors">
          Practice Exam
        </button>
        <button className="bg-forest text-parchment font-mono text-[9px] py-2 squircle-sm hover:bg-forest-deep transition-colors">
          Smart Summary
        </button>
      </div>
    </div>
  )
}

// ── Step data ─────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    eyebrow: 'WRITE',
    title: 'Start with a Nootbook.',
    body: 'Create a nootbook for any course. Write in Markdown — your LaTeX math, code blocks, and diagrams render live as you type. No formatting headaches, no export required.',
    details: ['LaTeX & chemistry notation', 'Syntax-highlighted code', 'Mermaid diagrams', 'Auto-save & version history'],
    mockup: <WriteMockup />,
    flip: false,
  },
  {
    number: '02',
    eyebrow: 'COLLABORATE',
    title: 'Invite classmates. Each on their own branch.',
    body: 'Share a nootbook with your class. Every contributor works on a personal branch — their perspective, their examples, their proofs — without ever overwriting each other. Just like Git.',
    details: ['Unlimited contributors', 'Conflict-free branching', 'Per-branch history', 'Inline comments & reviews'],
    mockup: <BranchMockup />,
    flip: true,
  },
  {
    number: '03',
    eyebrow: 'MERGE',
    title: 'AI reads every branch. Writes one perfect note.',
    body: 'When you\'re ready to consolidate, Nootes AI synthesizes every contribution. It understands concepts — not just text — and produces a merged note that captures every unique insight without redundancy.',
    details: ['Semantic understanding', 'Conflict resolution', 'Source attribution', 'One-click merge to main'],
    mockup: <MergeMockup />,
    flip: false,
  },
  {
    number: '04',
    eyebrow: 'STUDY',
    title: 'Turn your notes into exam prep — instantly.',
    body: 'Nootes generates flashcards, practice exams, and smart summaries directly from your merged nootbook. Study material built on your class\'s collective understanding, not generic content.',
    details: ['AI-generated flashcards', 'Practice exam questions', 'Concept summaries', 'Spaced repetition'],
    mockup: <StudyMockup />,
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
          <Link to="/">
            <img src={logoImg} alt="Nootes logo" style={{ width: 36, height: 36 }} />
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
            Notes, evolved.
          </h1>
          <p className="font-[family-name:var(--font-body)] text-lg text-forest/55 leading-relaxed max-w-xl mx-auto mb-8">
            Nootes works like Git — but for knowledge. Contribute, branch, merge, and study. Four steps to the best notes your class has ever produced.
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
                { icon: '⌘', title: 'Spotlight Search', desc: 'Jump to any note, branch, or contributor instantly.' },
                { icon: '◎', title: 'Knowledge Graph', desc: 'See how your notes connect as an interactive graph.' },
                { icon: '✦', title: 'Aura & Themes', desc: 'Personalise your editor with themes and flair.' },
                { icon: '⎋', title: 'Export anywhere', desc: 'PDF, Markdown, LaTeX — one click, any format.' },
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
            Ready to take better notes?
          </h2>
          <p className="font-[family-name:var(--font-body)] text-base text-forest/50 leading-relaxed mb-8 max-w-md mx-auto">
            Join classmates already building the best study resources together.
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
              Browse Nootbooks
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
