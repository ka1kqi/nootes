import { useState, useRef, useEffect, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* Home — AI chatbox centred in generous whitespace                    */
/*                                                                     */
/* Layout:                                                             */
/*   Navbar (56px)                                                     */
/*   Content area (position: relative, overflow: hidden)              */
/*     • Chatbox section — absolute, centred ~1/3 down                */
/*     • Nootes drawer  — absolute, full height, slides up from bottom*/
/*                                                                     */
/* Drawer behaviour:                                                   */
/*   Collapsed : only ROW_H px of the drawer peeks at the bottom      */
/*   Scroll ↑ on drawer → entire drawer translates upward (no inner   */
/*     scroll yet), snaps to 0 or maxOffset on release                */
/*   Fully up (offset=0) → inner scroll activated; collapse button    */
/*     visible; scrolling content works normally                       */
/*   Collapse button → instantly slides drawer back down              */
/* ------------------------------------------------------------------ */

// ── AI modes ─────────────────────────────────────────────────────────

const AI_MODES = ['Write', 'Graphs', 'Concise', 'Deep Analysis'] as const
type AIMode = typeof AI_MODES[number]

// ── Stats strip ───────────────────────────────────────────────────────

const STATS = [
  { value: '12,847', label: 'nootes shared' },
  { value: '3,214',  label: 'active learners' },
  { value: '487',    label: 'nootbooks' },
]

// ── Card data ─────────────────────────────────────────────────────────

interface NootCardData {
  id: string
  title: string
  source: string
  subject: string
  excerpt?: string
  latex?: string
  code?: string
  codeLabel?: string
  contributor: string
  initials: string
  aura: number
  color: string
}

const RECOMMENDED: NootCardData[] = [
  {
    id: '1',
    title: 'The Chain Rule',
    source: 'Calculus II',
    subject: 'Mathematics',
    latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
    excerpt: 'Essential for differentiating composite functions.',
    contributor: 'Priya K.',
    initials: 'PK',
    aura: 412,
    color: '#1a2f26',
  },
  {
    id: '2',
    title: 'Merge Sort',
    source: 'Algorithms',
    subject: 'Computer Science',
    code: 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    L = merge_sort(arr[:mid])\n    R = merge_sort(arr[mid:])\n    return merge(L, R)',
    codeLabel: 'python',
    contributor: 'James L.',
    initials: 'JL',
    aura: 831,
    color: '#4A6741',
  },
  {
    id: '3',
    title: 'Consciousness & the Hard Problem',
    source: 'Philosophy of Mind',
    subject: 'Philosophy',
    excerpt: 'The "hard problem" asks why physical processes give rise to subjective experience. Unlike "easy problems" of cognitive function, it questions why there is "something it is like" to be conscious — one of the deepest open questions in philosophy.',
    contributor: 'Amir S.',
    initials: 'AS',
    aura: 267,
    color: '#8a9b75',
  },
  {
    id: '4',
    title: "Bayes' Theorem",
    source: 'Probability & Statistics',
    subject: 'Mathematics',
    latex: 'P(A|B) = \\dfrac{P(B|A)\\cdot P(A)}{P(B)}',
    excerpt: 'Updates prior belief with new evidence. Foundation of probabilistic reasoning and Bayesian ML.',
    contributor: 'Nadia B.',
    initials: 'NB',
    aura: 976,
    color: '#5C7A6B',
  },
  {
    id: '5',
    title: 'Light-Dependent Reactions',
    source: 'Molecular Biology',
    subject: 'Biology',
    excerpt: 'Photons excite electrons in chlorophyll, driving an electron transport chain that generates ATP and NADPH. Water is split (photolysis), releasing O₂. Occurs in the thylakoid membrane.',
    contributor: 'Clara W.',
    initials: 'CW',
    aura: 543,
    color: '#1a2f26',
  },
  {
    id: '6',
    title: 'Bellman Equation',
    source: 'Reinforcement Learning',
    subject: 'AI / CS',
    latex: "V^*(s) = \\max_{a}\\left[R(s,a)+\\gamma\\sum_{s'}P(s'|s,a)V^*(s')\\right]",
    contributor: 'Aisha M.',
    initials: 'AM',
    aura: 1847,
    color: '#1a2f26',
  },
  {
    id: '7',
    title: 'Byzantine Fault Tolerance',
    source: 'Distributed Systems',
    subject: 'Computer Science',
    excerpt: 'A system is BFT when it operates correctly with f arbitrary failures among n ≥ 3f+1 nodes. Foundational to blockchain consensus (PBFT, Tendermint).',
    contributor: 'Rafael T.',
    initials: 'RT',
    aura: 389,
    color: '#4A6741',
  },
  {
    id: '8',
    title: 'Quantum Superposition',
    source: 'Quantum Mechanics',
    subject: 'Physics',
    latex: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle',
    excerpt: 'A qubit occupies superposition until measured. |α|² + |β|² = 1.',
    contributor: 'Lin C.',
    initials: 'LC',
    aura: 631,
    color: '#5C7A6B',
  },
  {
    id: '9',
    title: 'Stoic Virtue Ethics',
    source: 'History of Philosophy',
    subject: 'Philosophy',
    excerpt: 'For the Stoics, virtue (arete) is the only true good. External circumstances are "preferred indifferents." The sage achieves eudaimonia through reason, not fortune.',
    contributor: 'Marco P.',
    initials: 'MP',
    aura: 178,
    color: '#1a2f26',
  },
  {
    id: '10',
    title: 'Time Value of Money',
    source: 'Financial Mathematics',
    subject: 'Finance',
    latex: 'PV = \\dfrac{FV}{(1+r)^n}',
    excerpt: 'A dollar today is worth more than a dollar tomorrow. Discounting future cash flows is central to all financial modelling.',
    contributor: 'Sofia E.',
    initials: 'SE',
    aura: 445,
    color: '#4A6741',
  },
  {
    id: '11',
    title: 'OSI Reference Model',
    source: 'Computer Networks',
    subject: 'Computer Science',
    excerpt: '7-layer stack: Physical → Data Link → Network → Transport → Session → Presentation → Application. Each layer provides services upward and consumes services downward.',
    contributor: 'Kwame A.',
    initials: 'KA',
    aura: 567,
    color: '#8a9b75',
  },
  {
    id: '12',
    title: "Fermat's Last Theorem",
    source: 'Number Theory',
    subject: 'Mathematics',
    latex: 'a^n + b^n \\neq c^n \\quad (n > 2)',
    excerpt: 'No positive integer solution for n > 2. Stated 1637, proved by Andrew Wiles in 1995 via elliptic curves — one of history\'s most celebrated proofs.',
    contributor: 'Petra N.',
    initials: 'PN',
    aura: 892,
    color: '#5C7A6B',
  },
  {
    id: '13',
    title: 'Krebs Cycle',
    source: 'Biochemistry',
    subject: 'Biology',
    excerpt: 'The citric acid cycle oxidises acetyl-CoA to CO₂, reducing NAD⁺ → NADH and FAD → FADH₂ to feed the electron transport chain, producing the bulk of cellular ATP.',
    contributor: 'Nia O.',
    initials: 'NO',
    aura: 321,
    color: '#1a2f26',
  },
  {
    id: '14',
    title: 'RSA Key Exchange',
    source: 'Cryptography',
    subject: 'Computer Science',
    code: '# Key generation (simplified)\np, q = large_primes()\nn = p * q\ne = 65537\nd = mod_inverse(e, (p-1)*(q-1))\n\nencrypt = lambda m: pow(m, e, n)\ndecrypt = lambda c: pow(c, d, n)',
    codeLabel: 'python',
    contributor: 'David C.',
    initials: 'DC',
    aura: 714,
    color: '#4A6741',
  },
]

// ── NootCard ──────────────────────────────────────────────────────────

function NootCard({ card }: { card: NootCardData }) {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-4 hover:border-forest/20 hover:shadow-[0_4px_20px_-6px_rgba(38,70,53,0.10)] transition-all h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-base text-forest leading-snug">{card.title}</p>
          <p className="font-mono text-[8px] text-sage/60 tracking-wider mt-0.5 uppercase">{card.subject} · {card.source}</p>
        </div>
        <span className="font-mono text-[8px] text-sage/50 bg-sage/[0.07] border border-sage/15 px-1.5 py-0.5 squircle-sm shrink-0 whitespace-nowrap">
          ✦ {card.aura.toLocaleString()}
        </span>
      </div>

      {card.latex && (
        <div className="bg-forest/[0.03] border-l-2 border-sage/40 pl-3 pr-2 py-2 squircle-sm mb-2 overflow-x-auto">
          <KaTeX math={card.latex} display={false} />
        </div>
      )}
      {card.code && (
        <div className="bg-forest squircle-sm overflow-hidden mb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-sage/10">
            <div className="w-1.5 h-1.5 rounded-full bg-sage/40" />
            <span className="font-mono text-[8px] text-sage/50 uppercase tracking-wider">{card.codeLabel ?? 'code'}</span>
          </div>
          <pre className="px-3 py-2.5 text-[10px] text-parchment/80 font-mono leading-relaxed overflow-x-auto whitespace-pre">{card.code}</pre>
        </div>
      )}
      {card.excerpt && (
        <p className="font-[family-name:var(--font-body)] text-xs text-forest/55 leading-relaxed mb-2">{card.excerpt}</p>
      )}

      {/* Contributor */}
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-medium text-parchment shrink-0"
          style={{ backgroundColor: card.color }}
        >
          {card.initials[0]}
        </div>
        <span className="font-mono text-[8px] text-forest/30 truncate">{card.contributor}</span>
      </div>
    </div>
  )
}

// ── Drawer constants ───────────────────────────────────────────────────
//   ROW_H: total visible height of the drawer in collapsed state
//   = header bar + top padding + one row of cards

const DRAWER_HEADER_H = 40   // px
const CARD_ROW_H      = 132  // px — uniform card height in collapsed 1-row
const ROW_PADDING_TOP = 12   // px — pt-3 above the card row
const ROW_H = DRAWER_HEADER_H + ROW_PADDING_TOP + CARD_ROW_H  // 184 px

// ── Home ──────────────────────────────────────────────────────────────

export default function Home() {
  const { profile } = useAuth()
  const [input, setInput]           = useState('')
  const [activeMode, setActiveMode] = useState<AIMode>('Write')
  const [isExpanded, setIsExpanded] = useState(false)

  // Refs
  const contentRef    = useRef<HTMLDivElement>(null)
  const drawerRef     = useRef<HTMLDivElement>(null)
  const innerScrollRef = useRef<HTMLDivElement>(null)
  const offsetRef     = useRef<number>(9999)   // actual translateY value
  const maxOffsetRef  = useRef<number>(0)
  const measuredRef   = useRef(false)
  const snapTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Direct DOM mutation for high-frequency scroll updates (avoids 60fps re-renders)
  const applyOffset = useCallback((y: number, withTransition = false) => {
    const el = drawerRef.current
    if (!el) return
    const wasExpanded = offsetRef.current < 2
    const willExpand  = y < 2
    offsetRef.current = y
    el.style.transition = withTransition
      ? 'transform 0.52s cubic-bezier(0.16,1,0.3,1)'
      : 'none'
    el.style.transform = `translateY(${y}px)`
    if (wasExpanded !== willExpand) setIsExpanded(willExpand)
  }, [])

  // Measure content area; initialise drawer position once
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => {
      const h  = el.offsetHeight
      const mo = Math.max(0, h - ROW_H)
      maxOffsetRef.current = mo
      if (!measuredRef.current && mo > 0) {
        measuredRef.current = true
        applyOffset(mo)             // collapsed at bottom on first mount
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyOffset])

  // Snap to nearest edge after scroll gesture ends
  const snapToEdge = useCallback(() => {
    const cur = offsetRef.current
    const mo  = maxOffsetRef.current
    const to  = cur < mo / 2 ? 0 : mo
    if (Math.abs(to - cur) > 0.5) applyOffset(to, true)
  }, [applyOffset])

  // Non-passive wheel handler — only intercepts events on the drawer's visible area
  useEffect(() => {
    const el = drawerRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      const cur = offsetRef.current
      const mo  = maxOffsetRef.current

      // ── Partially slid: absorb both directions ──────────────────────
      if (cur > 0.5 && cur < mo - 0.5) {
        e.preventDefault()
        const next = Math.max(0, Math.min(mo, cur + e.deltaY * 1.4))
        applyOffset(next)
        if (snapTimer.current) clearTimeout(snapTimer.current)
        snapTimer.current = setTimeout(snapToEdge, 190)
        return
      }

      // ── Fully collapsed + scroll up → start pulling drawer up ───────
      if (cur >= mo - 0.5 && e.deltaY < 0) {
        e.preventDefault()
        const next = Math.max(0, mo + e.deltaY * 1.4)
        applyOffset(next)
        if (snapTimer.current) clearTimeout(snapTimer.current)
        snapTimer.current = setTimeout(snapToEdge, 190)
        return
      }

      // ── Fully expanded (cur ≈ 0): let inner scroll handle ──────────
      // No preventDefault → wheel event propagates to innerScrollRef naturally
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyOffset, snapToEdge])

  const collapse = useCallback(() => {
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0
    applyOffset(maxOffsetRef.current, true)
  }, [applyOffset])

  const submitQuery = useCallback(() => {
    const q = input.trim()
    if (!q) return
    console.log('AI query:', q, '| mode:', activeMode)
    setInput('')
  }, [input, activeMode])

  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">
      <Navbar variant="light" />

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 relative overflow-hidden">

        {/* ── Chatbox section — pinned in background, centred ─────────── */}
        {/* pointer-events-none on wrapper so the absolute div doesn't   */}
        {/* block clicks on non-interactive whitespace areas              */}
        <div
          className="absolute inset-0 flex flex-col items-center px-6 pointer-events-none"
          style={{ paddingTop: 'max(72px, calc(33vh - 56px))' }}
        >
          <div className="pointer-events-auto flex flex-col items-center w-full max-w-2xl">

            {/* Greeting */}
            <p className="font-[family-name:var(--font-display)] text-[1.65rem] text-forest/45 mb-6 tracking-tight text-center leading-snug select-none">
              What should we explore today?
            </p>

            {/* AI Chatbox */}
            <div className="w-full bg-parchment border border-forest/[0.12] squircle-xl px-4 py-3 flex items-center gap-3 shadow-[0_4px_32px_-10px_rgba(38,70,53,0.08)] focus-within:border-sage/40 focus-within:shadow-[0_6px_32px_-10px_rgba(138,155,117,0.16)] transition-all">

              {/* Attachment */}
              <label
                className="shrink-0 text-forest/25 hover:text-forest/50 transition-colors cursor-pointer"
                title="Attach file"
              >
                <input
                  type="file"
                  accept="image/*,.pdf,.txt,.md,.docx"
                  className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) console.log('Attached:', f.name)
                    e.target.value = ''
                  }}
                />
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </label>

              {/* Text input */}
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitQuery() }
                }}
                placeholder={`Ask anything, ${firstName}…`}
                className="flex-1 bg-transparent text-sm text-forest placeholder:text-forest/30 outline-none font-[family-name:var(--font-body)]"
              />

              {/* Send */}
              <button
                onClick={submitQuery}
                disabled={!input.trim()}
                className="shrink-0 w-9 h-9 bg-forest squircle-sm flex items-center justify-center text-parchment hover:bg-forest-deep transition-colors disabled:opacity-20 cursor-pointer"
                aria-label="Send"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Mode pills */}
            <div className="flex items-center gap-2 mt-4">
              {AI_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={`font-[family-name:var(--font-body)] text-xs px-4 py-1.5 squircle transition-all cursor-pointer ${
                    activeMode === mode
                      ? 'bg-forest text-parchment'
                      : 'border border-forest/15 text-forest/45 hover:border-forest/28 hover:text-forest/70'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-2 mt-3">
              {STATS.map((s, i) => (
                <span key={s.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-forest/10 font-mono text-xs select-none">·</span>}
                  <span className="font-mono text-[9px] text-forest/28 tracking-wider">
                    <span className="text-forest/40">{s.value}</span> {s.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Nootes Drawer ────────────────────────────────────────────── */}
        {/* Spans the full content area; starts off-screen (JS sets it   */}
        {/* to maxOffset after measuring). Pointer events fire only at   */}
        {/* the visual (transformed) position, so collapsed state does   */}
        {/* not block the chatbox above it.                              */}
        <div
          ref={drawerRef}
          className="absolute inset-x-0 z-20"
          style={{ top: 0, bottom: 0, transform: 'translateY(100%)' }}
        >
          {/* ── Drawer header ─────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 bg-cream border-t border-forest/[0.08] shadow-[0_-3px_16px_-6px_rgba(38,70,53,0.07)]"
            style={{ height: `${DRAWER_HEADER_H}px` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse-soft" style={{ animationDuration: '2.4s' }} />
              <span className="font-mono text-[9px] text-forest/30 tracking-[0.3em] uppercase">
                Recommended for you
              </span>
            </div>

            {isExpanded ? (
              <button
                onClick={collapse}
                className="flex items-center gap-1 font-mono text-[9px] text-forest/30 hover:text-forest/55 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                collapse
              </button>
            ) : (
              <span className="font-mono text-[8px] text-forest/18 tracking-wider select-none">scroll ↑</span>
            )}
          </div>

          {/* ── Collapsed: 1 uniform-height row of cards ─────────────── */}
          {!isExpanded && (
            <div
              className="flex gap-3 px-6 bg-cream overflow-x-hidden"
              style={{ paddingTop: `${ROW_PADDING_TOP}px`, height: `${CARD_ROW_H}px` }}
            >
              {RECOMMENDED.map(card => (
                <div
                  key={card.id}
                  className="shrink-0 w-52 overflow-hidden"
                  style={{ height: `${CARD_ROW_H}px` }}
                >
                  <NootCard card={card} />
                </div>
              ))}
            </div>
          )}

          {/* ── Expanded: masonry grid, inner-scrollable ──────────────── */}
          {isExpanded && (
            <div
              ref={innerScrollRef}
              className="bg-cream overflow-y-auto px-6 pb-10"
              style={{ height: `calc(100% - ${DRAWER_HEADER_H}px)` }}
            >
              <div className="columns-3 xl:columns-4 [column-gap:0.875rem] pt-5">
                {RECOMMENDED.map(card => (
                  <div key={card.id} className="break-inside-avoid mb-3.5">
                    <NootCard card={card} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
