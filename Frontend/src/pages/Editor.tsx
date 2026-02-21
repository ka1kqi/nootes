import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Navbar } from '../components/Navbar'
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
      onMouseDown={e => e.preventDefault()}
      className={`h-8 flex items-center justify-center text-forest/45 hover:text-forest/75 hover:bg-forest/[0.05] squircle-sm transition-all shrink-0 ${wide ? 'px-2.5 gap-1.5' : 'w-8'}`}
    >
      {children}
    </button>
  )
}

function TTypeBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      className={`h-8 px-2 flex items-center justify-center squircle-sm transition-all shrink-0 ${
        active
          ? 'bg-forest/[0.08] text-forest ring-1 ring-inset ring-forest/20'
          : 'text-forest/40 hover:text-forest/70 hover:bg-forest/[0.04]'
      }`}
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

  // ── Document sync (Personal fork for demo user) ─────────────────────────
  const { doc, loading, saveStatus, updateBlocks, saveNow } = useDocument('cs-ua-310', 'demo')

  // ── Master document (read-only) ─────────────────────────────────────────
  const [masterDoc, setMasterDoc] = useState<import('../hooks/useDocument').Document | null>(null)
  const [masterLoading, setMasterLoading] = useState(true)
  useEffect(() => {
    fetch('http://localhost:3001/api/repos/cs-ua-310/master')
      .then(r => r.json())
      .then(({ data }) => setMasterDoc(data))
      .catch(() => {})
      .finally(() => setMasterLoading(false))
  }, [])

  // Save on unmount / tab switch
  useEffect(() => { return () => saveNow() }, [saveNow])

  // ── TOC: derive headings from active document ───────────────────────────────
  const headings = useMemo(() => {
    const blocks = activeTab === 'write' ? (doc?.blocks ?? []) : (masterDoc?.blocks ?? [])
    return blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3')
  }, [activeTab, doc?.blocks, masterDoc?.blocks])

  // Scroll tracking: highlight the heading currently in view
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    const handleScroll = () => {
      const containerTop = scrollEl.getBoundingClientRect().top
      let activeId: string | null = null
      for (const h of [...headings].reverse()) {
        const el = document.getElementById(`block-${h.id}`)
        if (!el) continue
        const top = el.getBoundingClientRect().top - containerTop
        if (top <= 80) { activeId = h.id; break }
      }
      setActiveHeadingId(activeId ?? (headings[0]?.id ?? null))
    }
    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [headings])

  const scrollToHeading = useCallback((headingId: string) => {
    const scrollEl = scrollRef.current
    const el = document.getElementById(`block-${headingId}`)
    if (!el || !scrollEl) return
    const containerTop = scrollEl.getBoundingClientRect().top
    const elTop = el.getBoundingClientRect().top - containerTop
    scrollEl.scrollBy({ top: elTop - 24, behavior: 'smooth' })
  }, [])

  const tabCls = (tab: 'write' | 'preview') =>
    `px-3 py-1 font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-all ${
      activeTab === tab ? 'bg-forest text-parchment' : 'text-forest/40 hover:text-forest/70'
    }`

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

  return (
    <div className="h-screen overflow-hidden bg-cream flex flex-col stagger">
      <Navbar variant="light" />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — minimal geometric status */}
        {/* Main editor */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center gap-1 shrink-0">
            {/* Text type buttons — reflects and changes the focused block's type */}
            <div className="flex items-center gap-0.5">
              <TTypeBtn active={currentBlockType === 'paragraph'} onClick={() => editorRef.current?.setCurrentType('paragraph')} title="Paragraph">
                <span className="font-[family-name:var(--font-body)] text-[13px] leading-none">¶</span>
              </TTypeBtn>
              <TTypeBtn active={currentBlockType === 'h1'} onClick={() => editorRef.current?.setCurrentType('h1')} title="Heading 1">
                <span className="font-[family-name:var(--font-body)] text-[11px] font-bold leading-none tracking-tight">H<span className="text-[8px] align-sub">1</span></span>
              </TTypeBtn>
              <TTypeBtn active={currentBlockType === 'h2'} onClick={() => editorRef.current?.setCurrentType('h2')} title="Heading 2">
                <span className="font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-tight">H<span className="text-[8px] align-sub">2</span></span>
              </TTypeBtn>
              <TTypeBtn active={currentBlockType === 'h3'} onClick={() => editorRef.current?.setCurrentType('h3')} title="Heading 3">
                <span className="font-[family-name:var(--font-body)] text-[11px] font-medium leading-none tracking-tight">H<span className="text-[8px] align-sub">3</span></span>
              </TTypeBtn>
              <TTypeBtn active={currentBlockType === 'quote'} onClick={() => editorRef.current?.setCurrentType('quote')} title="Quote">
                <span className="font-[family-name:var(--font-body)] text-[15px] leading-none">"</span>
              </TTypeBtn>
            </div>
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
              <button onClick={() => setActiveTab('preview')} className={tabCls('preview')}>Master</button>
              <button onClick={() => setActiveTab('write')} className={tabCls('write')}>Personal</button>
            </div>
          </div>

          {/* Canvas — generous whitespace */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-10 px-10">
              {activeTab === 'preview' ? (
                <div>
                  {/* Master document header */}
                  <div className="mb-12">
                    <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">
                      {masterDoc ? `${masterDoc.course} / ${masterDoc.professor} / ${masterDoc.semester} — MASTER` : 'Loading…'}
                    </span>
                    <h1 className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6">
                      {masterDoc?.title ?? 'Master Notes'}
                    </h1>

                    {/* Decorative wave */}
                    <svg className="w-32 mb-6" viewBox="0 0 200 20" fill="none">
                      <path d="M0 10 C 16 2, 32 18, 48 10 C 64 2, 80 18, 96 10 C 112 2, 128 18, 144 10 C 160 2, 176 18, 200 10" stroke="#A3B18A" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
                    </svg>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">{masterDoc?.version ?? '…'}</span>
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

                  {/* Read-only BlockEditor rendering actual master .md file */}
                  {masterLoading ? (
                    <div className="flex flex-col gap-5 animate-pulse">
                      <div className="h-8 bg-forest/[0.05] squircle-xl w-2/3" />
                      <div className="h-4 bg-forest/[0.04] squircle-xl w-full" />
                      <div className="h-4 bg-forest/[0.04] squircle-xl w-5/6" />
                      <div className="h-24 bg-parchment border border-forest/[0.06] squircle-xl w-full" />
                    </div>
                  ) : masterDoc ? (
                    <BlockEditor
                      blocks={masterDoc.blocks}
                      onChange={() => {}}
                      readOnly
                    />
                  ) : (
                    <p className="font-mono text-[13px] text-forest/30 text-center py-16">Could not load master document.</p>
                  )}
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
            {headings.length === 0 ? (
              <span className="font-mono text-[10px] text-forest/20 italic">No headings yet</span>
            ) : headings.map(h => (
              <button
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                className={`text-left font-[family-name:var(--font-body)] text-xs transition-all squircle-sm px-2.5 py-1.5 ${h.type !== 'h1' ? 'pl-6' : ''} ${activeHeadingId === h.id ? 'text-forest font-medium bg-forest/[0.04]' : 'text-forest/35 hover:text-forest/60 hover:bg-forest/[0.02]'}`}
              >
                {h.content || <span className="opacity-40 italic">Untitled</span>}
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
