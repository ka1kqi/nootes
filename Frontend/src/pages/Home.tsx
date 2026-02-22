import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import GraphView, { type TaskItem, type ExpandFn, type QueryFn } from './GraphView'
import { parseGraphResponse } from './Graph_Creation'
import { NootMarkdown } from '../components/NootMarkdown'
import { useEditorBridge, type BlockSpec } from '../contexts/EditorBridgeContext'

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
const CARD_H = 160  // px
const CARD_W = 280  // px — ~4–5 visible per viewport width
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

// ── Time-based greeting ────────────────────────────────────────────────

function getTimeGreeting(name: string): string {
  const hour = new Date().getHours()
  let prompts: string[]

  if (hour >= 5 && hour < 12) {
    prompts = [
      `Good morning, ${name}. What are we learning today?`,
      `Rise and think, ${name}. Brain's still warming up.`,
      `Morning mode: engaged. Let's explore something.`,
    ]
  } else if (hour >= 12 && hour < 17) {
    prompts = [
      `Afternoon, ${name}. Still curious? Good.`,
      `Post-lunch brain: surprisingly capable. Use it.`,
      `The afternoon slump is a lie. What's on your mind?`,
    ]
  } else if (hour >= 17 && hour < 21) {
    prompts = [
      `Evening, ${name}. Ideas get good around now.`,
      `Golden hour for learning. What's calling?`,
      `Brain's in flow state. Let's ride it.`,
    ]
  } else {
    prompts = [
      `Midnight curiosity? Let's feed it, ${name}.`,
      `Burning the midnight oil. Highly relatable.`,
      `Quiet hours, big thoughts. What are we exploring?`,
    ]
  }

  // stable within the same hour so it doesn't flicker on re-renders
  return prompts[hour % prompts.length]
}

// ── Home ──────────────────────────────────────────────────────────────

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string }
interface ConversationSummary { id: string; title: string | null; created_at: string; preview: string }

function apiBase(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (!url || url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
  return url.replace(/\/[^/]+$/, '')
}

export default function Home() {
  const { profile, user, sessionReady } = useAuth()
  const editorBridge = useEditorBridge()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [activeMode, setActiveMode] = useState<AIMode>('Write')
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCard, setSelectedCard] = useState<NootCardData | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const turnIndexRef = useRef(0)

  // DOM refs
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const innerScrollRef = useRef<HTMLDivElement>(null)

  // Drawer position refs (avoid re-renders on every frame)
  const offsetRef = useRef<number>(9999)
  const maxOffsetRef = useRef<number>(0)
  const measuredRef = useRef(false)

  // Drag state refs
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartOffset = useRef(0)

  // Direct DOM mutation for high-frequency updates (avoids 60fps re-renders)
  const applyOffset = useCallback((y: number, withTransition = false) => {
    const el = drawerRef.current
    if (!el) return
    const wasExpanded = offsetRef.current < 2
    const willExpand = y < 2
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
      const h = el.offsetHeight
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
    const mo = maxOffsetRef.current
    const to = cur < mo / 2 ? 0 : mo
    applyOffset(to, true)
  }, [applyOffset])

  // ── Drag handle pointer events ─────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartOffset.current = offsetRef.current
    if (drawerRef.current) drawerRef.current.style.userSelect = 'none'
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const deltaY = e.clientY - dragStartY.current
    const next = Math.max(0, Math.min(maxOffsetRef.current, dragStartOffset.current + deltaY))
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

  // ── Collapse / expand ──────────────────────────────────────────────

  const collapse = useCallback(() => {
    if (innerScrollRef.current) innerScrollRef.current.scrollTop = 0
    applyOffset(maxOffsetRef.current, true)
  }, [applyOffset])

  const expand = useCallback(() => {
    applyOffset(0, true)
  }, [applyOffset])

  // ── Graph expand / query ───────────────────────────────────────────

  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  // ── Conversation persistence ───────────────────────────────────────

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: profile?.id, context_type: 'home' })
      .select('id')
      .single()
    const newId = data?.id ?? crypto.randomUUID()
    setConversationId(newId)
    return newId
  }, [conversationId, profile?.id])

  const saveTurn = useCallback(async (
    convId: string, role: 'user' | 'assistant', content: string, index: number
  ) => {
    await supabase.from('conversation_turns').insert({
      conversation_id: convId,
      role,
      content,
      turn_index: index,
      render_mode: role === 'assistant' && parseGraphResponse(content) ? 'graph' : 'markdown',
    })
  }, [])

  const loadHistory = useCallback(async () => {
    if (!profile?.id) return
    setHistoryLoading(true)
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', profile.id)
      .eq('context_type', 'home')
      .order('created_at', { ascending: false })
      .limit(40)
    if (!convs?.length) { setHistoryList([]); setHistoryLoading(false); return }
    const { data: turns } = await supabase
      .from('conversation_turns')
      .select('conversation_id, content')
      .in('conversation_id', convs.map(c => c.id))
      .eq('role', 'user')
      .eq('turn_index', 0)
    const previewMap = Object.fromEntries((turns ?? []).map(t => [t.conversation_id, t.content]))
    setHistoryList(convs.map(c => ({
      id: c.id, title: c.title, created_at: c.created_at,
      preview: previewMap[c.id] ?? '…',
    })))
    setHistoryLoading(false)
  }, [profile?.id])

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('conversation_turns')
      .select('*')
      .eq('conversation_id', convId)
      .order('turn_index', { ascending: true })
    const msgs: ChatMessage[] = (data ?? [])
      .filter((t: any) => t.role === 'user' || t.role === 'assistant')
      .map((t: any) => ({ id: t.id, role: t.role as 'user' | 'assistant', content: t.content }))
    setMessages(msgs)
    setConversationId(convId)
    turnIndexRef.current = data?.length ?? 0
    historyRef.current = msgs.map(m => ({ role: m.role, content: m.content }))
    setShowHistory(false)
    setTimeout(() => {
      const el = messagesEndRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 80)
  }, [])

  const newConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    turnIndexRef.current = 0
    historyRef.current = []
  }, [])

  const expandTask: ExpandFn = useCallback(async (item, context, ancestors) => {
    const topPrompt = historyRef.current.find(m => m.role === 'user')?.content ?? ''
    let prompt = `Top-level goal: ${topPrompt}\n\nExpand this concept into 5–7 connected sub-concepts as a graph:\n${item.name}: ${item.text}`
    if (ancestors.length > 0)
      prompt += `\n\nAncestor chain: ${ancestors.map(a => a.name).join(' → ')}`
    if (context) prompt += `\n\nAdditional context: ${context}`

    const res = await fetch(`${apiBase()}/noot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    const parsed = parseGraphResponse(data.content ?? '')
    if (!parsed) throw new Error('Could not parse expansion response')
    return parsed
  }, [])

  const queryNode: QueryFn = useCallback(async (item, question, ancestors) => {
    const topPrompt = historyRef.current.find(m => m.role === 'user')?.content ?? ''
    const prompt = `Context: ${topPrompt}\nNode: ${item.name} — ${item.text}${ancestors.length > 0 ? `\nAncestors: ${ancestors.map(a => a.name).join(' → ')}` : ''}\n\nQuestion: ${question}`
    const res = await fetch(`${apiBase()}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    return data.content?.trim() ?? 'No response.'
  }, [])

  // ── AI submit ─────────────────────────────────────────────────────

  const submitQuery = useCallback(async () => {
    const q = input.trim()
    if (!q || aiLoading) return
    setInput('')

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q }
    const next = [...messages, userMsg]
    setMessages(next)
    setAiLoading(true)
    historyRef.current = [...historyRef.current, { role: 'user', content: q }]

    const scrollToBottom = () => {
      const el = messagesEndRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    setTimeout(scrollToBottom, 50)

    // Persist conversation + user turn
    const convId = await ensureConversation()
    const userTurnIdx = turnIndexRef.current++
    saveTurn(convId, 'user', q, userTurnIdx)

    try {
      const modeHints: Record<AIMode, string> = {
        'Write': '',
        'Graphs': '[Always respond with a concept graph in Mode B JSON format. Never use plain text.] ',
        'Concise': '[Be concise. Keep any graph to 4–5 nodes.] ',
        'Deep Analysis': '[Provide deep analysis. Use 6–7 nodes with thorough descriptions.] ',
      }
      const modeHint = modeHints[activeMode]
      const payload = next.map(m =>
        m.role === 'user'
          ? { role: m.role, content: modeHint + m.content }
          : { role: m.role, content: m.content }
      )
      const res = await fetch(`${apiBase()}/noot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      })
      const data = await res.json()
      const reply = data.content ?? data.detail ?? 'No response.'

      // Handle WRITE_TO_EDITOR mode
      if (reply.trimStart().startsWith('[WRITE_TO_EDITOR]')) {
        try {
          const body = reply.replace(/^\s*\[WRITE_TO_EDITOR\]\s*/, '')
          const rawStart = body.indexOf('[')
          const afterBracket = rawStart !== -1 ? body.slice(rawStart + 1).trimStart() : ''
          const arrStart = (rawStart !== -1 && afterBracket.startsWith('{')) ? rawStart : body.indexOf('[{')
          const arrEnd = body.lastIndexOf(']')
          if (arrStart !== -1 && arrEnd > arrStart) {
            const TYPE_MAP: Record<string, string> = {
              ul: 'bullet_list', ol: 'ordered_list', steps: 'ordered_list',
              list: 'bullet_list', numbered_list: 'ordered_list',
            }
            const raw = JSON.parse(body.slice(arrStart, arrEnd + 1))
            if (Array.isArray(raw) && raw.length > 0) {
              const blocks = raw.map((b: { type: string; content: unknown; meta?: unknown }) => ({
                ...b,
                id: crypto.randomUUID(),
                type: TYPE_MAP[b.type] ?? b.type,
              })) as BlockSpec[]
              if (editorBridge.isEditorActive) {
                editorBridge.insertBlocks(blocks)
              } else if (user) {
                // No editor open — create a new note and navigate to it
                // Use h1 block content as title, fall back to prompt text
                const h1Block = blocks.find((b: { type: string; content: unknown }) => b.type === 'h1')
                const rawTitle = (h1Block?.content as string | undefined) || q
                const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '…' : rawTitle
                const { data, error } = await supabase
                  .from('documents')
                  .insert({ owner_user_id: user.id, title, blocks, access_level: 'private', is_public_root: false })
                  .select('id')
                  .single()
                if (!error && data?.id) {
                  historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
                  setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Created note "${title}" — opening editor…` }])
                  saveTurn(convId, 'assistant', reply, turnIndexRef.current++)
                  navigate(`/editor/${data.id}`, { state: { name: title } })
                  return
                }
              }
            }
          }
        } catch { /* ignore parse errors */ }
      }

      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
      // Persist assistant turn (fire-and-forget)
      saveTurn(convId, 'assistant', reply, turnIndexRef.current++)
      // Auto-title conversation from first user message
      if (userTurnIdx === 0) {
        supabase.from('conversations').update({ title: q.slice(0, 80) }).eq('id', convId)
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Failed to reach the AI. Check your connection.' }])
    } finally {
      setAiLoading(false)
      setTimeout(() => {
        const el = messagesEndRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [input, activeMode, messages, aiLoading, ensureConversation, saveTurn, editorBridge, user, navigate])

  const firstName = profile?.display_name?.split(' ')[0] ?? 'you'
  const greeting = useMemo(() => getTimeGreeting(firstName), [firstName])

  // ── Live stats ────────────────────────────────────────────────────
  const [stats, setStats] = useState([
    { value: '—', label: 'nootes shared' },
    { value: '—', label: 'active learners' },
    { value: '—', label: 'nootbooks' },
  ])

  useEffect(() => {
    if (!sessionReady) return
    async function loadStats() {
      const [{ count: nootCount }, { count: userCount }, { count: repoCount }] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_public_root', true),
      ])
      setStats([
        { value: (nootCount ?? 0).toLocaleString(), label: 'nootes shared' },
        { value: (userCount ?? 0).toLocaleString(), label: 'active learners' },
        { value: (repoCount ?? 0).toLocaleString(), label: 'nootbooks' },
      ])
    }
    loadStats()
  }, [sessionReady])

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden">
      <style>{`
        @keyframes home-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Navbar variant="light" />

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 relative overflow-hidden">

        {/* ── History panel — slides in from left ──────────────────────── */}
        <div
          className="absolute inset-y-0 left-0 z-20 flex pointer-events-none"
          style={{ transition: 'opacity 0.25s ease' }}
        >
          {/* Backdrop */}
          {showHistory && (
            <div
              className="fixed inset-0 z-10 pointer-events-auto"
              onClick={() => setShowHistory(false)}
            />
          )}
          <div
            className="relative z-20 pointer-events-auto h-full flex flex-col bg-parchment border-r border-forest/10 shadow-[4px_0_32px_-8px_rgba(38,70,53,0.12)]"
            style={{
              width: 300,
              transform: showHistory ? 'translateX(0)' : 'translateX(-300px)',
              transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-forest/8">
              <span className="font-[family-name:var(--font-display)] text-sm text-forest/70">history</span>
              <button
                onClick={newConversation}
                className="text-[10px] font-[family-name:var(--font-body)] text-sage/60 hover:text-forest/70 transition-colors border border-forest/10 hover:border-forest/20 px-2 py-1 squircle cursor-pointer"
              >
                + new
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-2">
              {historyLoading && (
                <div className="flex items-center justify-center py-8">
                  <span className="w-4 h-4 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
                </div>
              )}
              {!historyLoading && historyList.length === 0 && (
                <p className="text-xs text-forest/30 font-[family-name:var(--font-body)] text-center py-8 px-4">no conversations yet</p>
              )}
              {!historyLoading && historyList.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-forest/[0.04] transition-colors border-b border-forest/[0.05] group cursor-pointer ${conversationId === conv.id ? 'bg-forest/[0.06]' : ''
                    }`}
                >
                  <p className="text-xs font-[family-name:var(--font-body)] text-forest/75 leading-snug line-clamp-2 group-hover:text-forest transition-colors">
                    {conv.title ?? conv.preview}
                  </p>
                  <p className="text-[10px] text-forest/30 mt-1 font-[family-name:var(--font-body)]">
                    {new Date(conv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Chatbox section — fills content area ─────────────────────── */}
        <div className="absolute inset-0 flex flex-col items-center px-6 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl h-full flex flex-col">

            {/* Empty state spacer + greeting — collapses when chat starts */}
            <div
              className="shrink-0 overflow-hidden"
              style={{
                maxHeight: messages.length === 0 ? '300px' : '0px',
                opacity: messages.length === 0 ? 1 : 0,
                transition: 'max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                pointerEvents: 'none',
              }}
            >
              <div style={{ height: 'max(72px, calc(33vh - 56px))' }} />
              <p
                className="font-[family-name:var(--font-display)] text-[2.2rem] text-forest/60 mb-6 tracking-tight text-center leading-snug select-none"
                style={{ animation: 'home-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0ms both' }}
              >
                {greeting}
              </p>
            </div>

            {/* Message thread — slides in when chat starts */}
            {messages.length > 0 && (
              <div
                ref={messagesEndRef}
                className="flex-1 overflow-y-auto pt-6 pb-2 flex flex-col gap-3"
                style={{ animation: 'home-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
              >
                <div className="mt-auto flex flex-col gap-3">
                  {messages.map((m) => {
                    if (m.role === 'assistant') {
                      // WRITE_TO_EDITOR response — show confirmation, not raw JSON
                      if (m.content.trimStart().startsWith('[WRITE_TO_EDITOR]')) {
                        const confirmation = m.content.split('\n').filter(l =>
                          !l.trimStart().startsWith('[WRITE_TO_EDITOR]') && !l.trimStart().startsWith('[')
                        ).join(' ').trim() || 'Wrote blocks to your notes.'
                        return (
                          <div key={m.id} className="flex justify-start" style={{ animation: 'home-fade-up 0.4s ease both' }}>
                            <div className="max-w-[85%] px-4 py-2.5 squircle-xl bg-parchment border border-sage/30 text-forest font-[family-name:var(--font-body)] text-sm leading-relaxed flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                                <path d="M2 7.5L5.5 11L12 4" stroke="#3D6B4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span>{confirmation}</span>
                            </div>
                          </div>
                        )
                      }
                      const parsed = parseGraphResponse(m.content)
                      if (parsed) {
                        return (
                          <div key={m.id} style={{ animation: 'home-fade-up 0.4s ease both' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 shrink-0 flex items-center justify-center border border-forest/20 bg-forest/[0.04] squircle-sm">
                                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                  <circle cx="7" cy="7" r="5" stroke="#8a9b75" strokeWidth="1.2" />
                                  <path d="M4 7 Q7 4 10 7 Q7 10 4 7Z" fill="#8a9b75" opacity="0.7" />
                                </svg>
                              </div>
                              <span className="font-mono text-[9px] text-sage/50 uppercase tracking-widest">{parsed.items.length} concepts</span>
                              <div className="flex-1 h-px bg-sage/20" />
                            </div>
                            <div className="border border-forest/10 squircle-xl overflow-hidden" style={{ height: 420 }}>
                              <GraphView key={m.id} items={parsed.items} onExpand={expandTask} onQuery={queryNode} />
                            </div>
                            {parsed.summary && (
                              <div className="mt-3 pl-3 border-l-2 border-sage/30">
                                <p className="font-[family-name:var(--font-body)] text-xs text-forest/55 leading-relaxed">{parsed.summary}</p>
                              </div>
                            )}
                          </div>
                        )
                      }
                    }
                    return (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 squircle-xl font-[family-name:var(--font-body)] text-sm leading-relaxed ${m.role === 'user'
                            ? 'bg-forest text-parchment whitespace-pre-wrap'
                            : 'bg-parchment border border-forest/10 text-forest'
                          }`}>
                          {m.role === 'user'
                            ? m.content
                            : <NootMarkdown>{m.content}</NootMarkdown>
                          }
                        </div>
                      </div>
                    )
                  })}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-parchment border border-forest/10 squircle-xl px-4 py-3 flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-sage/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input area — always pinned at bottom */}
            <div className="shrink-0 pb-6">

              {/* History / New chat controls — appear when conversation is active */}
              {messages.length > 0 && (
                <div className="flex items-center gap-2 mb-2" style={{ animation: 'home-fade-up 0.3s ease both' }}>
                  <button
                    onClick={() => { setShowHistory(h => { if (!h) loadHistory(); return !h }) }}
                    className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-body)] text-forest/40 hover:text-forest/70 transition-colors cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    history
                  </button>
                  <span className="text-forest/15 text-xs">·</span>
                  <button
                    onClick={newConversation}
                    className="text-[10px] font-[family-name:var(--font-body)] text-forest/40 hover:text-forest/70 transition-colors cursor-pointer"
                  >
                    + new chat
                  </button>
                </div>
              )}

              {/* AI Chatbox */}
              <div
                className="w-full bg-parchment border border-forest/[0.12] squircle-xl px-4 py-3 flex items-center gap-3 shadow-[0_4px_32px_-10px_rgba(38,70,53,0.08)] focus-within:border-sage/40 focus-within:shadow-[0_6px_32px_-10px_rgba(138,155,117,0.16)] transition-all"
                style={{ animation: 'home-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 80ms both' }}
              >

                {/* History toggle — visible in empty state too */}
                <button
                  onClick={() => { setShowHistory(h => { if (!h) loadHistory(); return !h }) }}
                  className="shrink-0 text-forest/25 hover:text-forest/50 transition-colors cursor-pointer"
                  title="Conversation history"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

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
                  placeholder={`Ask me anything, ${firstName}… or ⌘K to open noot`}
                  className="flex-1 bg-transparent text-sm text-forest placeholder:text-forest/30 outline-none font-[family-name:var(--font-body)]"
                />

                {/* Send */}
                <button
                  onClick={submitQuery}
                  disabled={!input.trim() || aiLoading}
                  className="shrink-0 w-9 h-9 bg-forest squircle-sm flex items-center justify-center text-parchment hover:bg-forest-deep transition-colors disabled:opacity-20 cursor-pointer"
                  aria-label="Send"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Mode pills */}
              <div
                className="flex items-center justify-center gap-2 mt-4"
                style={{ animation: 'home-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 160ms both' }}
              >
                {AI_MODES.map(mode => (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`font-[family-name:var(--font-body)] text-xs px-4 py-1.5 squircle transition-all cursor-pointer ${activeMode === mode
                        ? 'bg-forest text-parchment'
                        : 'border border-forest/15 text-forest/45 hover:border-forest/28 hover:text-forest/70'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Stats strip — hide during conversation */}
              {messages.length === 0 && (
                <div
                  className="flex items-center justify-center gap-2 mt-3"
                  style={{ animation: 'home-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 220ms both' }}
                >
                  {stats.map((s, i) => (
                    <span key={s.label} className="flex items-center gap-2">
                      {i > 0 && <span className="text-forest/10 font-mono text-xs select-none">·</span>}
                      <span className="font-mono text-[9px] text-forest/28 tracking-wider">
                        <span className="text-forest/40">{s.value}</span> {s.label}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nootes Drawer ────────────────────────────────────────────── */}
        <div
          ref={drawerRef}
          className="absolute inset-x-0 z-20 transition-opacity duration-300"
          style={{ top: 0, bottom: 0, transform: 'translateY(100%)', opacity: messages.length > 0 ? 0 : 1, pointerEvents: messages.length > 0 ? 'none' : 'auto' }}
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

              <button
                onClick={e => { e.stopPropagation(); isExpanded ? collapse() : expand() }}
                onPointerDown={e => e.stopPropagation()}
                className="flex items-center gap-1 font-mono text-[9px] text-forest/30 hover:text-forest/55 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    collapse
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    expand
                  </>
                )}
              </button>
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
                  className="marquee-row overflow-hidden"
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
