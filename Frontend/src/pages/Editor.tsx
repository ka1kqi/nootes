import { useState, useEffect, useRef, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { CodeBlock } from '../components/CodeBlock'
import { BlockEditor, type BlockEditorHandle } from '../components/BlockEditor'
import { useDocument, type BlockType } from '../hooks/useDocument'

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

// ─── Toolbar helpers (scoped to this file) ────────────────────────────────────

function TBtn({ children, onClick, title, wide = false }: { children: React.ReactNode; onClick: () => void; title: string; wide?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-8 flex items-center justify-center text-forest/45 hover:text-forest/75 hover:bg-forest/[0.05] squircle-sm transition-all shrink-0 ${wide ? 'px-2.5 gap-1.5' : 'w-8'}`}
    >
      {children}
    </button>
  )
}

function TDivider() {
  return <div className="w-px h-4 bg-forest/10 mx-2.5 shrink-0" />
}

/* ------------------------------------------------------------------ */

export default function Design1() {
  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const editorRef = useRef<BlockEditorHandle>(null)
  const pendingInsertRef = useRef<BlockType | null>(null)
  const [currentBlockType, setCurrentBlockType] = useState<BlockType>('paragraph')

  // ── Document sync (Personal fork for demo user) ─────────────────────────
  const { doc, loading, saveStatus, updateBlocks, saveNow } = useDocument('cs-ua-310', 'demo')

  // Save on unmount / tab switch
  useEffect(() => { return () => saveNow() }, [saveNow])

  const handleTabChange = useCallback((tab: 'write' | 'preview') => setActiveTab(tab), [])

  // ── Insert block via toolbar ──────────────────────────────────────────────
  // If the write tab is already active, insert immediately.
  // If we're on the master preview tab, stash the type and switch tabs —
  // the effect below fires it once the editor is actually mounted.
  const insertBlock = useCallback((type: BlockType) => {
    if (activeTab !== 'write') {
      pendingInsertRef.current = type
      setActiveTab('write')
    } else {
      editorRef.current?.insertBlock(type)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'write' && pendingInsertRef.current) {
      const type = pendingInsertRef.current
      pendingInsertRef.current = null
      // Wait one tick for BlockEditor to mount after tab switch
      setTimeout(() => editorRef.current?.insertBlock(type), 0)
    }
  }, [activeTab])

  const tabCls = (tab: 'write' | 'preview') =>
    `px-3 py-1 font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-all ${
      activeTab === tab ? 'bg-forest text-parchment' : 'text-forest/40 hover:text-forest/70'
    }`

  return (
    <div className="h-screen overflow-hidden bg-cream flex flex-col stagger">
      <Navbar variant="light" />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — minimal geometric status */}
        {/* Main editor */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center gap-1 shrink-0">
            {/* Format dropdown — reflects and changes the focused block's type */}
            <select
              value={currentBlockType}
              onChange={e => editorRef.current?.setCurrentType(e.target.value as BlockType)}
              className="h-8 bg-transparent font-[family-name:var(--font-body)] text-[11px] text-forest/55 border border-forest/15 squircle-sm px-2 pr-6 focus:outline-none focus:border-forest/30 cursor-pointer shrink-0"
              title="Format current paragraph"
            >
              <option value="paragraph">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="quote">Quote</option>
            </select>
            <TDivider />
            {/* Rich / special blocks — icon chip + label */}
            <TBtn wide onClick={() => insertBlock('latex')} title="LaTeX equation (Σ)">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm font-mono text-[9px] text-forest/50">Σ</span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">LaTeX</span>
            </TBtn>
            <TBtn wide onClick={() => insertBlock('code')} title="Code block">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm text-forest/50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
              </span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Code</span>
            </TBtn>
            <TBtn wide onClick={() => insertBlock('chemistry')} title="Chemical equation">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm font-mono text-[9px] text-forest/50">⚗</span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Chem</span>
            </TBtn>
            <TBtn wide onClick={() => insertBlock('table')} title="Table (CSV)">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm text-forest/50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" /></svg>
              </span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Table</span>
            </TBtn>
            <TBtn wide onClick={() => insertBlock('callout')} title="Callout box">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm text-forest/50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
              </span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Callout</span>
            </TBtn>
            <TBtn wide onClick={() => insertBlock('divider')} title="Horizontal divider">
              <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm font-mono text-[11px] text-forest/50">&#x2014;</span>
              <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Rule</span>
            </TBtn>

            <div className="flex-1" />

            {/* Save status */}
            {activeTab === 'write' && (
              <span className="font-[family-name:var(--font-body)] text-[10px] text-forest/35 mr-3 select-none">
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error saving' : ''}
              </span>
            )}

            {/* Master / Personal tab switcher */}
            <div className="flex border border-forest/15 squircle-sm overflow-hidden shrink-0">
              <button onClick={() => handleTabChange('preview')} className={tabCls('preview')}>Master</button>
              <button onClick={() => handleTabChange('write')} className={tabCls('write')}>Personal</button>
            </div>
          </div>

          {/* Canvas — generous whitespace */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-10 px-10">
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
                /* ── Personal / editable view ────────────────────────────────── */
                <div>
                  {/* Document header */}
                  <div className="mb-12">
                    <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">
                      {doc ? `${doc.course} / ${doc.professor} / ${doc.semester} — PERSONAL` : 'Loading…'}
                    </span>
                    <h1 className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6">
                      {doc?.title ?? 'My Notes'}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">
                        {doc?.version ?? '…'}
                      </span>
                      <span className="font-mono text-[10px] text-forest/30">Personal fork</span>
                      <span className="text-forest/10">|</span>
                      <span className={`font-mono text-[10px] transition-colors ${
                        saveStatus === 'saved'   ? 'text-sage/50'   :
                        saveStatus === 'saving'  ? 'text-amber-400' :
                        saveStatus === 'unsaved' ? 'text-amber-500' :
                                                   'text-sienna/50'
                      }`}>
                        {saveStatus === 'saved'   && '✓ Saved'}
                        {saveStatus === 'saving'  && '⏳ Saving…'}
                        {saveStatus === 'unsaved' && '● Unsaved'}
                        {saveStatus === 'offline' && '⚡ Offline'}
                      </span>
                      {/* Submit for merge */}
                      <button
                        className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-forest text-parchment font-[family-name:var(--font-body)] text-[11px] tracking-wide squircle-sm hover:bg-forest/80 transition-colors"
                        onClick={() => {
                          saveNow()
                          alert('Merge request submitted! The semantic merge engine will process your fork in the next merge cycle.')
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        Submit for Merge
                      </button>
                    </div>
                  </div>

                  {/* ── Block editor ─────────────────────────────────────────── */}
                  {loading ? (
                    <div className="flex flex-col gap-5 animate-pulse">
                      <div className="h-8 bg-forest/[0.05] squircle-xl w-2/3" />
                      <div className="h-4 bg-forest/[0.04] squircle-xl w-full" />
                      <div className="h-4 bg-forest/[0.04] squircle-xl w-5/6" />
                      <div className="h-24 bg-parchment border border-forest/[0.06] squircle-xl w-full" />
                      <div className="h-4 bg-forest/[0.04] squircle-xl w-3/4" />
                    </div>
                  ) : doc ? (
                    <BlockEditor
                      ref={editorRef}
                      blocks={doc.blocks}
                      onChange={updateBlocks}
                      onFocusChange={type => setCurrentBlockType(type ?? 'paragraph')}
                    />
                  ) : (
                    <div className="text-center py-16">
                      <p className="font-mono text-[13px] text-forest/30">Could not load document.</p>
                      <p className="font-mono text-[11px] text-forest/20 mt-2">Make sure the backend is running on port 3001.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar — whisper-light */}
          <div className="border-t border-forest/[0.08] bg-cream px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-forest/30">LaTeX + Markdown</span>
              <span className="text-forest/10">|</span>
              <span className="font-mono text-[10px] text-forest/25">KaTeX v0.16 · Use toolbar to insert blocks</span>
            </div>
            <div className="flex items-center gap-4">
              {activeTab === 'write' && (
                <span className={`font-mono text-[10px] transition-colors ${
                  saveStatus === 'saved'   ? 'text-sage/60'   :
                  saveStatus === 'saving'  ? 'text-amber-400' :
                  saveStatus === 'unsaved' ? 'text-amber-500' :
                                            'text-sienna/50'
                }`}>
                  {saveStatus === 'saved'   && '✓ Saved'}
                  {saveStatus === 'saving'  && 'Saving…'}
                  {saveStatus === 'unsaved' && 'Unsaved changes'}
                  {saveStatus === 'offline' && 'Backend offline'}
                </span>
              )}
              <span className="font-mono text-[10px] text-sage/60">3 online</span>
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
