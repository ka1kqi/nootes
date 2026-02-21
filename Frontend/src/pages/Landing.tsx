import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import logoImg from '../assets/logo.png'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Landing Page                                                        */
/* Public marketing page — explains nootes, shows features, CTA       */
/* Clean Heytea aesthetic: extreme whitespace, floating elements       */
/* ------------------------------------------------------------------ */

function CountUp({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    // Extract numeric part and suffix (like % or commas)
    const numMatch = value.match(/\d+/g) || []
    const targetNum = parseInt(numMatch.join('')) || 0
    const numLength = numMatch[0]?.length || 1
    const isPercent = value.includes('%')

    let current = 0
    const increment = Math.ceil(targetNum / 50)

    const timer = setInterval(() => {
      current += increment
      if (current >= targetNum) {
        setDisplayValue(targetNum)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, 20)

    return () => clearInterval(timer)
  }, [value])

  // Format the display value with commas
  const formatted = displayValue.toLocaleString()
  const suffix = value.includes('%') ? '%' : ''

  return <span>{formatted}{suffix}</span>
}

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    title: 'Rich Editor',
    desc: 'LaTeX, code blocks, diagrams, chemistry, and tables — all rendered live.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: 'Git-style Merges',
    desc: 'Branch, diff, and merge nootes like code. Resolve conflicts visually.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Collaborative',
    desc: 'Real-time co-editing with aura points, contributor profiles, and comments.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    title: 'Organized Nootbooks',
    desc: 'Browse noots by organization, field, class, and topic — like GitHub.',
  },
]

const stats = [
  { value: '12,847', label: 'Noots shared' },
  { value: '3,214', label: 'Contributors' },
  { value: '487', label: 'Nootbooks' },
  { value: '98%', label: 'Merge success' },
]

export default function Landing() {
  return (
    <main className="min-h-screen bg-cream overflow-hidden stagger">
      {/* Nav — minimal, no breadcrumbs */}
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-sm border-b border-forest/[0.06]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="logo-wave flex items-center gap-1">
            <img src={logoImg} alt="Nootes logo" style={{ width: 44, height: 44 }} />
            <span className="font-[family-name:var(--font-display)] text-2xl text-forest flex">
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/repos" className="font-[family-name:var(--font-body)] text-sm text-forest/70 hover:text-forest transition-colors">Explore</Link>
            <Link to="/diff" className="font-[family-name:var(--font-body)] text-sm text-forest/70 hover:text-forest transition-colors">How it works</Link>
            <Link to="/editor" className="font-[family-name:var(--font-body)] text-sm bg-forest text-parchment px-4 py-1.5 squircle-sm hover:bg-forest-deep transition-colors">Open Editor</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-32 relative">
        {/* Decorative doodles */}
        <svg className="absolute top-16 right-0 w-64 h-64 opacity-[0.06]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="#264635" strokeWidth="1" />
          <circle cx="100" cy="100" r="50" stroke="#A3B18A" strokeWidth="1" />
          <circle cx="100" cy="100" r="20" stroke="#264635" strokeWidth="0.5" />
        </svg>
        <svg className="absolute bottom-20 left-0 w-48 h-48 opacity-[0.05]" viewBox="0 0 150 150" fill="none">
          <path d="M20 130 Q40 20 130 50" stroke="#A3B18A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M40 120 Q70 60 120 80" stroke="#264635" strokeWidth="1" strokeLinecap="round" />
        </svg>

        <div className="relative z-10">
          <span className="font-mono text-[10px] text-sage/60 tracking-[0.4em] uppercase block mb-6">GITHUB FOR CLASS NOOTES</span>
          <h1 className="logo-wave logo-wave-lg font-[family-name:var(--font-display)] text-[7rem] leading-[0.85] text-forest tracking-tight mb-6 flex cursor-default">
            {'nootes'.split('').map((letter, i) => (
              <span key={i} className="wave-letter">{letter}</span>
            ))}
          </h1>
          <p className="font-[family-name:var(--font-body)] text-xl text-forest/65 max-w-lg leading-relaxed mb-4">
            Write beautiful nootes with live LaTeX and code. Branch, merge, and collaborate — just like developers do with code.
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl text-sage/40 mb-10">
            merge ideas, not just text ✦
          </p>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link to="/editor" className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)]">
              Open the Editor
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <Link to="/graph" className="inline-flex items-center gap-2 bg-sage/20 border border-sage text-forest px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-sage/30 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="5" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path strokeLinecap="round" d="M7.5 12h4M14 6.5l3 4M14 17.5l3-4" /></svg>
              AI Graph
            </Link>
            <Link to="/repos" className="inline-flex items-center gap-2 border border-forest/20 text-forest px-6 py-3 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest/[0.04] transition-colors">
              Browse Nootbooks
            </Link>
          </div>

          {/* Inline LaTeX preview teaser */}
          <div className="mt-16 bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_4px_40px_-12px_rgba(38,70,53,0.08)] max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-sage" />
              <span className="font-mono text-[10px] text-forest/50 tracking-wider uppercase">Live preview</span>
            </div>
            <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/70 mb-4">
              The Bellman equation — the foundation of dynamic programming:
            </p>
            <div className="bg-forest/[0.03] border-l-4 border-sage p-6 squircle-sm">
              <KaTeX math="V^*(s) = \max_{a} \left[ R(s, a) + \gamma \sum_{s'} P(s' | s, a) \, V^*(s') \right]" display />
            </div>
            <p className="font-[family-name:var(--font-display)] text-base text-sage/40 mt-3">
              rendered live as you type — no compilation step
            </p>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-forest/[0.08] bg-forest/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <span className="font-[family-name:var(--font-display)] text-4xl text-forest block">
                <CountUp value={stat.value} />
              </span>
              <span className="font-mono text-[10px] text-forest/50 tracking-[0.2em] uppercase mt-1 block">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <span className="font-mono text-[9px] text-sage/60 tracking-[0.3em] uppercase block mb-3">FEATURES</span>
        <h2 className="font-[family-name:var(--font-display)] text-5xl text-forest mb-16 leading-tight">Everything you need<br />to write together</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_2px_24px_-8px_rgba(38,70,53,0.05)] hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-shadow">
              <div className="w-10 h-10 bg-sage/10 squircle-sm flex items-center justify-center text-sage mb-5">
                {f.icon}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-2">{f.title}</h3>
              <p className="font-[family-name:var(--font-body)] text-sm text-forest/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How the flow works */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <svg className="w-24 mx-auto mb-6" viewBox="0 0 200 20" fill="none">
          <path d="M0 10 C 16 2, 32 18, 48 10 C 64 2, 80 18, 96 10 C 112 2, 128 18, 144 10 C 160 2, 176 18, 200 10" stroke="#A3B18A" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
        </svg>
        <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest mb-4">The workflow</h2>
        <p className="font-[family-name:var(--font-display)] text-xl text-sage/40 mb-12">write → branch → merge → learn</p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          {[
            { step: '01', label: 'Create a nootbook for your class', link: '/repos' },
            { step: '02', label: 'Write noots in the editor', link: '/editor' },
            { step: '03', label: 'Review diffs & merge', link: '/diff' },
            { step: '04', label: 'Build your profile', link: '/profile' },
          ].map((s, i) => (
            <Link key={i} to={s.link} className="group flex flex-col items-center gap-2 w-40">
              <span className="font-mono text-3xl text-sage/20 group-hover:text-sage transition-colors">{s.step}</span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50 group-hover:text-forest transition-colors text-center">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forest/[0.08] bg-forest/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src={logoImg} alt="Nootes logo" style={{ width: 32, height: 32 }} />
            <span className="font-[family-name:var(--font-display)] text-lg text-forest/60">nootes</span>
          </div>
          <p className="font-mono text-[10px] text-forest/50 tracking-wider">Built for students, by students.</p>
        </div>
      </footer>
    </main>
  )
}
