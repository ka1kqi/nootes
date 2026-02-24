import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * Repos.tsx — Authenticated public nootbook browser.
 *
 * Fetches public documents plus restricted documents whose tags overlap
 * the current user's profile tags. Supports semantic search via server-side
 * embeddings (cosine similarity) with a title/tag substring fallback while
 * the embedding request is in-flight, and access-level filter chips.
 */

/** Shape of a discoverable document row returned from the Supabase query. */
interface RepoDoc {
  id: string
  title: string
  /** Free-form topic tags used for access gating and display. */
  tags: string[]
  access_level: 'public' | 'restricted'
  /** Controls who can submit merge requests to this document. */
  merge_policy: string
  owner_user_id: string
  created_at: string
  updated_at: string
  /** Pre-computed vector embedding for semantic search (may be null). */
  embedding: number[] | null
  /** Resolved owner display name (joined client-side). */
  ownerName?: string
}

/** Converts an ISO timestamp to a short relative label (e.g. "5h ago", "Jan 2024"). */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Small pill badge showing a document's access level with colour-coded styling.
 * - `public`     → sage green
 * - `restricted` → amber
 */
function AccessBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    public: 'text-sage/70     bg-sage/[0.08]     border-sage/15',
    restricted: 'text-amber/70   bg-amber/[0.08]    border-amber/15',
  }
  return (
    <span className={`font-mono text-[9px] px-1.5 py-0.5 squircle-sm border ${styles[level] ?? ''}`}>
      {level}
    </span>
  )
}

/**
 * Static seed data mirroring the public explore page.
 * Displayed as fallback / demo content alongside live Supabase documents.
 */
const repos = [
  {
    id: 'nyu-cs-algo',
    name: 'Intro to Algorithms',
    org: 'NYU',
    field: 'CS',
    code: 'CS-UA 310',
    contributors: 47,
    notes: 23,
    branches: 8,
    lastUpdated: '2h ago',
    description: 'Binary search, graph algorithms, dynamic programming, and complexity analysis.',
    tags: ['exam-relevant', 'midterm', 'final'],
    stars: 234,
    color: '#264635',
  },
  {
    id: 'nyu-math-linalg',
    name: 'Linear Algebra',
    org: 'NYU',
    field: 'Math',
    code: 'MATH-UA 140',
    contributors: 31,
    notes: 18,
    branches: 5,
    lastUpdated: '5h ago',
    description: 'Vector spaces, eigenvalues, SVD, and matrix decompositions with proofs.',
    tags: ['proofs', 'midterm'],
    stars: 189,
    color: '#A3B18A',
  },
  {
    id: 'mit-cs-ml',
    name: 'Machine Learning',
    org: 'MIT',
    field: 'CS',
    code: '6.036',
    contributors: 82,
    notes: 41,
    branches: 12,
    lastUpdated: '1d ago',
    description: 'Supervised learning, neural networks, regularization, and optimization.',
    tags: ['deep-learning', 'final'],
    stars: 412,
    color: '#8B6E4E',
  },
  {
    id: 'stanford-phys',
    name: 'Quantum Mechanics',
    org: 'Stanford',
    field: 'Physics',
    code: 'PHYS 130',
    contributors: 19,
    notes: 14,
    branches: 3,
    lastUpdated: '3d ago',
    description: 'Wave functions, Schrödinger equation, perturbation theory, and spin.',
    tags: ['proofs', 'exam-relevant'],
    stars: 156,
    color: '#5C7A6B',
  },
  {
    id: 'berkeley-math-analysis',
    name: 'Real Analysis',
    org: 'Berkeley',
    field: 'Math',
    code: 'MATH 104',
    contributors: 24,
    notes: 16,
    branches: 4,
    lastUpdated: '6h ago',
    description: 'Sequences, series, continuity, differentiability, and Riemann integration.',
    tags: ['proofs', 'midterm', 'final'],
    stars: 178,
    color: '#264635',
  },
  {
    id: 'columbia-cs-os',
    name: 'Operating Systems',
    org: 'Columbia',
    field: 'CS',
    code: 'COMS 4118',
    contributors: 38,
    notes: 22,
    branches: 7,
    lastUpdated: '12h ago',
    description: 'Processes, threads, memory management, file systems, and concurrency.',
    tags: ['systems', 'midterm'],
    stars: 203,
    color: '#A3B18A',
  },
  {
    id: 'nyu-chem-orgo',
    name: 'Organic Chemistry',
    org: 'NYU',
    field: 'Chem',
    code: 'CHEM-UA 226',
    contributors: 15,
    notes: 12,
    branches: 2,
    lastUpdated: '1d ago',
    description: 'Reaction mechanisms, stereochemistry, spectroscopy, and synthesis.',
    tags: ['reactions', 'exam-relevant'],
    stars: 97,
    color: '#8B6E4E',
  },
  {
    id: 'mit-econ',
    name: 'Microeconomics',
    org: 'MIT',
    field: 'Econ',
    code: '14.01',
    contributors: 29,
    notes: 17,
    branches: 4,
    lastUpdated: '2d ago',
    description: 'Supply & demand, game theory, market structures, and welfare economics.',
    tags: ['midterm', 'final'],
    stars: 145,
    color: '#5C7A6B',
  },
]

/** Minimal star SVG icon used in repo card stat rows. */
function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

/** Git-style branch SVG icon used in repo card stat rows. */
function BranchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3H15a3 3 0 100-3H9a3 3 0 01-3-3zm0 0a3 3 0 103-3 3 3 0 00-3 3z" />
    </svg>
  )
}

/**
 * Computes cosine similarity between two equal-length numeric vectors.
 * Used to rank documents against the query embedding from the server.
 *
 * @returns Score in [-1, 1]; 0 when either vector has zero magnitude.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Resolves the embedding API base URL.
 * Returns `/api` for local development; strips the trailing path segment
 * for production URLs specified via `VITE_API_URL`.
 */
function apiBase(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (!url || url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
  return url.replace(/\/[^/]+$/, '')
}

/**
 * Repos page — authenticated public nootbook browser.
 *
 * On mount, fetches all public documents plus restricted documents
 * whose `tags` overlap the current user's profile tags, then resolves
 * owner display names in a second query.
 *
 * Search uses server-side embeddings (semantic ranking) with a
 * title/tag substring fallback during the embedding round-trip.
 * An access-level filter (all / public / restricted) is applied on top.
 */
export default function Repos() {
  const { user, profile } = useAuth()
  const [docs, setDocs] = useState<RepoDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'restricted'>('all')
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null)
  const [embedding, setEmbedding] = useState(false)
  const embedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
      ; (async () => {
        setLoading(true)
        const userTags: string[] = profile?.tags ?? []

        // Always fetch public docs + restricted docs with overlapping tags
        let query = supabase
          .from('documents')
          .select('id, title, tags, access_level, merge_policy, owner_user_id, created_at, updated_at, embedding')
          .neq('owner_user_id', user.id) // exclude own docs — shown in MyRepos instead

        // Use a Supabase OR filter: always include public; include restricted only when
        // the user's profile tags overlap the document's required tags (array overlap `.ov`)
        if (userTags.length > 0) {
          query = query.or(
            `access_level.eq.public,and(access_level.eq.restricted,tags.ov.{${userTags.join(',')}})`
          )
        } else {
          query = query.eq('access_level', 'public')
        }

        const { data, error } = await query.order('updated_at', { ascending: false })

        if (error || !data) { setLoading(false); return }

        // Collect unique owner IDs so we can batch-fetch display names in one query.
        const ownerIds = [...new Set(data.map(d => d.owner_user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds)

        // Build id → display_name lookup for O(1) joins when mapping each document row.
        const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))

        setDocs(data.map(d => ({ ...d, ownerName: nameMap[d.owner_user_id] ?? 'unknown' })))
        setLoading(false)
      })()
  }, [user, profile?.tags])

  // Debounced semantic embed: fires 600 ms after typing stops
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

  const filtered = useMemo(() => {
    // No search — show all, access-level filter only
    if (!search.trim()) {
      return docs.filter(d => filter === 'all' || d.access_level === filter)
    }

    const base = docs.filter(d => filter === 'all' || d.access_level === filter)

    // Semantic mode: rank by cosine similarity; docs missing an embedding score -1
    if (queryEmbedding) {
      return [...base]
        .map(d => ({
          doc: d,
          score: d.embedding ? cosineSimilarity(queryEmbedding, d.embedding) : -1,
        }))
        .filter(() => true)
        .sort((a, b) => b.score - a.score)  // descending: highest similarity first
        .map(({ doc }) => doc)
    }

    // Embedding in-flight: substring fallback on title and tags
    return base.filter(d =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
  }, [docs, search, filter, queryEmbedding])

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto stagger">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">BROWSE</span>
          <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-4">Public Nootbooks</h1>
          <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/50 max-w-lg">
            Explore the nootes knowledge base.
          </p>

          {/* Search + filter bar */}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[280px] relative">
              {embedding ? (
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage/60 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Describe your curiosity…"
                className="w-full bg-parchment border border-forest/10 squircle pl-10 pr-20 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/30 outline-none focus:border-sage/40 transition-all"
              />
              {queryEmbedding && search.trim() && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-sage/50 tracking-widest uppercase">semantic</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'public', 'restricted'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`font-mono text-[11px] px-3 py-2 squircle-sm transition-all capitalize ${filter === f
                    ? 'bg-forest text-parchment'
                    : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05] border border-forest/10'
                    }`}
                >{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Repo grid */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-parchment border border-forest/10 squircle-xl p-6 animate-pulse">
                  <div className="h-3 bg-forest/[0.06] squircle w-1/3 mb-4" />
                  <div className="h-6 bg-forest/[0.06] squircle w-2/3 mb-3" />
                  <div className="h-3 bg-forest/[0.06] squircle w-full mb-2" />
                  <div className="h-3 bg-forest/[0.06] squircle w-4/5" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <span className="font-[family-name:var(--font-display)] text-4xl text-forest/20">No nootbooks found</span>
              <span className="font-mono text-[11px] text-forest/25">
                {docs.length === 0
                  ? 'No public nootbooks yet. Add tags to your profile to see restricted ones.'
                  : 'Try a different search or filter.'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-fast">
              {filtered.map(doc => (
                <Link
                  key={doc.id}
                  to={`/editor/${doc.id}`}
                  state={{ name: doc.title }}
                  className="group bg-parchment border border-forest/10 squircle-xl p-6 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all hover:border-forest/20"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AccessBadge level={doc.access_level} />
                      <span className="font-mono text-[9px] text-forest/25">by {doc.ownerName}</span>
                    </div>
                    <span className="font-mono text-[10px] text-forest/20">{timeAgo(doc.updated_at)}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-4">
                    {doc.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
                    {doc.tags.length > 0 ? doc.tags.map(tag => (
                      <span
                        key={tag}
                        className={`font-mono text-[10px] px-2 py-0.5 squircle-sm border ${(profile?.tags ?? []).includes(tag)
                          ? 'text-sage/80 border-sage/25 bg-sage/[0.06]'
                          : 'text-forest/35 border-forest/10'
                          }`}
                      >{tag}</span>
                    )) : (
                      <span className="font-mono text-[10px] text-forest/20 italic">no tags</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-3 pt-3 border-t border-forest/[0.06]">
                    <span className="font-mono text-[10px] text-forest/30 capitalize">
                      ⇄ {doc.merge_policy.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-forest/20 ml-auto">
                      {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
