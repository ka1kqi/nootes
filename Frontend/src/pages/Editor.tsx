import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { BlockEditor, type BlockEditorHandle } from '../components/BlockEditor'
import { useDocument, type BlockType, type Document } from '../hooks/useDocument'
import { useAuth } from '../hooks/useAuth'
import { useEditorBridge } from '../contexts/EditorBridgeContext'
import { supabase } from '../lib/supabase'

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
  const [showTagsInfo, setShowTagsInfo] = useState(false)
  const tagsInfoRef = useRef<HTMLSpanElement>(null)

  // ── Auth + routing ───────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const { repoId = '' } = useParams<{ repoId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const repoMeta = location.state as { name?: string; code?: string; org?: string; field?: string; description?: string } | null

  // ── Document sync (Personal fork for this repo) ──────────────────────────
  const { doc, loading, saveStatus, updateBlocks, saveNow, undo, redo, updateTitle, updateTags, updateVisibility, updateMergePolicy } = useDocument(repoId, user?.id ?? '', repoMeta?.name)

  // ── Ownership: can the current user edit this document? ─────────────────
  // For scratch, always owner. For real docs, compare owner_user_id.
  const isOwner = repoId === 'scratch' || (doc !== null && doc.owner_user_id !== null && doc.owner_user_id === user?.id)

  // ── Fork button availability ─────────────────────────────────────────────
  // Enabled when: merge_policy === 'anyone', or invite_only + shared tags
  const userTags: string[] = profile?.tags ?? []
  const docTags: string[] = doc?.tags ?? []
  const hasSharedTags = docTags.some(t => userTags.includes(t))
  const forkEnabled = !isOwner && repoId !== 'scratch' && (
    doc?.merge_policy === 'anyone' ||
    (doc?.merge_policy === 'invite_only' && hasSharedTags)
  )

  // ── Fork handler ─────────────────────────────────────────────────────────
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)
  const handleFork = useCallback(async () => {
    if (!forkEnabled || !user || !doc) return
    setForking(true)
    setForkError(null)
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          owner_user_id:      user.id,
          source_document_id: repoId,
          title:              doc.title,
          blocks:             doc.blocks,
          tags:               doc.tags,
          access_level:       'private',
          is_public_root:     false,
          merge_policy:       'invite_only',
        })
        .select('id')
        .single()

      if (error || !data?.id) {
        setForkError(error?.message ?? 'Unknown error')
        console.error('Fork failed:', error)
        return
      }

      navigate(`/editor/${data.id}`, {
        state: repoMeta ? { ...repoMeta, name: `Fork of ${doc.title}` } : { name: `Fork of ${doc.title}` },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setForkError(msg)
      console.error('Fork error:', e)
    } finally {
      setForking(false)
    }
  }, [forkEnabled, user, doc, repoId, repoMeta, navigate])

  // ── Submit for merge handler ─────────────────────────────────────────────
  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ summary: string } | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)

  const handleSubmitMerge = useCallback(async () => {
    if (!doc?.source_document_id || !doc.blocks) return
    setMerging(true)
    setMergeResult(null)
    setMergeError(null)
    try {
      // 1. Save fork first so DB is up to date
      await saveNow()

      // 2. Fetch master blocks from Supabase
      const { data: masterRow, error: masterErr } = await supabase
        .from('documents')
        .select('blocks, title')
        .eq('id', doc.source_document_id)
        .single()

      if (masterErr || !masterRow) {
        setMergeError('Could not load master document.')
        return
      }

      // 3. Call merge endpoint via Vite proxy (local) or absolute URL (production)
      const apiBase = (() => {
        const url = import.meta.env.VITE_API_URL as string | undefined
        if (!url) return '/api'
        // In production the env var points to the real backend; strip last segment
        // In dev the Vite proxy handles /api/* → localhost:3001
        if (url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
        return url.replace(/\/[^/]+$/, '')
      })()
      const res = await fetch(`${apiBase}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_blocks: masterRow.blocks ?? [],
          fork_blocks:   doc.blocks,
          master_label:  `MASTER: ${masterRow.title ?? 'Master Document'}`,
          fork_label:    `FORK: ${doc.title ?? 'Fork'}`,
        }),
      })

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        setMergeError(detail?.detail ?? `Merge failed (${res.status})`)
        return
      }

      const mergeData = await res.json()
      const { merged_blocks, summary, raw_preview } = mergeData

      if (!merged_blocks?.length) {
        // Model found no differences — treat as success, not error
        setMergeResult({ summary: summary || 'No changes were made — the fork is already in sync with the master.' })
        return
      }

      // 4. Write merged blocks directly to the master document in Supabase
      const { error: updateErr } = await supabase
        .from('documents')
        .update({ blocks: merged_blocks })
        .eq('id', doc.source_document_id)

      if (updateErr) {
        setMergeError(`Could not update master: ${updateErr.message}`)
        return
      }

      setMergeResult({ summary })
    } catch (e) {
      setMergeError(e instanceof Error ? e.message : String(e))
    } finally {
      setMerging(false)
    }
  }, [doc, saveNow])
  const bridge = useEditorBridge()
  const blocksRef = useRef(doc?.blocks ?? [])
  useEffect(() => { blocksRef.current = doc?.blocks ?? [] }, [doc?.blocks])
  useEffect(() => {
    bridge.register({
      getBlocks: () => blocksRef.current,
      setBlocks: (blocks) => updateBlocks(blocks),
    })
    return () => bridge.unregister()
  }, [bridge, updateBlocks])

  // ── Master document (read-only) ─────────────────────────────────────────
  const [masterDoc, setMasterDoc] = useState<import('../hooks/useDocument').Document | null>(null)
  const [masterLoading, setMasterLoading] = useState(true)
  useEffect(() => {
    if (!doc) return
    ;(async () => {
      try {
        // For forks: master is source_document_id. For public roots: master is self. Otherwise: none.
        const masterId = doc.source_document_id ?? (doc.is_public_root ? repoId : null)
        if (!masterId) { setMasterDoc(null); setMasterLoading(false); return }
        const { data } = await supabase
          .from('documents')
          .select('id, title, version, tags, blocks, source_document_id, access_level, is_public_root, merge_policy, owner_user_id, updated_at')
          .eq('id', masterId)
          .maybeSingle()
        setMasterDoc(data ? {
          repoId: data.id,
          userId: data.owner_user_id ?? '',
          id: data.id,
          title: data.title,
          version: data.version ?? null,
          tags: Array.isArray(data.tags) ? data.tags : [],
          blocks: Array.isArray(data.blocks) ? data.blocks : [],
          source_document_id: data.source_document_id ?? null,
          access_level: data.access_level ?? 'public',
          is_public_root: data.is_public_root ?? false,
          merge_policy: data.merge_policy ?? 'invite_only',
          owner_user_id: data.owner_user_id ?? null,
          updatedAt: data.updated_at ?? '',
        } as Document : null)
      } catch { setMasterDoc(null) }
      finally { setMasterLoading(false) }
    })()
  }, [doc?.source_document_id, doc?.is_public_root, repoId])

  // ── Source document author ──────────────────────────────────────────────
  const [sourceAuthor, setSourceAuthor] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  useEffect(() => {
    if (!doc?.source_document_id) { setSourceAuthor(null); return }
    ;(async () => {
      try {
        const { data: srcDoc } = await supabase
          .from('documents')
          .select('owner_user_id')
          .eq('id', doc.source_document_id!)
          .maybeSingle()
        if (!srcDoc?.owner_user_id) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', srcDoc.owner_user_id)
          .maybeSingle()
        if (profile) setSourceAuthor(profile)
      } catch { /* ignore */ }
    })()
  }, [doc?.source_document_id])

  // ── TOC: derive headings from active document ───────────────────────────────
  const isFork = Boolean(doc?.source_document_id)

  // ── Check if current user already has a fork of this document ─────────
  const [userForkId, setUserForkId] = useState<string | null>(null)
  useEffect(() => {
    if (!user?.id || !repoId || repoId === 'scratch' || isFork) { setUserForkId(null); return }
    ;(async () => {
      try {
        const { data } = await supabase
          .from('documents')
          .select('id')
          .eq('owner_user_id', user.id)
          .eq('source_document_id', repoId)
          .maybeSingle()
        setUserForkId(data?.id ?? null)
      } catch { /* ignore */ }
    })()
  }, [user?.id, repoId, isFork])

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
    if (!isOwner) return
    if (activeTab !== 'write') {
      pendingInsertRef.current = type
      setActiveTab('write')
      setTabSwitched(true)
    } else {
      editorRef.current?.insertBlock(type)
    }
  }, [activeTab, isOwner])

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
          <div className={`border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center shrink-0 gap-0`}>
            {/* Insert buttons — greyed out for non-owners; toggle always active */}
            <div className={`flex-1 min-w-0 overflow-hidden flex items-center gap-1 ${!isOwner && activeTab === 'write' ? 'opacity-40 pointer-events-none' : ''}`}>
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
              {/* Save status + Diff — greyed for non-owners */}
              <div className={`flex items-center gap-2 ${!isOwner && activeTab === 'write' ? 'opacity-40 pointer-events-none' : ''}`}>
              {/* Save status — always rendered to hold space, invisible on master tab */}
              <span
                className="font-[family-name:var(--font-body)] text-[10px] text-forest/35 select-none shrink-0 w-0 whitespace-nowrap overflow-hidden text-right"
                style={{ visibility: activeTab === 'write' ? 'visible' : 'hidden' }}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : ''}
              </span>

              {/* Diff page link — only for forks */}
              {isFork && (
              <Link
                to="/diff"
                className="flex items-center gap-1.5 h-7 px-3 border border-forest/15 squircle-sm font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase text-forest/40 hover:text-forest/70 hover:border-forest/25 transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4" />
                </svg>
                Diff
              </Link>
              )}

              </div>{/* end greyed right items */}

              {/* Master / Personal tab switcher — for forks, or when user already has a fork of this doc */}
              {(isFork || userForkId) && (
              <div className="relative flex h-7 border border-forest/15 squircle-sm overflow-hidden shrink-0">
                {/* Sliding background pill — on master = left active, on personal fork = right active */}
                <span
                  className="absolute inset-y-0 w-1/2 bg-forest transition-transform duration-200 ease-in-out"
                  style={{ transform: (isFork ? activeTab === 'preview' : true) ? 'translateX(0%)' : 'translateX(100%)' }}
                />
                <button
                  onClick={() => {
                    if (isFork && doc?.source_document_id) {
                      navigate(`/editor/${doc.source_document_id}`)
                    } else {
                      setActiveTab('preview'); setTabSwitched(true)
                    }
                  }}
                  className="relative z-10 w-19 flex items-center justify-center font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-colors duration-200"
                  style={{ color: (isFork ? activeTab === 'preview' : !userForkId || true) ? '#E9E4D4' : 'rgba(38,70,53,0.4)' }}
                >Master</button>
                <button
                  onClick={() => {
                    if (userForkId) {
                      navigate(`/editor/${userForkId}`)
                    } else {
                      setActiveTab('write'); setTabSwitched(true)
                    }
                  }}
                  className="relative z-10 w-19 flex items-center justify-center font-[family-name:var(--font-body)] text-[11px] tracking-wider uppercase transition-colors duration-200"
                  style={{ color: (isFork ? activeTab === 'write' : false) ? '#E9E4D4' : 'rgba(38,70,53,0.4)' }}
                >Personal</button>
              </div>
              )}
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
                    onChange={e => isOwner && updateTitle(e.target.value)}
                    onBlur={e => { if (isOwner && !e.target.value.trim()) updateTitle('My Noots') }}
                    placeholder="Untitled"
                    readOnly={!isOwner}
                    className={`font-[family-name:var(--font-display)] text-7xl text-forest leading-[0.9] mb-6 bg-transparent w-full outline-none border-b-2 border-transparent transition-colors placeholder-forest/20 caret-forest/40 ${isOwner ? 'focus:border-forest/20 hover:border-forest/10' : 'cursor-default opacity-60'}`}
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
                    {/* Submit for merge — only for forks owned by current user */}
                    {isFork && isOwner && (
                    <div className="ml-auto flex flex-col items-end gap-1">
                    <button
                      disabled={merging}
                      className={`flex items-center gap-2 px-4 py-1.5 font-[family-name:var(--font-body)] text-[11px] tracking-wide squircle-sm transition-colors ${merging ? 'bg-forest/50 text-parchment/60 cursor-not-allowed' : 'bg-forest text-parchment hover:bg-forest/80'}`}
                      onClick={handleSubmitMerge}
                    >
                      {merging ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728l2.121 2.121M15.243 15.243l2.121 2.121" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      )}
                      {merging ? 'Merging…' : 'Submit for Merge'}
                    </button>
                    {mergeResult && (
                      <div className="mt-3 w-full bg-sage/[0.07] border border-sage/20 squircle-sm px-4 py-3">
                        <p className="font-[family-name:var(--font-body)] text-[10px] text-sage tracking-widest uppercase mb-2">Merge Summary</p>
                        <div className="font-mono text-[11px] text-forest/60 leading-relaxed whitespace-pre-wrap">{mergeResult.summary}</div>
                      </div>
                    )}
                    {mergeError && (
                      <span className="font-mono text-[10px] text-red-500/70 max-w-[280px] text-right leading-tight">{mergeError}</span>
                    )}
                    </div>
                    )}
                    {/* Fork button — shown when viewing someone else's document and not yet forked */}
                    {!isOwner && repoId !== 'scratch' && !userForkId && (
                    <div className="ml-auto flex flex-col items-end gap-1">
                    <button
                      disabled={!forkEnabled || forking}
                      title={
                        doc?.merge_policy === 'no_merges'
                          ? 'Forking is disabled for this document'
                          : doc?.merge_policy === 'invite_only' && !hasSharedTags
                          ? 'You need matching tags to fork this document'
                          : 'Fork this document to your workspace'
                      }
                      className={`flex items-center gap-2 px-4 py-1.5 font-[family-name:var(--font-body)] text-[11px] tracking-wide squircle-sm border transition-colors ${
                        forkEnabled && !forking
                          ? 'bg-sage/10 border-sage/40 text-forest hover:bg-sage/20 hover:border-sage/60 cursor-pointer'
                          : 'bg-forest/[0.03] border-forest/10 text-forest/30 cursor-not-allowed opacity-60'
                      }`}
                      onClick={handleFork}
                    >
                      {forking ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728l2.121 2.121M15.243 15.243l2.121 2.121" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                      {forking ? 'Forking…' : 'Fork'}
                    </button>
                    {forkError && (
                      <span className="font-mono text-[10px] text-red-500/70 max-w-[220px] text-right leading-tight">{forkError}</span>
                    )}
                    </div>
                    )}
                  </div>
                </div>

                {/* Source author attribution — shown for forked documents */}
                {doc?.source_document_id && sourceAuthor && (
                  <div className="flex items-center gap-2.5 mb-8 pb-6 border-b border-forest/[0.07]">
                    {sourceAuthor.avatar_url ? (
                      <img src={sourceAuthor.avatar_url} alt={sourceAuthor.display_name} className="w-6 h-6 rounded-full object-cover opacity-70" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-sage/30 flex items-center justify-center shrink-0">
                        <span className="font-mono text-[9px] text-forest/50">{sourceAuthor.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="font-[family-name:var(--font-body)] text-[11px] text-forest/40 tracking-wide">
                      Forked from <span className="text-forest/60">{sourceAuthor.display_name}</span>
                    </span>
                    <button
                      onClick={() => navigate(`/editor/${doc.source_document_id}`)}
                      className="ml-auto font-mono text-[10px] text-sage/60 hover:text-sage transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      View original
                    </button>
                  </div>
                )}

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
                    onChange={isOwner ? updateBlocks : () => {}}
                    onFocusChange={type => setCurrentBlockType(type ?? 'paragraph')}
                    readOnly={!isOwner}
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
        <aside className="w-56 border-l border-forest/[0.08] bg-cream shrink-0 hidden lg:flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
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
            <div className="flex items-center gap-1.5 mb-4">
              <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30">Tags</h4>
              <div className="relative">
                <span
                  ref={tagsInfoRef}
                  onMouseEnter={() => setShowTagsInfo(true)}
                  onMouseLeave={() => setShowTagsInfo(false)}
                  className="font-mono text-[8px] leading-none text-forest/30 border border-forest/15 rounded-full w-3 h-3 inline-flex items-center justify-center cursor-default select-none hover:text-forest/50 hover:border-forest/30 transition-colors"
                >i</span>
                {showTagsInfo && (() => {
                  const r = tagsInfoRef.current?.getBoundingClientRect()
                  if (!r) return null
                  return (
                    <div
                      style={{ position: 'fixed', top: r.top - 8, left: r.left - 220, zIndex: 9999, transform: 'translateY(-100%)' }}
                      className="w-52 bg-forest text-parchment font-mono text-[9px] leading-relaxed px-3 py-2.5 squircle-sm shadow-xl pointer-events-none"
                    >
                      Tags control who can view and collaborate on your document. Users with matching tags can view restricted documents, merge into invite-only documents, and contribute when merge policy is set to restricted.
                      <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-forest" />
                    </div>
                  )
                })()}
              </div>
            </div>
            {activeTab === 'write' && isOwner && (
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
                  {activeTab === 'write' && isOwner && (
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

          {/* Visibility — personal tab only, non-scratch only */}
          {activeTab === 'write' && repoId !== 'scratch' && (
            <div className={`mt-8 pt-6 border-t border-forest/[0.06] ${!isOwner ? 'opacity-40 pointer-events-none' : ''}`}>
              <h4 className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 mb-4">
                Visibility {!isOwner && <span className="normal-case tracking-normal ml-1">(read-only)</span>}
              </h4>
              <div className="flex flex-col gap-1.5">
                {(['private', 'restricted', 'public'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => isOwner && updateVisibility(level)}
                    disabled={!isOwner}
                    className={`text-left w-full flex items-center gap-2 px-2.5 py-1.5 squircle-sm font-mono text-[10px] transition-all ${
                      doc?.access_level === level
                        ? 'bg-forest/[0.06] text-forest'
                        : 'text-forest/35 hover:text-forest/60 hover:bg-forest/[0.03]'
                    } ${!isOwner ? 'cursor-default' : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      level === 'public'     ? 'bg-sage' :
                      level === 'restricted' ? 'bg-amber/70' :
                                               'bg-forest/25'
                    }`} />
                    {level}
                  </button>
                ))}
              </div>

              {/* Merge policy — only shown when public or restricted */}
              {(doc?.access_level === 'public' || doc?.access_level === 'restricted') && (
                <div className="mt-4">
                  <label className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest/30 block mb-2">Merge policy</label>
                  <select
                    value={doc?.merge_policy ?? 'invite_only'}
                    onChange={e => isOwner && updateMergePolicy(e.target.value as Document['merge_policy'])}
                    disabled={!isOwner}
                    className={`w-full bg-cream border border-forest/10 squircle-sm px-2.5 py-1.5 font-mono text-[10px] text-forest/60 focus:outline-none focus:border-forest/25 transition-colors ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <option value="no_merges">No merges</option>
                    <option value="invite_only">Invite only</option>
                    <option value="anyone">Anyone</option>
                  </select>
                </div>
              )}
            </div>
          )}
          </div>
        </aside>
      </div>
    </div>
  )
}
