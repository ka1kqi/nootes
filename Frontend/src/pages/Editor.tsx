import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { BlockEditor, type BlockEditorHandle } from '../components/BlockEditor'
import { useDocument, type BlockType } from '../hooks/useDocument'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* Design 1 — "The Zen Canvas" (refined)                              */
/* All original functionality: toolbar, sidebars, source/preview,     */
/* code blocks, diagrams, tables, chemistry, comments.                */
/* Now with the clean breathing aesthetic of the Heytea Scroll:       */
/*   - softer borders & shadows, generous whitespace                  */
/*   - floating content cards, section labels, handwritten accents    */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

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
      className={`h-8 px-2 flex items-center justify-center squircle-sm transition-all shrink-0 ${active
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
  const [tabSwitched, setTabSwitched] = useState(false)
  const editorRef = useRef<BlockEditorHandle>(null)
  const pendingInsertRef = useRef<BlockType | null>(null)
  const [currentBlockType, setCurrentBlockType] = useState<BlockType>('paragraph')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  // ── Auth + routing ───────────────────────────────────────────────────────
  const { user } = useAuth()
  const { repoId = '' } = useParams<{ repoId: string }>()
  const location = useLocation()
  const repoMeta = location.state as { name?: string; code?: string; org?: string; field?: string; description?: string } | null

  // ── Document sync (Personal fork for this repo) ──────────────────────────
  const { doc, loading, saveStatus, updateBlocks, saveNow, undo, redo, updateTitle, updateTags } = useDocument(repoId, user?.id ?? '', repoMeta?.name)

  // ── Master document (read-only) ─────────────────────────────────────────
  const [masterDoc, setMasterDoc] = useState<import('../hooks/useDocument').Document | null>(null)
  const [masterLoading, setMasterLoading] = useState(true)
  useEffect(() => {
    fetch(`http://localhost:3001/api/repos/${repoId}/master`)
      .then(r => r.json())
      .then(({ data }) => setMasterDoc(data ? { tags: [], source_document_id: null, ...data } : null))
      .catch(() => { })
      .finally(() => setMasterLoading(false))
  }, [])

  // Flush any pending save on SPA navigation (tab-hide is handled inside useDocument)
  useEffect(() => { return () => saveNow() }, [saveNow])

  // Undo on Ctrl+Z / Cmd+Z (personal tab only)
  // Use capture phase so we intercept before the browser's native contenteditable undo.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z' || activeTab !== 'write') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [undo, redo, activeTab])

  // ── TOC: derive headings from active document ───────────────────────────────
  const headings = useMemo(() => {
    const blocks = activeTab === 'write' ? (doc?.blocks ?? []) : (masterDoc?.blocks ?? [])
    return blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3')
  }, [activeTab, doc?.blocks, masterDoc?.blocks])

  // ── Sidebar stats: block type counts + tags from active document ─────────
  const blockStats = useMemo(() => {
    const blocks = activeTab === 'write' ? (doc?.blocks ?? []) : (masterDoc?.blocks ?? [])
    const count = (type: string) => blocks.filter(b => b.type === type).length
    return [
      { label: 'LaTeX equations', count: count('latex') },
      { label: 'Code blocks',     count: count('code') },
      { label: 'Diagrams',        count: count('diagram') },
      { label: 'Tables',          count: count('table') },
      { label: 'Chemical eqs.',   count: count('chemistry') },
    ]
  }, [activeTab, doc?.blocks, masterDoc?.blocks])

  const activeTags = useMemo(() =>
    activeTab === 'write' ? (doc?.tags ?? []) : (masterDoc?.tags ?? []),
    [activeTab, doc?.tags, masterDoc?.tags]
  )

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

  // ── Insert block via toolbar ──────────────────────────────────────────────
  // If the write tab is already active, insert immediately.
  // If we're on the master preview tab, stash the type and switch tabs —
  // the effect below fires it once the editor is actually mounted.
  const insertBlock = useCallback((type: BlockType) => {
    if (activeTab !== 'write') {
      pendingInsertRef.current = type
      setActiveTab('write')
      setTabSwitched(true)
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
    <div className="h-screen overflow-hidden bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — minimal geometric status */}
        {/* Main editor */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center shrink-0 gap-0">
            {/* Insert buttons — clips if viewport too narrow; right side is always visible */}
            <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-1">
              {/* Text type buttons — reflects and changes the focused block's type */}
              <div className="flex items-center gap-0.5 shrink-0">
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
              <TBtn wide onClick={() => insertBlock('diagram')} title="Mermaid diagram">
                <span className="w-5 h-5 flex items-center justify-center bg-forest/[0.06] squircle-sm text-forest/50">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                </span>
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">Diagram</span>
              </TBtn>
            </div>{/* end scrollable left */}

            {/* Right side — always pinned, never pushed by insert buttons */}
            <div className="shrink-0 flex items-center gap-2 pl-2">
              {/* Save status — always rendered to hold space, invisible on master tab */}
              <span
                className="font-[family-name:var(--font-body)] text-[10px] text-forest/35 select-none shrink-0 w-0 whitespace-nowrap overflow-hidden text-right"
                style={{ visibility: activeTab === 'write' ? 'visible' : 'hidden' }}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : ''}
              </span>

              {/* Diff page link */}
              <Link
                to="/diff"
                className="flex items-center gap-1.5 h-7 px-3 border border-forest/15 squircle-sm font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase text-forest/40 hover:text-forest/70 hover:border-forest/25 transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4" />
                </svg>
                Diff
              </Link>

              {/* Master / Personal tab switcher — sliding indicator */}
              <div className="relative flex h-7 border border-forest/15 squircle-sm overflow-hidden shrink-0">
                {/* Sliding background pill */}
                <span
                  className="absolute inset-y-0 w-1/2 bg-forest transition-transform duration-200 ease-in-out"
                  style={{ transform: activeTab === 'write' ? 'translateX(100%)' : 'translateX(0%)' }}
                />
                <button
                  onClick={() => { setActiveTab('preview'); setTabSwitched(true) }}
                  className="relative z-10 w-19 flex items-center justify-center font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-colors duration-200"
                  style={{ color: activeTab === 'preview' ? '#E9E4D4' : 'rgba(38,70,53,0.4)' }}
                >Master</button>
                <button
                  onClick={() => { setActiveTab('write'); setTabSwitched(true) }}
                  className="relative z-10 w-19 flex items-center justify-center font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-colors duration-200"
                  style={{ color: activeTab === 'write' ? '#E9E4D4' : 'rgba(38,70,53,0.4)' }}
                >Personal</button>
              </div>
            </div>
          </div>

          {/* Canvas — generous whitespace */}
          <div ref={scrollRef} className="flex-1 overflow-y-scroll">
            <div className="max-w-3xl mx-auto py-10 px-10">

              {/* ── Master panel — always mounted, hidden when inactive ── */}
              <div className={tabSwitched ? 'animate-tab-enter' : ''} style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
                {/* Master document header */}
                <div className="mb-12">
                  <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">
                    {repoMeta ? `${repoMeta.code} · ${repoMeta.org} — MASTER` : repoId.toUpperCase()}
                  </span>
                  <h1 className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6">
                    {masterDoc?.title ?? 'Master Nootes'}
                  </h1>

                  {/* Decorative wave */}
                  <svg className="w-32 mb-6" viewBox="0 0 200 20" fill="none">
                    <path d="M0 10 C 16 2, 32 18, 48 10 C 64 2, 80 18, 96 10 C 112 2, 128 18, 144 10 C 160 2, 176 18, 200 10" stroke="#A3B18A" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
                  </svg>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">{masterDoc?.version ?? '…'}</span>
                    {(masterDoc as any)?.contributorCount != null && (
                      <>
                        <span className="font-mono text-[10px] text-forest/30">{(masterDoc as any).contributorCount} contributors</span>
                        <span className="text-forest/10">|</span>
                      </>
                    )}
                    {masterDoc?.updatedAt && (
                      <span className="font-mono text-[10px] text-forest/30">Last merged {relativeTime(masterDoc.updatedAt)}</span>
                    )}
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
                    onChange={() => { }}
                    readOnly
                  />
                ) : (
                  <p className="font-mono text-[13px] text-forest/30 text-center py-16">Could not load master document.</p>
                )}
              </div>

              {/* ── Personal panel — always mounted, hidden when inactive ── */}
              <div className={tabSwitched ? 'animate-tab-enter' : ''} style={{ display: activeTab === 'write' ? 'block' : 'none' }}>
                {/* Document header */}
                <div className="mb-12">
                  <span className="font-mono text-[10px] text-forest/25 tracking-[0.3em] uppercase block mb-4">
                    {repoId === 'scratch' ? 'PERSONAL SCRATCH PAD' : repoMeta ? `${repoMeta.code} · ${repoMeta.org} — PERSONAL` : repoId.toUpperCase()}
                  </span>
                  <input
                    type="text"
                    value={doc?.title ?? ''}
                    onChange={e => updateTitle(e.target.value)}
                    onBlur={e => { if (!e.target.value.trim()) updateTitle('My Noots') }}
                    placeholder="Untitled"
                    className="font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6 bg-transparent w-full outline-none border-b-2 border-transparent focus:border-forest/20 hover:border-forest/10 transition-colors placeholder-forest/20 caret-forest/40"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-[10px] text-sage bg-sage/[0.08] px-2.5 py-1 squircle-sm">
                      {doc?.version ?? '…'}
                    </span>
                    {doc?.source_document_id && (
                      <>
                        <span className="font-mono text-[10px] text-forest/30">Personal fork</span>
                        <span className="text-forest/10">|</span>
                      </>
                    )}
                    <span className={`font-mono text-[10px] transition-colors ${saveStatus === 'saved' ? 'text-sage/50' :
                        saveStatus === 'saving' ? 'text-amber-400' :
                          saveStatus === 'unsaved' ? 'text-amber-500' :
                            'text-sienna/50'
                      }`}>
                      {saveStatus === 'saved' && '✓ Saved'}
                      {saveStatus === 'saving' && '⏅ Saving…'}
                      {saveStatus === 'unsaved' && '● Unsaved'}
                      {saveStatus === 'offline' && '⚡ Offline'}
                    </span>
                    {/* Submit for merge — hidden on scratch pad */}
                    <button
                      className={`ml-auto flex items-center gap-2 px-4 py-1.5 bg-forest text-parchment font-[family-name:var(--font-body)] text-[11px] tracking-wide squircle-sm hover:bg-forest/80 transition-colors ${repoId === 'scratch' ? 'hidden' : ''}`}
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
                <span className={`font-mono text-[10px] transition-colors ${saveStatus === 'saved' ? 'text-sage/60' :
                    saveStatus === 'saving' ? 'text-amber-400' :
                      saveStatus === 'unsaved' ? 'text-amber-500' :
                        'text-sienna/50'
                  }`}>
                  {saveStatus === 'saved' && '✓ Saved'}
                  {saveStatus === 'saving' && 'Saving…'}
                  {saveStatus === 'unsaved' && 'Unsaved changes'}
                  {saveStatus === 'offline' && 'Backend offline'}
                </span>
              )}
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
              {blockStats.map(bt => bt.count > 0 && (
                <div key={bt.label} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-forest/30">{bt.label}</span>
                  <span className="font-mono text-[10px] text-sage/60 bg-sage/[0.06] px-1.5 py-0.5 squircle-sm">{bt.count}</span>
                </div>
              ))}
              {blockStats.every(bt => bt.count === 0) && (
                <span className="font-mono text-[10px] text-forest/20 italic">No special blocks yet</span>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-forest/[0.06]">
            <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 mb-4">Tags</h4>
            {activeTab === 'write' && (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
                  if (!tag || (doc?.tags ?? []).includes(tag)) { setTagInput(''); return }
                  updateTags([...(doc?.tags ?? []), tag])
                  setTagInput('')
                }}
                className="flex items-center gap-1 mb-2.5"
              >
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="add tag…"
                  className="flex-1 min-w-0 font-mono text-[10px] text-forest/50 bg-transparent border border-forest/10 focus:border-forest/25 outline-none px-2 py-1 squircle-sm placeholder-forest/20 transition-colors"
                />
                <button
                  type="submit"
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.05] squircle-sm transition-all"
                  title="Add tag"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </form>
            )}
            <div className="flex flex-wrap gap-1.5">
              {activeTags.length > 0 ? activeTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 font-mono text-[10px] text-forest/40 border border-forest/10 pl-2 pr-1 py-0.5 squircle-sm hover:bg-forest/[0.03] transition-colors">
                  {tag}
                  {activeTab === 'write' && (
                    <button
                      onClick={() => updateTags((doc?.tags ?? []).filter(t => t !== tag))}
                      className="text-forest/20 hover:text-sienna/60 transition-colors leading-none"
                      title="Remove tag"
                    >×</button>
                  )}
                </span>
              )) : (
                <span className="font-mono text-[10px] text-forest/20 italic">No tags</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
