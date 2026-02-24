import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { useUserDocuments, deleteDocument, updateDocumentFolder, type UserDocument } from '../hooks/useMyRepos'
import { NewNootModal } from '../components/NewNootModal'

/**
 * MyRepos.tsx — Personal nootbook dashboard.
 *
 * Lists all documents owned by the authenticated user with semantic search
 * (cosine similarity against server-side embeddings) and a title substring
 * fallback. Provides inline delete with a confirmation overlay and a modal
 * for creating new nootbooks.
 */

/** Converts a UTC date string to a human-friendly relative time label (e.g. "3d ago"). */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Computes the cosine similarity between two equal-length numeric vectors.
 * Used to rank documents by semantic relevance to a query embedding.
 *
 * @returns A score in [-1, 1]; returns 0 when either vector is the zero vector.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Resolves the base URL for the embedding API.
 * Uses `/api` proxy for local development; strips the trailing path segment
 * for production deployments where VITE_API_URL points to a specific endpoint.
 */
function apiBase(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (!url || url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
  return url.replace(/\/[^/]+$/, '')
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

/**
 * MyRepos page — personal nootbook dashboard.
 *
 * Renders the full list of the user's documents with semantic search,
 * per-document delete (with inline confirmation), and a "New Nootbook" modal.
 */
export default function MyRepos() {
  const { docs, loading, refetch } = useUserDocuments()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null)
  const [embedding, setEmbedding] = useState(false)
  const embedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Folder state ─────────────────────────────────────────────────────────────
  /** Currently selected folder filter — null means "show all documents". */
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  /** ID of the document currently being dragged for folder assignment. */
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null)
  /** The folder name currently hovered over during a drag operation. */
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  /** Locally created empty folders (visible until the page refreshes). */
  const [localFolders, setLocalFolders] = useState<string[]>([])
  /** Whether the new-folder name input is visible. */
  const [creatingFolder, setCreatingFolder] = useState(false)
  /** Value of the new-folder name input. */
  const [newFolderName, setNewFolderName] = useState('')

  /**
   * Extracts the folder name from a document's tags array.
   * Folder tags use the `folder:<name>` prefix convention stored in the DB.
   * @returns The folder name or null if the doc is uncategorised.
   */
  const getDocFolder = useCallback((doc: UserDocument): string | null => {
    const tag = (doc.tags ?? []).find(t => t.startsWith('folder:'))
    return tag ? tag.slice('folder:'.length) : null
  }, [])

  /** Unique sorted list of all folder names (from docs + any locally-created empty folders). */
  const allFolderNames = useMemo(() => {
    const fromDocs = new Set(
      docs.map(d => getDocFolder(d)).filter((f): f is string => f !== null),
    )
    return [...new Set([...localFolders, ...fromDocs])].sort()
  }, [docs, localFolders, getDocFolder])

  // Debounced semantic embed: fires 600 ms after the user stops typing
  useEffect(() => {
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current)
    if (!search.trim()) { setQueryEmbedding(null); return }

    embedTimerRef.current = setTimeout(async () => {
      setEmbedding(true)
      try {
        // Request a vector embedding for the search query from the backend.
        const res = await fetch(`${apiBase()}/embed/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: search.trim() }),
        })
        if (res.ok) {
          const { embedding: vec } = await res.json()
          // Only store valid arrays; guard against unexpected API shapes.
          setQueryEmbedding(Array.isArray(vec) ? vec : null)
        }
      } catch { /* non-fatal */ }
      finally { setEmbedding(false) }
    }, 600)

    return () => { if (embedTimerRef.current) clearTimeout(embedTimerRef.current) }
  }, [search])

  // Compute sorted+filtered list (search ranking first, then folder filter)
  const filtered = (() => {
    let base = docs

    if (search.trim()) {
      // If embedding is ready, rank by cosine similarity (docs without embeddings go last)
      if (queryEmbedding) {
        base = [...base]
          .map(d => ({
            doc: d,
            // Docs that have no stored embedding get score -1 so they sink to the bottom
            score: d.embedding ? cosineSimilarity(queryEmbedding, d.embedding) : -1,
          }))
          .sort((a, b) => b.score - a.score)  // descending: highest similarity first
          .map(({ doc }) => doc)
      } else {
        // While embedding is in-flight, fall back to title substring match
        base = base.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
      }
    }

    // Apply folder filter: null = all, '__none__' = uncategorised, else specific folder
    if (selectedFolder !== null) {
      if (selectedFolder === '__none__') {
        base = base.filter(d => !getDocFolder(d))
      } else {
        base = base.filter(d => getDocFolder(d) === selectedFolder)
      }
    }

    return base
  })()

  /**
   * Assigns a document to a folder (or removes it from all folders) by
   * updating the `folder:` tag in Supabase, then re-fetches the list.
   * @param targetFolder - Destination folder name or null for uncategorised.
   */
  const handleDropToFolder = async (targetFolder: string | null) => {
    if (!draggingDocId) return
    const { error } = await updateDocumentFolder(draggingDocId, targetFolder)
    if (error) setDeleteError(error)
    setDraggingDocId(null)
    setDragOverFolder(null)
    await refetch()
  }

  /**
   * Confirms creation of a new empty folder from the sidebar input.
   * The folder is added to `localFolders` so it appears in the sidebar
   * immediately even before any docs are moved into it.
   */
  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name || allFolderNames.includes(name)) return
    setLocalFolders(prev => [...prev, name])
    setSelectedFolder(name)
    setNewFolderName('')
    setCreatingFolder(false)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto stagger">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">DASHBOARD</span>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-3">
                Your Nootbooks
              </h1>
              <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/45">
                All the nootbooks you own, contribute to, or have forked.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Nootbook
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-parchment border border-forest/10 squircle-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-sage/[0.08] squircle-sm flex items-center justify-center text-sage/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div>
                <span className="font-[family-name:var(--font-display)] text-2xl text-forest block leading-none">
                  {docs.length}
                </span>
                <span className="font-mono text-[9px] text-forest/30 tracking-[0.15em] uppercase">Total Nootbooks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-5xl mx-auto px-6 pb-6">
          <div className="flex-1 min-w-[240px] relative">
            {embedding ? (
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage/60 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/30"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            )}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your nootbooks…"
              className="w-full bg-parchment border border-forest/10 squircle pl-10 pr-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/30 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
            />
            {queryEmbedding && search.trim() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-sage/50 tracking-widest uppercase">semantic</span>
            )}
          </div>
          {deleteError && (
            <p className="font-mono text-[11px] text-red-500/80 mt-2">{deleteError}</p>
          )}
        </div>

        {/* Folder tabs — each pill is a drop target for drag-and-drop assignment */}
        <div className="max-w-5xl mx-auto px-6 pb-5">
          <div className="flex items-center gap-2 flex-wrap">

            {/* "All" tab — dropping here removes folder assignment */}
            <button
              onClick={() => setSelectedFolder(null)}
              onDragOver={e => { e.preventDefault(); setDragOverFolder('__all__') }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={() => handleDropToFolder(null)}
              className={`font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 squircle-sm border transition-all ${
                selectedFolder === null
                  ? 'bg-forest text-parchment border-forest'
                  : dragOverFolder === '__all__'
                  ? 'bg-sage/20 border-sage text-forest'
                  : 'bg-parchment border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest/70'
              }`}
            >
              All ({docs.length})
            </button>

            {/* Uncategorised tab — docs with no folder: tag */}
            {docs.some(d => !getDocFolder(d)) && (
              <button
                onClick={() => setSelectedFolder('__none__')}
                onDragOver={e => { e.preventDefault(); setDragOverFolder('__none__') }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => handleDropToFolder(null)}
                className={`font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 squircle-sm border transition-all ${
                  selectedFolder === '__none__'
                    ? 'bg-forest text-parchment border-forest'
                    : dragOverFolder === '__none__'
                    ? 'bg-sage/20 border-sage text-forest'
                    : 'bg-parchment border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest/70'
                }`}
              >
                ◌ unfiled ({docs.filter(d => !getDocFolder(d)).length})
              </button>
            )}

            {/* One pill per named folder */}
            {allFolderNames.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                onDragOver={e => { e.preventDefault(); setDragOverFolder(folder) }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => handleDropToFolder(folder)}
                className={`font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 squircle-sm border transition-all flex items-center gap-1.5 ${
                  selectedFolder === folder
                    ? 'bg-forest text-parchment border-forest'
                    : dragOverFolder === folder
                    ? 'bg-sage/25 border-sage text-forest scale-105 shadow-[0_2px_12px_-2px_rgba(38,70,53,0.2)]'
                    : 'bg-parchment border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest/70'
                }`}
              >
                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                {folder}
                <span className="opacity-50">
                  ({docs.filter(d => getDocFolder(d) === folder).length})
                </span>
              </button>
            ))}

            {/* New folder creation — inline input or trigger button */}
            {creatingFolder ? (
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                }}
                onBlur={() => { if (!newFolderName.trim()) { setCreatingFolder(false) } }}
                placeholder="Folder name…"
                className="font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 squircle-sm border border-sage/50 bg-parchment text-forest outline-none focus:border-sage focus:ring-2 focus:ring-sage/15 w-32"
              />
            ) : (
              <button
                onClick={() => setCreatingFolder(true)}
                className="font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 squircle-sm border border-dashed border-forest/20 text-forest/35 hover:border-sage/50 hover:text-sage transition-all flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Folder
              </button>
            )}

          </div>

          {/* Drag hint — only visible while a card is being dragged */}
          {draggingDocId && (
            <p className="font-mono text-[9px] text-sage/50 mt-2 tracking-[0.15em] uppercase animate-pulse">
              Drop onto a folder tab above to move
            </p>
          )}
        </div>

        {/* Nootbook list */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-parchment border border-forest/10 squircle-xl p-5 animate-pulse">
                  <div className="flex gap-5">
                    <div className="w-1 h-10 rounded-full bg-forest/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-forest/[0.06] rounded" />
                      <div className="h-6 w-48 bg-forest/[0.06] rounded" />
                      <div className="h-3 w-64 bg-forest/[0.06] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 stagger-fast">
              {filtered.map(doc => (
                <div
                  key={doc.id}
                  className={`relative group transition-opacity ${draggingDocId === doc.id ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={e => {
                    /* Mark this doc as the one being dragged so drop targets know what to accept */
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingDocId(doc.id)
                  }}
                  onDragEnd={() => {
                    /* Reset drag state when the user releases the card anywhere */
                    setDraggingDocId(null)
                    setDragOverFolder(null)
                  }}
                >
                  {/* Delete button — fades in on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (deletingDocId) return
                      setConfirmDeleteId(doc.id)
                    }}
                    disabled={deletingDocId === doc.id}
                    className={`absolute top-3 right-3 z-10 px-2.5 py-1 font-mono text-[10px] squircle-sm border transition-all ${
                      deletingDocId === doc.id
                        ? 'bg-forest/[0.06] border-forest/10 text-forest/30 cursor-not-allowed opacity-100'
                        : 'bg-parchment/90 border-forest/15 text-sienna/70 hover:bg-sienna/10 hover:border-sienna/40 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Delete this nootbook"
                  >
                    {deletingDocId === doc.id ? 'Deleting…' : 'Delete'}
                  </button>

                  {/* Inline delete confirmation overlay */}
                  {confirmDeleteId === doc.id && (
                    <div
                      className="absolute inset-0 z-20 squircle-xl flex items-center justify-between px-5 gap-4 bg-parchment/95 backdrop-blur-sm border border-sienna/20"
                      onClick={e => e.preventDefault()}
                    >
                      <div className="min-w-0">
                        <p className="font-[family-name:var(--font-body)] text-sm text-forest/80 truncate">
                          Delete <span className="font-medium text-forest">"{doc.title}"</span>?
                        </p>
                        <p className="font-mono text-[10px] text-forest/35 mt-0.5">This cannot be undone.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 font-[family-name:var(--font-body)] text-xs text-forest/50 hover:text-forest/80 border border-forest/10 squircle-sm transition-colors bg-parchment"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setConfirmDeleteId(null)
                            setDeleteError(null)
                            setDeletingDocId(doc.id)
                            const { error } = await deleteDocument(doc.id)
                            setDeletingDocId(null)
                            if (error) { setDeleteError(error); return }
                            await refetch()
                          }}
                          className="px-3 py-1.5 font-[family-name:var(--font-body)] text-xs text-parchment bg-sienna/80 hover:bg-sienna squircle-sm transition-colors border border-sienna/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/editor/${doc.id}`}
                    className="bg-parchment border border-forest/10 squircle-xl p-5 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all hover:border-forest/20 block"
                  >
                    <div className="flex items-start gap-5">
                      <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
                        <div className="w-1 h-10 rounded-full bg-sage/40" />
                        {/* Drag handle dots — appear on hover to hint at draggability */}
                        <div className="opacity-0 group-hover:opacity-40 transition-opacity flex flex-col gap-0.5">
                          {[0,1,2].map(i => (
                            <div key={i} className="flex gap-0.5">
                              <div className="w-0.5 h-0.5 rounded-full bg-forest" />
                              <div className="w-0.5 h-0.5 rounded-full bg-forest" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-1">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="font-mono text-[9px] text-forest/25 uppercase tracking-wider">{doc.access_level}</span>
                          {/* Show the folder badge if this doc belongs to a folder */}
                          {getDocFolder(doc) && (
                            <span className="font-mono text-[9px] bg-sage/10 text-sage/70 px-1.5 py-0.5 squircle-sm flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                              </svg>
                              {getDocFolder(doc)}
                            </span>
                          )}
                          {(doc.required_user_tags ?? []).slice(0, 4).map(tag => (
                            <span key={tag} className="font-mono text-[9px] bg-forest/[0.05] text-forest/35 px-1.5 py-0.5 squircle-sm">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right hidden md:flex flex-col items-end gap-3">
                        <span className="font-mono text-[10px] text-forest/25 transition-opacity group-hover:opacity-0">{timeAgo(doc.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}

              {!loading && filtered.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-[family-name:var(--font-display)] text-3xl text-forest/20 mb-2">
                    {docs.length === 0 ? 'no nootbooks yet' : 'nothing here'}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-forest/30">
                    {docs.length === 0
                      ? 'Create your first nootbook to get started.'
                      : 'Try a different search term.'}
                  </p>
                  {docs.length === 0 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="mt-4 bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Create your first nootbook
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NewNootModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(repoId) => navigate(`/editor/${repoId}`)}
      />
    </div>
  )
}
