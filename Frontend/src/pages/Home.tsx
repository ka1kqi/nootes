import { useState, useRef, useEffect, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
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
/*   Drag handle ↑ → entire drawer translates upward, snaps to edges */
/*   Tap handle  → toggles expanded / collapsed                       */
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
  content: string    // short summary (≤120 chars) shown in tile & modal
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
    content: "Differentiate composite functions: h'(x)=f'(g(x))·g'(x). Multiply outer by inner derivative.",
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
    content: 'Divide array in half recursively, sort each half, then merge. O(n log n) time, O(n) space. Stable.',
    code: 'def merge_sort(arr):',
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
    content: "Chalmers asks: why does physical processing produce subjective experience? No functional answer suffices.",
    excerpt: 'Why physical processes give rise to subjective experience.',
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
    content: 'Update prior beliefs with new evidence: P(A|B)=P(B|A)·P(A)/P(B). Cornerstone of Bayesian ML.',
    latex: 'P(A|B) = \\dfrac{P(B|A)\\cdot P(A)}{P(B)}',
    excerpt: 'Updates prior belief with new evidence.',
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
    content: 'Sunlight energises electrons in chlorophyll; water is split (O₂ released), producing ATP and NADPH.',
    excerpt: 'Photons excite electrons in chlorophyll, driving ATP and NADPH synthesis.',
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
    content: 'Defines optimal value recursively: best action = immediate reward + discounted future value.',
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
    content: 'System stays correct despite f arbitrary traitors among n ≥ 3f+1 nodes. Basis of PBFT & Tendermint.',
    excerpt: 'System operates correctly with f failures among n ≥ 3f+1 nodes.',
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
    content: 'A qubit holds |0⟩ and |1⟩ simultaneously until measured; |α|²+|β|²=1. Enables quantum parallelism.',
    latex: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle',
    excerpt: 'A qubit occupies superposition until measured.',
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
    content: 'Only virtue is intrinsically good. Wealth, health, and reputation are mere indifferents. Live by reason.',
    excerpt: 'Virtue (arete) is the only true good. External things are indifferents.',
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
    content: 'A dollar today is worth more than a dollar tomorrow. PV discounts future cash flows by rate r over n periods.',
    latex: 'PV = \\dfrac{FV}{(1+r)^n}',
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
    content: 'Seven layers from Physical to Application. Each layer provides services up and consumes services below.',
    excerpt: '7-layer stack: Physical → Data Link → … → Application.',
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
    content: "No positive integers satisfy aⁿ+bⁿ=cⁿ for n>2. Stated 1637, proved by Wiles via elliptic curves in 1995.",
    latex: 'a^n + b^n \\neq c^n \\quad (n > 2)',
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
    content: 'Acetyl-CoA is oxidised in 8 steps, yielding 3 NADH, 1 FADH₂, and 1 ATP per turn. Powers cellular ATP production.',
    excerpt: 'Citric acid cycle oxidises acetyl-CoA, producing NADH and FADH₂.',
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
    content: 'Public-key encryption based on integer factorisation difficulty. n=p·q; encrypt with e, decrypt with d.',
    code: 'encrypt = lambda m: pow(m, e, n)',
    codeLabel: 'python',
    contributor: 'David C.',
    initials: 'DC',
    aura: 714,
    color: '#4A6741',
  },
  {
    id: '15',
    title: 'Nash Equilibrium',
    source: 'Game Theory',
    subject: 'Economics',
    content: 'No player gains by changing strategy alone when others hold theirs. Foundation of non-cooperative game theory.',
    excerpt: 'No player can benefit by unilaterally changing strategy when all others hold theirs fixed.',
    contributor: 'Elena V.',
    initials: 'EV',
    aura: 503,
    color: '#5C7A6B',
  },
  {
    id: '16',
    title: 'Supply & Demand',
    source: 'Microeconomics',
    subject: 'Economics',
    content: 'Price settles where quantity supplied meets quantity demanded. Shifts in either curve change equilibrium.',
    excerpt: 'Price is set where quantity supplied equals quantity demanded. Shifts in either curve change the equilibrium.',
    contributor: 'Omar F.',
    initials: 'OF',
    aura: 291,
    color: '#4A6741',
  },
  {
    id: '17',
    title: 'Fourier Transform',
    source: 'Signal Processing',
    subject: 'Mathematics',
    content: 'Decomposes any signal into sinusoids. Converts the time domain to frequency domain. Used in audio, imaging, and DSP.',
    latex: '\\hat{f}(\\xi)=\\int_{-\\infty}^{\\infty}f(x)e^{-2\\pi ix\\xi}\\,dx',
    contributor: 'Yuki T.',
    initials: 'YT',
    aura: 1124,
    color: '#1a2f26',
  },
  {
    id: '18',
    title: 'Black-Scholes Model',
    source: 'Financial Mathematics',
    subject: 'Finance',
    content: 'Options pricing using volatility, time-to-expiry, and interest rate. Assumes log-normal asset returns.',
    latex: 'C = S_0 N(d_1) - K e^{-rT} N(d_2)',
    contributor: 'Lena B.',
    initials: 'LB',
    aura: 867,
    color: '#5C7A6B',
  },
  {
    id: '19',
    title: 'CRISPR-Cas9',
    source: 'Molecular Biology',
    subject: 'Biology',
    content: 'Guide RNA directs Cas9 to cut DNA at a precise sequence. Enables targeted gene editing in any organism.',
    excerpt: 'RNA-guided nuclease that cuts DNA at a specific sequence, enabling precise gene editing in any organism.',
    contributor: 'Riya M.',
    initials: 'RM',
    aura: 1392,
    color: '#8a9b75',
  },
  {
    id: '20',
    title: 'Mitosis Phases',
    source: 'Cell Biology',
    subject: 'Biology',
    content: 'Prophase→Metaphase→Anaphase→Telophase→Cytokinesis. One cell yields two genetically identical daughters.',
    excerpt: 'Prophase → Metaphase → Anaphase → Telophase → Cytokinesis. One cell divides into two genetically identical daughters.',
    contributor: 'Felix O.',
    initials: 'FO',
    aura: 214,
    color: '#4A6741',
  },
  {
    id: '21',
    title: 'Categorical Imperative',
    source: 'Ethics',
    subject: 'Philosophy',
    content: "Act only by rules you could will to be universal laws. Kant's deontological supreme principle of morality.",
    excerpt: "Act only according to maxims you could will to become universal laws. Kant's supreme principle of morality.",
    contributor: 'Ines H.',
    initials: 'IH',
    aura: 348,
    color: '#1a2f26',
  },
  {
    id: '22',
    title: 'Social Contract Theory',
    source: 'Political Philosophy',
    subject: 'Philosophy',
    content: 'Legitimate authority stems from consent: individuals trade some freedoms for social protection (Locke, Rousseau).',
    excerpt: 'Legitimate authority derives from an agreement among individuals to form society and surrender some freedoms for protection.',
    contributor: 'Tomas R.',
    initials: 'TR',
    aura: 276,
    color: '#5C7A6B',
  },
  {
    id: '23',
    title: "Dijkstra's Algorithm",
    source: 'Graph Theory',
    subject: 'Computer Science',
    content: 'Greedy shortest-path from a source using a min-heap. O((V+E) log V). Works on non-negative weights only.',
    code: 'dist[src] = 0\nheapq.heappush(pq, (0, src))',
    codeLabel: 'python',
    contributor: 'Sven L.',
    initials: 'SL',
    aura: 658,
    color: '#8a9b75',
  },
  {
    id: '24',
    title: 'P vs NP Problem',
    source: 'Complexity Theory',
    subject: 'Computer Science',
    content: 'Can every problem verifiable in polynomial time also be solved in polynomial time? Unsolved; one of 7 Millennium Prizes.',
    excerpt: 'If a solution can be verified in polynomial time, can it also be found in polynomial time? One of the Millennium Prize Problems.',
    contributor: 'Amara J.',
    initials: 'AJ',
    aura: 1201,
    color: '#4A6741',
  },
  {
    id: '25',
    title: 'TCP/IP Handshake',
    source: 'Computer Networks',
    subject: 'Computer Science',
    content: 'SYN → SYN-ACK → ACK establishes a reliable connection before any data is exchanged between client and server.',
    excerpt: 'SYN → SYN-ACK → ACK. Three-way handshake establishes a reliable connection before data transfer begins.',
    contributor: 'Kai W.',
    initials: 'KW',
    aura: 432,
    color: '#1a2f26',
  },
  {
    id: '26',
    title: 'Heisenberg Uncertainty',
    source: 'Quantum Mechanics',
    subject: 'Physics',
    content: 'Position and momentum cannot both be precisely known: Δx·Δp ≥ ℏ/2. A fundamental quantum limit, not a measurement flaw.',
    latex: '\\Delta x\\,\\Delta p \\geq \\dfrac{\\hbar}{2}',
    contributor: 'Nour A.',
    initials: 'NA',
    aura: 784,
    color: '#5C7A6B',
  },
  {
    id: '27',
    title: 'General Relativity',
    source: 'Physics',
    subject: 'Physics',
    content: 'Mass-energy curves spacetime; curvature governs motion. Predicts black holes, gravitational waves, and GPS corrections.',
    latex: 'G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\dfrac{8\\pi G}{c^4}T_{\\mu\\nu}',
    contributor: 'Zara E.',
    initials: 'ZE',
    aura: 2031,
    color: '#8a9b75',
  },
  {
    id: '28',
    title: 'Gradient Descent',
    source: 'Machine Learning',
    subject: 'AI / CS',
    content: 'Iteratively step opposite the gradient to minimise loss. Learning rate α controls step size; too large → diverge.',
    latex: '\\theta := \\theta - \\alpha\\,\\nabla_{\\theta}J(\\theta)',
    contributor: 'Jin P.',
    initials: 'JP',
    aura: 1563,
    color: '#1a2f26',
  },
]

// ── NootTile — compact icon card ──────────────────────────────────────

function NootTile({ card, onSelect }: { card: NootCardData; onSelect: (c: NootCardData) => void }) {
  const icon = card.latex ? '📐' : card.code ? '💻' : '📝'

  return (
    <div
      onClick={() => onSelect(card)}
      className="select-none cursor-pointer w-full h-full bg-parchment squircle-xl p-5 flex flex-row items-stretch gap-3 hover:shadow-[0_6px_20px_-6px_rgba(38,70,53,0.15)] hover:scale-[1.02] transition-all"
    >
      {/* Faint colored sidebar */}
      <div
        className="w-1 rounded-full self-stretch shrink-0"
        style={{ backgroundColor: card.color, opacity: 0.3 }}
      />

      {/* Content column */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        {/* Top: icon + title + subject */}
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-body)] text-base font-medium text-forest leading-snug truncate">
              {card.title}
            </p>
            <p className="font-mono text-[10px] text-sage/60 tracking-wider uppercase mt-0.5 truncate">
              {card.subject}
            </p>
          </div>
        </div>

        {/* Bottom: contributor avatar + aura badge */}
        <div className="flex items-center justify-between gap-1 mt-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-medium text-parchment shrink-0"
              style={{ backgroundColor: card.color }}
            >
              {card.initials[0]}
            </div>
            <span className="font-mono text-[8px] text-forest/30 truncate">{card.contributor}</span>
          </div>
          <span className="font-mono text-[8px] text-sage/50 bg-sage/[0.07] border border-sage/15 px-1.5 py-0.5 squircle-sm shrink-0 whitespace-nowrap">
            ✦ {card.aura.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── NootModal — full card detail overlay ──────────────────────────────

function NootModal({ card, onClose }: { card: NootCardData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-parchment squircle-xl p-6 max-w-md w-full shadow-2xl animate-fade-up"
        style={{ animationDuration: '0.18s', animationFillMode: 'both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-forest leading-snug">
              {card.title}
            </h2>
            <p className="font-mono text-[9px] text-sage/60 tracking-wider uppercase mt-1">
              {card.subject} · {card.source}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-forest/30 hover:text-forest/60 hover:bg-forest/[0.06] transition-all cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <p className="font-[family-name:var(--font-body)] text-sm text-forest/75 leading-relaxed mb-4">
          {card.content}
        </p>

        {/* Excerpt if present */}
        {card.excerpt && (
          <p className="font-[family-name:var(--font-body)] text-xs text-forest/50 leading-relaxed mb-4 pl-3 border-l-2 border-sage/30">
            {card.excerpt}
          </p>
        )}

        {/* Footer: contributor + aura */}
        <div className="flex items-center justify-between pt-3 border-t border-forest/[0.07]">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium text-parchment shrink-0"
              style={{ backgroundColor: card.color }}
            >
              {card.initials[0]}
            </div>
            <span className="font-mono text-[9px] text-forest/40">{card.contributor}</span>
          </div>
          <span className="font-mono text-[9px] text-sage/60 bg-sage/[0.07] border border-sage/15 px-2 py-1 squircle-sm">
            ✦ {card.aura.toLocaleString()} aura
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Drawer constants ───────────────────────────────────────────────────
//   ROW_H: total visible height of the drawer in collapsed state
//   = header bar (with drag pill) + top padding + one card row

const DRAWER_HEADER_H = 48   // px — drag pill (12) + label row (36)
const CARD_H          = 160  // px
const CARD_W          = 280  // px — ~4–5 visible per viewport width
const ROW_PADDING_TOP = 12   // px — gap above the card row
const ROW_H = DRAWER_HEADER_H + ROW_PADDING_TOP + CARD_H  // 220 px

// ── Marquee rows (expanded state) ─────────────────────────────────────

const CARDS_PER_ROW = 7
const CARD_ROWS: NootCardData[][] = (() => {
  const rows: NootCardData[][] = []
  for (let i = 0; i < RECOMMENDED.length; i += CARDS_PER_ROW) {
    rows.push(RECOMMENDED.slice(i, i + CARDS_PER_ROW))
  }
  return rows
})()

// ── Home ──────────────────────────────────────────────────────────────

export default function Home() {
  const { profile } = useAuth()
  const [input, setInput]           = useState('')
  const [activeMode, setActiveMode] = useState<AIMode>('Write')
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCard, setSelectedCard] = useState<NootCardData | null>(null)

  // DOM refs
  const contentRef     = useRef<HTMLDivElement>(null)
  const drawerRef      = useRef<HTMLDivElement>(null)
  const innerScrollRef = useRef<HTMLDivElement>(null)

  // Drawer position refs (avoid re-renders on every frame)
  const offsetRef    = useRef<number>(9999)
  const maxOffsetRef = useRef<number>(0)
  const measuredRef  = useRef(false)

  // Drag state refs
  const isDragging      = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartOffset = useRef(0)

  // Direct DOM mutation for high-frequency updates (avoids 60fps re-renders)
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
        applyOffset(mo)   // start collapsed
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyOffset])

  // Snap to nearest edge
  const snapToEdge = useCallback(() => {
    const cur = offsetRef.current
    const mo  = maxOffsetRef.current
    const to  = cur < mo / 2 ? 0 : mo
    applyOffset(to, true)
  }, [applyOffset])

  // ── Drag handle pointer events ─────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current      = true
    dragStartY.current      = e.clientY
    dragStartOffset.current = offsetRef.current
    if (drawerRef.current) drawerRef.current.style.userSelect = 'none'
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const deltaY = e.clientY - dragStartY.current
    const next   = Math.max(0, Math.min(maxOffsetRef.current, dragStartOffset.current + deltaY))
    applyOffset(next)
  }, [applyOffset])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    isDragging.current = false
    if (drawerRef.current) drawerRef.current.style.userSelect = ''
    const totalDelta = Math.abs(e.clientY - dragStartY.current)
    if (totalDelta < 6) {
      const target = offsetRef.current < maxOffsetRef.current / 2
        ? maxOffsetRef.current
        : 0
      applyOffset(target, true)
    } else {
      snapToEdge()
    }
  }, [applyOffset, snapToEdge])

  // ── Collapse button ────────────────────────────────────────────────

  const collapse = useCallback(() => {
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0
    applyOffset(maxOffsetRef.current, true)
  }, [applyOffset])

  // ── AI submit ─────────────────────────────────────────────────────

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
        <div
          ref={drawerRef}
          className="absolute inset-x-0 z-20"
          style={{ top: 0, bottom: 0, transform: 'translateY(100%)' }}
        >

          {/* ── Marquee keyframes ──────────────────────────────────────── */}
          <style>{`
            @keyframes marquee-right {
              from { transform: translateX(0); }
              to   { transform: translateX(-33.333%); }
            }
            @keyframes marquee-left {
              from { transform: translateX(-33.333%); }
              to   { transform: translateX(0); }
            }
            .marquee-row:hover .marquee-track {
              animation-play-state: paused;
            }
          `}</style>

          {/* ── Drawer header — drag handle ─────────────────────────────  */}
          <div
            className="bg-cream border-t border-forest/[0.08] shadow-[0_-3px_16px_-6px_rgba(38,70,53,0.07)] cursor-grab active:cursor-grabbing flex flex-col"
            style={{ height: `${DRAWER_HEADER_H}px`, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Pill indicator */}
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-forest/20" />
            </div>

            {/* Label row */}
            <div className="flex items-center justify-between px-6 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse-soft"
                  style={{ animationDuration: '2.4s' }}
                />
                <span className="font-mono text-[9px] text-forest/30 tracking-[0.3em] uppercase">
                  Recommended for you
                </span>
              </div>

              {isExpanded && (
                <button
                  onClick={e => { e.stopPropagation(); collapse() }}
                  onPointerDown={e => e.stopPropagation()}
                  className="flex items-center gap-1 font-mono text-[9px] text-forest/30 hover:text-forest/55 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  collapse
                </button>
              )}
            </div>
          </div>

          {/* ── All marquee rows — always rendered ─────────────────────── */}
          {/* The drawer's translateY naturally hides rows below the fold. */}
          {/* Dragging up progressively reveals each row — no content swap.*/}
          {/* overflow-y is hidden until fully expanded to avoid scroll     */}
          {/* conflicts during the drag transition.                         */}
          <div
            ref={innerScrollRef}
            className="bg-cream pb-10"
            style={{
              height: `calc(100% - ${DRAWER_HEADER_H}px)`,
              overflowY: isExpanded ? 'auto' : 'hidden',
            }}
          >
            <div className="space-y-4" style={{ paddingTop: `${ROW_PADDING_TOP}px` }}>
              {CARD_ROWS.map((rowCards, rowIdx) => (
                <div
                  key={rowIdx}
                  className="marquee-row overflow-x-hidden"
                  style={{ height: `${CARD_H}px`, opacity: 0.55 }}
                >
                  <div
                    className="marquee-track flex gap-3"
                    style={{
                      animation: `${rowIdx % 2 === 1 ? 'marquee-left' : 'marquee-right'} 30s linear infinite`,
                    }}
                  >
                    {[...rowCards, ...rowCards, ...rowCards].map((card, i) => (
                      <div
                        key={`${card.id}-${i}`}
                        className="shrink-0"
                        style={{ width: `${CARD_W}px`, height: `${CARD_H}px` }}
                      >
                        <NootTile card={card} onSelect={setSelectedCard} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Card detail modal ─────────────────────────────────────────── */}
      {selectedCard && (
        <NootModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
