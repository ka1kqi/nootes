import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Navbar } from '../components/Navbar'
import { useUserDocuments, deleteDocument } from '../hooks/useMyRepos'
import { NewNootModal } from '../components/NewNootModal'

/* ------------------------------------------------------------------ */
/* Your Nootbooks — Personal Dashboard                                 */
/* Shows nootbooks you own, contribute to, and have forked             */
/* ------------------------------------------------------------------ */

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

function apiBase(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (!url || url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
  return url.replace(/\/[^/]+$/, '')
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

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

  // Debounced semantic embed: fires 600 ms after the user stops typing
  useEffect(() => {
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current)
    if (!search.trim()) { setQueryEmbedding(null); return }

    embedTimerRef.current = setTimeout(async () => {
      setEmbedding(true)
      try {
        const res = await fetch(`${apiBase()}/embed/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: search.trim() }),
        })
        if (res.ok) {
          const { embedding: vec } = await res.json()
          setQueryEmbedding(Array.isArray(vec) ? vec : null)
        }
      } catch { /* non-fatal */ }
      finally { setEmbedding(false) }
    }, 600)

    return () => { if (embedTimerRef.current) clearTimeout(embedTimerRef.current) }
  }, [search])

  // Compute sorted+filtered list
  const filtered = (() => {
    if (!search.trim()) return docs

    // If embedding is ready, rank by cosine similarity (docs without embeddings go last)
    if (queryEmbedding) {
      return [...docs]
        .map(d => ({
          doc: d,
          score: d.embedding ? cosineSimilarity(queryEmbedding, d.embedding) : -1,
        }))
        .filter(() => true)
        .sort((a, b) => b.score - a.score)
        .map(({ doc }) => doc)
    }

    // While embedding is in-flight, fall back to title substring match
    return docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
  })()

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
                <div key={doc.id} className="relative group">
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-1">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="font-mono text-[9px] text-forest/25 uppercase tracking-wider">{doc.access_level}</span>
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
