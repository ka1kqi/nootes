import { useState, useEffect, useRef, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'

/* ------------------------------------------------------------------ */
/* Design 1 — "The Zen Canvas" (refined)                              */
/* All original functionality: toolbar, sidebars, source/preview,     */
/* code blocks, diagrams, tables, chemistry, comments.                */
/* Now with the clean breathing aesthetic of the Heytea Scroll:       */
/*   - softer borders & shadows, generous whitespace                  */
/*   - floating content cards, section labels, handwritten accents    */
/* ------------------------------------------------------------------ */

function FlowDiagram() {
  return (
    <div className="my-8 bg-parchment border border-forest/10 squircle-xl p-8 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2.5 h-2.5 rounded-full bg-sage" />
        <span className="font-mono text-[10px] text-forest/40 tracking-wider uppercase">Flowchart: Binary Search Decision Tree</span>
      </div>
      <svg viewBox="0 0 600 320" className="w-full max-w-xl mx-auto" fill="none">
        <rect x="220" y="10" width="160" height="44" rx="22" fill="#264635" />
        <text x="300" y="37" textAnchor="middle" fill="#E9E4D4" fontSize="13" fontFamily="DM Sans">{"arr[mid] == target?"}</text>
        <line x1="260" y1="54" x2="160" y2="100" stroke="#A3B18A" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="190" y="78" fill="#A3B18A" fontSize="11" fontFamily="JetBrains Mono">No</text>
        <line x1="340" y1="54" x2="440" y2="100" stroke="#264635" strokeWidth="1.5" />
        <text x="400" y="78" fill="#264635" fontSize="11" fontFamily="JetBrains Mono">Yes</text>
        <rect x="370" y="100" width="140" height="40" rx="20" fill="#A3B18A" />
        <text x="440" y="125" textAnchor="middle" fill="#1A3228" fontSize="12" fontFamily="DM Sans">return mid</text>
        <rect x="70" y="100" width="180" height="44" rx="22" fill="#264635" />
        <text x="160" y="127" textAnchor="middle" fill="#E9E4D4" fontSize="13" fontFamily="DM Sans">{"arr[mid] < target?"}</text>
        <line x1="115" y1="144" x2="80" y2="195" stroke="#A3B18A" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="75" y="172" fill="#A3B18A" fontSize="11" fontFamily="JetBrains Mono">No</text>
        <line x1="205" y1="144" x2="260" y2="195" stroke="#264635" strokeWidth="1.5" />
        <text x="245" y="172" fill="#264635" fontSize="11" fontFamily="JetBrains Mono">Yes</text>
        <rect x="195" y="195" width="140" height="40" rx="20" fill="#E9E4D4" stroke="#264635" strokeWidth="1.5" />
        <text x="265" y="219" textAnchor="middle" fill="#264635" fontSize="11" fontFamily="JetBrains Mono">low = mid + 1</text>
        <rect x="10" y="195" width="140" height="40" rx="20" fill="#E9E4D4" stroke="#264635" strokeWidth="1.5" />
        <text x="80" y="219" textAnchor="middle" fill="#264635" fontSize="11" fontFamily="JetBrains Mono">high = mid - 1</text>
        <rect x="200" y="280" width="200" height="28" rx="14" fill="#A3B18A" fillOpacity="0.2" stroke="#A3B18A" strokeWidth="1" />
        <text x="300" y="298" textAnchor="middle" fill="#264635" fontSize="11" fontFamily="JetBrains Mono">{"repeat until low > high"}</text>
      </svg>
    </div>
  )
}

function ChemEquation({ equation, label }: { equation: string; label?: string }) {
  return (
    <div className="my-4 bg-parchment border border-forest/10 squircle px-6 py-4 flex items-center gap-4 shadow-[0_1px_12px_-4px_rgba(38,70,53,0.04)]">
      <div className="w-8 h-8 rounded-full bg-sienna/10 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-sienna/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </div>
      <div>
        {label && <span className="font-mono text-[9px] text-forest/30 tracking-[0.2em] uppercase block mb-1">{label}</span>}
        <KaTeX math={equation} className="text-sm" />
      </div>
    </div>
  )
}

function DataTable({ headers, rows, caption }: { headers: string[]; rows: string[][]; caption?: string }) {
  return (
    <div className="my-8 bg-parchment border border-forest/10 squircle-xl overflow-hidden shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
      {caption && (
        <div className="px-6 py-3 border-b border-forest/[0.06]">
          <span className="font-mono text-[10px] text-forest/40 tracking-wider">{caption}</span>
        </div>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="bg-forest/[0.03]">
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-3 font-[family-name:var(--font-body)] text-[10px] font-medium text-forest/50 tracking-[0.15em] uppercase border-b border-forest/[0.06]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-forest/[0.04] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-2.5 font-mono text-sm text-forest/80">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SAMPLE_CODE = `def binary_search(arr, target):
    """Search for target in sorted array using binary search.

    Time:  O(log n)
    Space: O(1)
    """
    low, high = 0, len(arr) - 1

    while low <= high:
        mid = (low + high) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1  # target not found`

const SAMPLE_LATEX = `\\section{The Chain Rule}

Let $f$ and $g$ be differentiable functions...

$$\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$$`

const collaborators = [
  { name: 'Aisha M.', color: '#264635', initials: 'AM' },
  { name: 'Jake T.', color: '#A3B18A', initials: 'JT' },
  { name: 'Priya K.', color: '#8B6E4E', initials: 'PK' },
]

const toolbarItems = [
  { icon: 'B', label: 'Bold', style: 'font-bold' },
  { icon: 'I', label: 'Italic', style: 'italic' },
  { icon: 'H1', label: 'Heading', style: 'text-xs' },
  { icon: 'H2', label: 'Subheading', style: 'text-xs' },
]

const insertBlockTypes = [
  { label: 'LaTeX', shortcut: '$$...$$', icon: '\u03A3', fullLabel: 'LaTeX Block' },
  { label: 'Code', shortcut: '```lang', icon: '<>', fullLabel: 'Code Block' },
  { label: 'Diagram', shortcut: '/diagram', icon: 'D', fullLabel: 'Diagram' },
  { label: 'Table', shortcut: '/table', icon: 'T', fullLabel: 'Table' },
  { label: 'Chemistry', shortcut: '/chem', icon: 'C', fullLabel: 'Chemical Eq.' },
  { label: 'Image', shortcut: '/img', icon: 'I', fullLabel: 'Image' },
]

function ToolbarButton({ children, active = false, className = '', title, onClick }: { children: React.ReactNode; active?: boolean; className?: string; title?: string; onClick?: () => void }) {
  return (
    <button title={title} onClick={onClick} className={`h-8 flex items-center justify-center text-sm transition-all squircle-sm ${active ? 'bg-forest text-parchment shadow-sm' : 'text-forest/50 hover:bg-forest/[0.06] hover:text-forest'} ${className}`}>
      {children}
    </button>
  )
}

function InsertMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="absolute top-full left-0 mt-2 bg-cream border border-forest/15 shadow-[0_8px_30px_-8px_rgba(38,70,53,0.12)] z-50 w-56 squircle overflow-hidden">
      {insertBlockTypes.map(opt => (
        <button key={opt.label} onClick={onClose} className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-forest/[0.03] transition-colors">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-forest/[0.06] squircle-sm font-mono text-[10px] text-forest/60">{opt.icon}</span>
            <span className="font-[family-name:var(--font-body)] text-sm text-forest/80">{opt.fullLabel}</span>
          </div>
          <span className="font-mono text-[10px] text-forest/25">{opt.shortcut}</span>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function Design1() {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('preview')
  const [insertMenuOpen, setInsertMenuOpen] = useState(false)
  const [showCollapsedInsert, setShowCollapsedInsert] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function check() {
      if (toolbarRef.current) setShowCollapsedInsert(toolbarRef.current.offsetWidth < 900)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleTabChange = useCallback((tab: 'write' | 'preview') => setActiveTab(tab), [])

  return (
    <div className="min-h-screen bg-cream flex flex-col stagger">
      <Navbar variant="light" />

      <div className="flex flex-1">
        {/* Left sidebar — minimal geometric status */}
        <aside className="w-12 border-r border-forest/[0.08] bg-cream flex flex-col items-center pt-5 pb-5 shrink-0">
          <div className="flex flex-col items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-sage/60" title="Synced" />
            <div className="w-4 h-4 squircle-sm bg-forest/15" title="No conflicts" />
            <div className="w-4 h-4 rotate-45 squircle-sm bg-forest/10" title="No pending" />
          </div>
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all" title="History">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all" title="Settings">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar — lighter, more air */}
          <div ref={toolbarRef} className="border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center gap-1">
            {toolbarItems.map(item => (
              <ToolbarButton key={item.label} className={`w-8 ${item.style}`} title={item.label}>{item.icon}</ToolbarButton>
            ))}
            <div className="w-px h-4 bg-forest/10 mx-2.5" />
            <ToolbarButton title="List" className="w-8"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M4 6h16M4 12h16M4 18h7" /></svg></ToolbarButton>
            <ToolbarButton title="Link" className="w-8"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg></ToolbarButton>
            <div className="w-px h-4 bg-forest/10 mx-2.5" />

            {!showCollapsedInsert ? (
              <div className="flex items-center gap-1">
                {insertBlockTypes.map(opt => (
                  <ToolbarButton key={opt.label} title={`${opt.fullLabel} (${opt.shortcut})`} className="px-2.5 gap-1.5">
                    <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm font-mono text-[9px] text-forest/50">{opt.icon}</span>
                    <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{opt.label}</span>
                  </ToolbarButton>
                ))}
              </div>
            ) : (
              <div className="relative">
                <ToolbarButton active={insertMenuOpen} className="px-3 gap-1" onClick={() => setInsertMenuOpen(!insertMenuOpen)}>
                  <span className="font-mono text-xs">+ Insert</span>
                </ToolbarButton>
                <InsertMenu open={insertMenuOpen} onClose={() => setInsertMenuOpen(false)} />
              </div>
            )}

            <div className="flex-1" />
            <div className="flex border border-forest/15 squircle-sm overflow-hidden shrink-0">
              <button onClick={() => handleTabChange('preview')} className={`px-3 py-1 font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-all ${activeTab === 'preview' ? 'bg-forest text-parchment' : 'text-forest/40 hover:text-forest/70'}`}>Master</button>
              <button onClick={() => handleTabChange('write')} className={`px-3 py-1 font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-all ${activeTab === 'write' ? 'bg-forest text-parchment' : 'text-forest/40 hover:text-forest/70'}`}>Personal</button>
            </div>
          </div>

          {/* Canvas — generous whitespace */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-16 px-10">
              {activeTab === 'preview' ? (
                <div>
                  {/* Title — breathing header */}
                  <div className="mb-16">
                    <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">CS-UA 310 / PROF. SIEGEL / SPRING 2026</span>
                    <h1 className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6">
                      Intro to<br />Algorithms
                    </h1>

                    {/* Decorative wave */}
                    <svg className="w-32 mb-6" viewBox="0 0 200 20" fill="none">
                      <path d="M0 10 C 16 2, 32 18, 48 10 C 64 2, 80 18, 96 10 C 112 2, 128 18, 144 10 C 160 2, 176 18, 200 10" stroke="#A3B18A" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
                    </svg>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">v3.2.1</span>
                      <span className="font-mono text-[10px] text-forest/30">47 contributors</span>
                      <span className="text-forest/10">|</span>
                      <span className="font-mono text-[10px] text-forest/30">Last merged 2h ago</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      {collaborators.map(c => (
                        <div key={c.initials} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-parchment border-2 border-cream shadow-sm" style={{ backgroundColor: c.color }} title={c.name}>{c.initials}</div>
                      ))}
                      <span className="font-mono text-[10px] text-sage/60 ml-1">3 online</span>
                    </div>
                  </div>

                  {/* Content — clean floating sections */}
                  <div className="font-[family-name:var(--font-body)] text-forest">

                    {/* Section: Chain Rule */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">DIFFERENTIATION</span>
                      <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest mb-6 leading-tight">The Chain Rule</h2>
                      <p className="leading-relaxed mb-6 text-[15px] text-forest/70">
                        Let <KaTeX math="f" /> and <KaTeX math="g" /> be differentiable functions. Then the composite function <KaTeX math="f \circ g" /> is differentiable, and
                      </p>
                      <div className="bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                        <KaTeX math="\frac{d}{dx}\bigl[f\bigl(g(x)\bigr)\bigr] = f'\bigl(g(x)\bigr) \cdot g'(x)" display />
                      </div>
                    </div>

                    {/* Section: Example */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">WORKED EXAMPLE</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Applying the Rule</h3>
                      <p className="leading-relaxed mb-4 text-[15px] text-forest/70">Find <KaTeX math="\frac{d}{dx}\bigl[\sin(x^2)\bigr]" />.</p>
                      <p className="leading-relaxed mb-6 text-[15px] text-forest/70">Let <KaTeX math="f(u) = \sin(u)" /> and <KaTeX math="g(x) = x^2" />. Then:</p>
                      <div className="bg-sage/[0.06] border border-sage/15 p-8 squircle-xl">
                        <KaTeX math="\frac{d}{dx}\bigl[\sin(x^2)\bigr] = \cos(x^2) \cdot 2x" display />
                        <p className="font-[family-name:var(--font-display)] text-lg text-sage/50 mt-3 text-center">
                          outer derivative times inner derivative
                        </p>
                      </div>
                    </div>

                    {/* Section: Leibniz Rule */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">GENERALIZATION</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">General Leibniz Rule</h3>
                      <p className="leading-relaxed mb-6 text-[15px] text-forest/70">For the <KaTeX math="n" />-th derivative of a product:</p>
                      <div className="bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                        <KaTeX math="(fg)^{(n)} = \sum_{k=0}^{n} \binom{n}{k} f^{(k)} \, g^{(n-k)}" display />
                      </div>

                      <p className="leading-relaxed mt-8 mb-6 text-[15px] text-forest/70">The Jacobian matrix of partial derivatives:</p>
                      <div className="bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                        <KaTeX math="\mathbf{J} = \begin{bmatrix} \dfrac{\partial f_1}{\partial x_1} & \cdots & \dfrac{\partial f_1}{\partial x_n} \\[1em] \vdots & \ddots & \vdots \\[1em] \dfrac{\partial f_m}{\partial x_1} & \cdots & \dfrac{\partial f_m}{\partial x_n} \end{bmatrix}" display />
                      </div>
                    </div>

                    {/* Decorative divider */}
                    <div className="flex items-center justify-center py-4 gap-3 mb-12">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest/10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sage/20" />
                      <div className="w-1.5 h-1.5 rounded-full bg-forest/10" />
                    </div>

                    {/* Section: Code */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">IMPLEMENTATION</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-3">Binary Search</h3>
                      <p className="text-[15px] text-forest/60 leading-relaxed mb-6">
                        A classic binary search in Python demonstrating <KaTeX math="O(\log n)" /> time complexity.
                      </p>
                      <CodeBlock code={SAMPLE_CODE} language="python" filename="binary_search.py" />
                    </div>

                    {/* Section: Diagram */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">VISUAL</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-3">Decision Flow</h3>
                      <p className="text-[15px] text-forest/60 leading-relaxed mb-4">The binary search algorithm follows this decision tree on each iteration:</p>
                      <FlowDiagram />
                    </div>

                    {/* Section: Complexity */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">ANALYSIS</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-3">Complexity Comparison</h3>
                      <DataTable
                        caption="Table 1. Comparison of search algorithms"
                        headers={['Algorithm', 'Best', 'Average', 'Worst', 'Space']}
                        rows={[
                          ['Linear Search', 'O(1)', 'O(n)', 'O(n)', 'O(1)'],
                          ['Binary Search', 'O(1)', 'O(log n)', 'O(log n)', 'O(1)'],
                          ['Hash Table', 'O(1)', 'O(1)', 'O(n)', 'O(n)'],
                          ['BST Search', 'O(1)', 'O(log n)', 'O(n)', 'O(n)'],
                        ]}
                      />
                    </div>

                    {/* Decorative divider */}
                    <div className="flex items-center justify-center py-4 gap-3 mb-12">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest/10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sage/20" />
                      <div className="w-1.5 h-1.5 rounded-full bg-forest/10" />
                    </div>

                    {/* Section: Chemistry */}
                    <div className="mb-16">
                      <span className="font-mono text-[9px] text-sienna/40 tracking-[0.3em] uppercase block mb-3">CROSS-DOMAIN</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-3">Chemistry</h3>
                      <p className="text-[15px] text-forest/60 leading-relaxed mb-6">Nootes supports domain-specific notation. Here are chemical equilibria rendered inline:</p>
                      <ChemEquation label="Haber Process" equation="\text{N}_2 + 3\text{H}_2 \rightleftharpoons 2\text{NH}_3 \quad (\Delta H = -92.4 \;\text{kJ/mol})" />
                      <ChemEquation label="Water Electrolysis" equation="2\text{H}_2\text{O}(\ell) \rightarrow 2\text{H}_2(g) + \text{O}_2(g)" />
                    </div>

                    {/* Comment — softer card */}
                    <div className="bg-sage/[0.04] border border-sage/15 p-6 squircle-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-[9px] text-parchment font-medium shadow-sm">JT</div>
                        <div>
                          <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Jake T.</span>
                          <span className="font-mono text-[10px] text-forest/25 ml-2">3h ago</span>
                        </div>
                        <span className="font-mono text-[9px] px-2 py-0.5 bg-sage/[0.08] text-sage/50 squircle-sm ml-auto">212 aura</span>
                      </div>
                      <p className="font-[family-name:var(--font-display)] text-xl text-forest/50 leading-relaxed">
                        Should we add the iterative vs recursive comparison here? The table helps but a side-by-side code block would be great.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-16">
                    <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">CS-UA 310 / PROF. SIEGEL / SPRING 2026 — PERSONAL NOTES</span>
                    <h1 className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6">
                      Intro to<br />Algorithms
                    </h1>
                    <p className="text-[15px] text-forest/60 mb-2">Personal Edition with Annotations</p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">v3.2.1+personal</span>
                      <span className="font-mono text-[10px] text-forest/30">Your edits</span>
                    </div>
                  </div>

                  <div className="font-[family-name:var(--font-body)] text-forest mb-16">
                    <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">DIFFERENTIATION</span>
                    <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest mb-6 leading-tight">The Chain Rule</h2>
                    <p className="leading-relaxed mb-6 text-[15px] text-forest/70">
                      Let <KaTeX math="f" /> and <KaTeX math="g" /> be differentiable functions. Then the composite function <KaTeX math="f \circ g" /> is differentiable, and
                    </p>
                    <div className="bg-parchment border border-forest/10 p-8 squircle-xl shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                      <KaTeX math="\frac{d}{dx}\bigl[f\bigl(g(x)\bigr)\bigr] = f'\bigl(g(x)\bigr) \cdot g'(x)" display />
                    </div>
                    <p className="text-[15px] text-forest/60 mt-4 border-l-4 border-sage/40 pl-4"><strong>📌 Personal Note:</strong> Remember the "outside-inside" rule! Apply the derivative of the outer function first, then multiply by the derivative of the inner function.</p>
                  </div>

                  <div className="font-[family-name:var(--font-body)] text-forest mb-16">
                    <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">WORKED EXAMPLE (WITH UPDATES)</span>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Applying the Rule</h3>
                    <p className="leading-relaxed mb-4 text-[15px] text-forest/70">Find <KaTeX math="\frac{d}{dx}\bigl[\sin(x^2)\bigr]" />.</p>
                    <p className="leading-relaxed mb-6 text-[15px] text-forest/70">Let <KaTeX math="f(u) = \sin(u)" /> and <KaTeX math="g(x) = x^2" />. Then:</p>
                    <div className="bg-sage/[0.06] border border-sage/15 p-8 squircle-xl">
                      <KaTeX math="\frac{d}{dx}\bigl[\sin(x^2)\bigr] = \cos(x^2) \cdot 2x" display />
                      <p className="font-[family-name:var(--font-display)] text-lg text-sage/50 mt-3 text-center">
                        outer derivative times inner derivative
                      </p>
                    </div>
                    <p className="text-[15px] text-forest/60 mt-4 border-l-4 border-sage/40 pl-4"><strong>📌 Personal Note:</strong> This is a super important pattern! See how we get <KaTeX math="\cos(x^2)" /> (outer deriv evaluated at inner) times <KaTeX math="2x" /> (inner deriv).</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar — whisper-light */}
          <div className="border-t border-forest/[0.08] bg-cream px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-forest/30">Line 1, Col 1</span>
              <span className="font-mono text-[10px] text-forest/30">LaTeX + Markdown</span>
              <span className="text-forest/10">|</span>
              <span className="font-mono text-[10px] text-forest/25">KaTeX v0.16</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-sage/60">3 online</span>
              <span className="font-mono text-[10px] text-forest/25">Autosaved</span>
            </div>
          </div>
        </main>

        {/* Right sidebar — airy TOC */}
        <aside className="w-56 border-l border-forest/[0.08] bg-cream p-5 shrink-0 hidden lg:block">
          <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 mb-5">Contents</h4>
          <nav className="flex flex-col gap-1">
            {[
              { label: 'The Chain Rule', level: 0, active: true },
              { label: 'Applying the Rule', level: 1, active: false },
              { label: 'General Leibniz Rule', level: 1, active: false },
              { label: 'Binary Search', level: 1, active: false },
              { label: 'Decision Flow', level: 1, active: false },
              { label: 'Complexity Comparison', level: 1, active: false },
              { label: 'Chemistry', level: 1, active: false },
              { label: 'Product Rule', level: 0, active: false },
              { label: 'Quotient Rule', level: 0, active: false },
            ].map((item, i) => (
              <button key={i} className={`text-left font-[family-name:var(--font-body)] text-xs transition-all squircle-sm px-2.5 py-1.5 ${item.level === 1 ? 'pl-6' : ''} ${item.active ? 'text-forest font-medium bg-forest/[0.04]' : 'text-forest/35 hover:text-forest/60 hover:bg-forest/[0.02]'}`}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-forest/[0.06]">
            <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 mb-4">Block Types</h4>
            <div className="flex flex-col gap-2">
              {[{ label: 'LaTeX equations', count: 4 }, { label: 'Code blocks', count: 1 }, { label: 'Diagrams', count: 1 }, { label: 'Tables', count: 1 }, { label: 'Chemical eqs.', count: 2 }].map(bt => (
                <div key={bt.label} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-forest/30">{bt.label}</span>
                  <span className="font-mono text-[10px] text-sage/60 bg-sage/[0.06] px-1.5 py-0.5 squircle-sm">{bt.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-forest/[0.06]">
            <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 mb-4">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {['exam-relevant', 'midterm', 'derivatives', 'algorithms'].map(tag => (
                <span key={tag} className="font-mono text-[10px] text-forest/40 border border-forest/10 px-2 py-0.5 squircle-sm hover:bg-forest/[0.03] transition-colors">{tag}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
