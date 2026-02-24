import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { supabase } from '../lib/supabase'
import type { Block } from '../hooks/useDocument'

/**
 * Diff.tsx — Side-by-side / unified diff visualizer.
 *
 * Fetches a fork document and its source, then computes a block-level diff
 * with line-level detail using an LCS algorithm. Renders the result in split
 * or unified view with inline LaTeX rendering and semantic change annotations.
 */

type DiffLine = {
  /** Indicates whether this line is unchanged, added, removed, or a section info header. */
  type: 'same' | 'add' | 'remove' | 'info'
  left?: string
  right?: string
  leftNum?: number
  rightNum?: number
  content?: string
}

type DiffSection = {
  /** Block type identifier (e.g. 'paragraph', 'latex', 'code'). */
  blockType: string
  lines: DiffLine[]
  /** True when at least one line in this section differs between master and fork. */
  hasChanges: boolean
}

// ── LCS-based line diff ─────────────────────────────────────────────
/**
 * Computes a line-level diff between two string arrays using the
 * Longest Common Subsequence (LCS) algorithm. Returns a flat list of
 * DiffLine objects in document order tagged as 'same', 'add', or 'remove'.
 *
 * @param oldLines - Lines from the master (source) document.
 * @param newLines - Lines from the fork (modified) document.
 */
function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length, n = newLines.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])

  const temp: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.push({ type: 'same', leftNum: i, rightNum: j, left: oldLines[i - 1], right: newLines[j - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: 'add', rightNum: j, right: newLines[j - 1] })
      j--
    } else {
      temp.push({ type: 'remove', leftNum: i, left: oldLines[i - 1] })
      i--
    }
  }
  return temp.reverse()
}

/** Human-readable display labels for each document block type. */
const BLOCK_TYPE_LABELS: Record<string, string> = {
  paragraph: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  quote: 'Quote', latex: 'LaTeX', code: 'Code', chemistry: 'Chemistry',
  callout: 'Callout', divider: 'Divider', table: 'Table', diagram: 'Diagram',
}

// ── Compute block-level diff with line-level detail ─────────────────
/**
 * Aligns master and fork block arrays by block ID, then produces a
 * `DiffSection` per block. Blocks present only in the master are marked
 * as removed; blocks only in the fork are marked as added; shared blocks
 * are line-diffed with `computeLineDiff`.
 *
 * @param masterBlocks - Blocks from the canonical source document.
 * @param forkBlocks   - Blocks from the user's fork.
 */
function computeDiff(masterBlocks: Block[], forkBlocks: Block[]): DiffSection[] {
  const masterMap = new Map(masterBlocks.map(b => [b.id, b]))
  const forkMap = new Map(forkBlocks.map(b => [b.id, b]))
  const result: DiffSection[] = []
  const processed = new Set<string>()

  let masterIdx = 0
  for (const fb of forkBlocks) {
    // Insert any master-only blocks that appeared before this fork block
    while (masterIdx < masterBlocks.length && !forkMap.has(masterBlocks[masterIdx].id)) {
      const mb = masterBlocks[masterIdx]
      if (!processed.has(mb.id)) {
        processed.add(mb.id)
        const lines = mb.content.split('\n')
        result.push({
          blockType: mb.type,
          hasChanges: true,
          lines: [
            { type: 'info', content: `${BLOCK_TYPE_LABELS[mb.type] || mb.type} — removed` },
            ...lines.map((l, i) => ({ type: 'remove' as const, leftNum: i + 1, left: l })),
          ],
        })
      }
      masterIdx++
    }

    const mb = masterMap.get(fb.id)
    if (mb) {
      processed.add(fb.id)
      if (masterBlocks[masterIdx]?.id === fb.id) masterIdx++

      if (mb.content === fb.content && mb.type === fb.type) {
        const lines = fb.content.split('\n')
        result.push({
          blockType: fb.type,
          hasChanges: false,
          lines: lines.map((l, i) => ({ type: 'same' as const, leftNum: i + 1, rightNum: i + 1, left: l, right: l })),
        })
      } else {
        const oldLines = mb.content.split('\n')
        const newLines = fb.content.split('\n')
        const dl = computeLineDiff(oldLines, newLines)
        const label = mb.type !== fb.type
          ? `${BLOCK_TYPE_LABELS[mb.type] || mb.type} → ${BLOCK_TYPE_LABELS[fb.type] || fb.type}`
          : BLOCK_TYPE_LABELS[fb.type] || fb.type
        result.push({
          blockType: fb.type,
          hasChanges: true,
          lines: [{ type: 'info', content: `${label} — modified` }, ...dl],
        })
      }
    } else {
      const lines = fb.content.split('\n')
      result.push({
        blockType: fb.type,
        hasChanges: true,
        lines: [
          { type: 'info', content: `${BLOCK_TYPE_LABELS[fb.type] || fb.type} — added` },
          ...lines.map((l, i) => ({ type: 'add' as const, rightNum: i + 1, right: l })),
        ],
      })
    }
  }

  // Remaining master-only blocks
  for (const mb of masterBlocks) {
    if (!processed.has(mb.id)) {
      const lines = mb.content.split('\n')
      result.push({
        blockType: mb.type,
        hasChanges: true,
        lines: [
          { type: 'info', content: `${BLOCK_TYPE_LABELS[mb.type] || mb.type} — removed` },
          ...lines.map((l, i) => ({ type: 'remove' as const, leftNum: i + 1, left: l })),
        ],
      })
    }
  }

  return result
}

/** Derives up to 2 uppercase initials from a display name for avatar fallback. */
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

/**
 * Renders a text string that may contain inline LaTeX delimited by `$…$` or `$$…$$`.
 * Non-math spans are rendered as plain text; math spans are handed to KaTeX.
 */
function InlineLatex({ text }: { text: string }) {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$'))
          return <KaTeX key={i} math={part.slice(2, -2)} className="text-xs inline" />
        if (part.startsWith('$') && part.endsWith('$'))
          return <KaTeX key={i} math={part.slice(1, -1)} className="text-xs inline" />
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

/**
 * Diff page — visualizes the difference between a fork document and its source.
 *
 * Route param: `:repoId` is the UUID of the **fork** document.
 *
 * Loads both the fork and its `source_document_id` master from Supabase,
 * resolves author profiles, then renders a block-aligned diff with
 * configurable split/unified view and the option to hide unchanged blocks.
 */
export default function Diff() {
  const { repoId } = useParams<{ repoId: string }>()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [hideUnchanged, setHideUnchanged] = useState(false)

  // ── Data fetching ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forkDoc, setForkDoc] = useState<{ title: string; blocks: Block[]; source_document_id: string; owner_user_id: string } | null>(null)
  const [masterDoc, setMasterDoc] = useState<{ title: string; blocks: Block[]; owner_user_id: string } | null>(null)
  const [forkAuthor, setForkAuthor] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [masterAuthor, setMasterAuthor] = useState<{ display_name: string; avatar_url: string | null } | null>(null)

  useEffect(() => {
    if (!repoId) { setError('No document ID provided.'); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        // Fetch fork document
        const { data: fork, error: forkErr } = await supabase
          .from('documents')
          .select('title, blocks, source_document_id, owner_user_id')
          .eq('id', repoId)
          .maybeSingle()
        if (forkErr || !fork) { if (!cancelled) { setError('Could not load document.'); setLoading(false) }; return }
        // A diff requires a source; documents without source_document_id are roots, not forks.
        if (!fork.source_document_id) { if (!cancelled) { setError('This document is not a fork — there is nothing to diff against.'); setLoading(false) }; return }
        if (!cancelled) setForkDoc(fork as typeof forkDoc)

        // Fetch master document
        const { data: master, error: masterErr } = await supabase
          .from('documents')
          .select('title, blocks, owner_user_id')
          .eq('id', fork.source_document_id)
          .maybeSingle()
        if (masterErr || !master) { if (!cancelled) { setError('Could not load the source document.'); setLoading(false) }; return }
        if (!cancelled) setMasterDoc(master as typeof masterDoc)

        // Fetch profiles for both authors in parallel to avoid waterfall
        const [forkProfile, masterProfile] = await Promise.all([
          supabase.from('profiles').select('display_name, avatar_url').eq('id', fork.owner_user_id).maybeSingle(),
          supabase.from('profiles').select('display_name, avatar_url').eq('id', master.owner_user_id).maybeSingle(),
        ])
        if (!cancelled) {
          setForkAuthor(forkProfile.data)
          setMasterAuthor(masterProfile.data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) { setError('An unexpected error occurred.'); setLoading(false) }
      }
    })()
    // Cancellation flag prevents stale state updates if the component unmounts while fetching.
    return () => { cancelled = true }
  }, [repoId])

  // ── Compute diff ────────────────────────────────────────────────────
  const diffSections = useMemo(() => {
    // Guard: wait for both documents before computing.
    if (!masterDoc || !forkDoc) return []
    return computeDiff(masterDoc.blocks ?? [], forkDoc.blocks ?? [])
  }, [masterDoc, forkDoc])

  // Aggregate addition/deletion counts and changed-block stats for the stats bar
  const stats = useMemo(() => {
    let additions = 0, deletions = 0, changedBlocks = 0
    for (const s of diffSections) {
      if (s.hasChanges) changedBlocks++
      for (const l of s.lines) {
        // Count each add/remove line to show the ±N summary in the stats bar.
        if (l.type === 'add') additions++
        if (l.type === 'remove') deletions++
      }
    }
    return { additions, deletions, changedBlocks, totalBlocks: diffSections.length }
  }, [diffSections])

  // When hideUnchanged is toggled, filter out sections with no edits
  const visibleSections = hideUnchanged ? diffSections.filter(s => s.hasChanges) : diffSections

  // ── Loading / error states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar variant="light" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-forest/20 border-t-forest/60 rounded-full animate-spin mx-auto mb-4" />
            <span className="font-[family-name:var(--font-body)] text-sm text-forest/40">Loading diff…</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar variant="light" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-sienna/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-sienna/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm text-forest/50 mb-4">{error}</p>
            <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-forest/40 hover:text-forest/70 underline underline-offset-4">
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const forkName = forkAuthor?.display_name ?? 'Unknown'
  const masterName = masterAuthor?.display_name ?? 'Unknown'

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10 stagger">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-sage/15 text-sage">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest">
                  {forkDoc?.title || 'Untitled'}
                </h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="font-[family-name:var(--font-body)] text-xs text-forest/40">
                    Comparing <span className="text-forest/70 font-medium">{forkName}</span>'s fork against{' '}
                    <span className="text-forest/70 font-medium">{masterName}</span>'s original
                  </span>
                </div>
              </div>
              <Link
                to={`/editor/${repoId}`}
                className="shrink-0 font-mono text-[10px] px-4 py-2 squircle-sm border border-forest/15 text-forest/40 hover:text-forest/70 hover:border-forest/25 transition-all"
              >
                ← Back to Editor
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 py-3 px-5 bg-parchment border border-forest/10 squircle-xl flex-wrap">
              <div className="flex items-center gap-2">
                {forkAuthor?.avatar_url ? (
                  <img src={forkAuthor.avatar_url} alt={forkName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-forest/80 flex items-center justify-center text-[9px] text-parchment font-medium">{getInitials(forkName)}</span>
                )}
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{forkName}</span>
                <svg className="w-3 h-3 text-forest/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                {masterAuthor?.avatar_url ? (
                  <img src={masterAuthor.avatar_url} alt={masterName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-sienna/60 flex items-center justify-center text-[9px] text-parchment font-medium">{getInitials(masterName)}</span>
                )}
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{masterName}</span>
              </div>
              <div className="h-4 w-px bg-forest/10" />
              <span className="font-mono text-[10px] text-sage">+{stats.additions}</span>
              <span className="font-mono text-[10px] text-sienna/60">−{stats.deletions}</span>
              <div className="h-4 w-px bg-forest/10" />
              <span className="font-mono text-[10px] text-forest/30">{stats.changedBlocks} of {stats.totalBlocks} blocks changed</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setHideUnchanged(!hideUnchanged)}
                  className={`font-mono text-[10px] px-3 py-1.5 squircle-sm transition-colors ${hideUnchanged ? 'bg-amber/15 text-amber' : 'text-forest/30 hover:bg-forest/5'}`}
                >
                  {hideUnchanged ? 'Show all' : 'Hide unchanged'}
                </button>
                <div className="w-px h-4 bg-forest/10" />
                <button
                  onClick={() => setViewMode('split')}
                  className={`font-mono text-[10px] px-3 py-1.5 squircle-sm transition-colors ${viewMode === 'split' ? 'bg-forest text-parchment' : 'text-forest/30 hover:bg-forest/5'}`}
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('unified')}
                  className={`font-mono text-[10px] px-3 py-1.5 squircle-sm transition-colors ${viewMode === 'unified' ? 'bg-forest text-parchment' : 'text-forest/30 hover:bg-forest/5'}`}
                >
                  Unified
                </button>
              </div>
            </div>
          </div>

          {/* No changes state */}
          {stats.additions === 0 && stats.deletions === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-sage/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-[family-name:var(--font-body)] text-sm text-forest/40">No differences found — the fork is in sync with the original.</p>
            </div>
          )}

          {/* Diff blocks */}
          <div className="space-y-4">
            {visibleSections.map((section, sectionIdx) => (
              <div key={sectionIdx} className={`border squircle-xl overflow-hidden shadow-[0_2px_20px_-8px_rgba(38,70,53,0.04)] ${
                section.hasChanges ? 'border-forest/10' : 'border-forest/[0.06]'
              }`}>
                {/* Block header */}
                <div className={`px-4 py-2.5 flex items-center gap-3 border-b ${
                  section.hasChanges ? 'bg-parchment border-forest/10' : 'bg-cream border-forest/[0.06]'
                }`}>
                  <span className={`font-mono text-[9px] px-2 py-0.5 squircle-sm ${
                    section.hasChanges ? 'bg-sage/10 text-sage/70' : 'bg-forest/[0.04] text-forest/20'
                  }`}>
                    {BLOCK_TYPE_LABELS[section.blockType] || section.blockType}
                  </span>
                  {!section.hasChanges && (
                    <span className="font-mono text-[9px] text-forest/15">unchanged</span>
                  )}
                </div>

                {/* Diff content */}
                <div className="bg-cream font-mono text-[12px] leading-[1.8] overflow-x-auto">
                  {viewMode === 'split' ? (
                    <table className="w-full border-collapse">
                      <tbody>
                        {section.lines.map((line, lineIdx) => {
                          if (line.type === 'info') {
                            return (
                              <tr key={lineIdx}>
                                <td colSpan={4} className="bg-forest/[0.03] text-forest/25 text-[11px] px-4 py-1 border-y border-forest/[0.04]">
                                  {line.content}
                                </td>
                              </tr>
                            )
                          }
                          if (line.type === 'same') {
                            return (
                              <tr key={lineIdx} className="hover:bg-forest/[0.02]">
                                <td className="text-forest/15 text-right pr-3 pl-4 w-10 select-none border-r border-forest/[0.06]">{line.leftNum}</td>
                                <td className="px-4 text-forest/50 w-1/2 border-r border-forest/[0.06]">
                                  <InlineLatex text={line.left || ''} />
                                </td>
                                <td className="text-forest/15 text-right pr-3 pl-4 w-10 select-none border-r border-forest/[0.06]">{line.rightNum}</td>
                                <td className="px-4 text-forest/50 w-1/2">
                                  <InlineLatex text={line.right || ''} />
                                </td>
                              </tr>
                            )
                          }
                          if (line.type === 'remove') {
                            return (
                              <tr key={lineIdx} className="bg-sienna/[0.04]">
                                <td className="text-sienna/30 text-right pr-3 pl-4 w-10 select-none border-r border-sienna/10">{line.leftNum}</td>
                                <td className="px-4 text-sienna/70 w-1/2 border-r border-forest/[0.06]">
                                  <span className="text-sienna/30 mr-1">−</span>
                                  <InlineLatex text={line.left || ''} />
                                </td>
                                <td className="w-10 border-r border-forest/[0.06] bg-forest/[0.01]" />
                                <td className="w-1/2 bg-forest/[0.01]" />
                              </tr>
                            )
                          }
                          if (line.type === 'add') {
                            return (
                              <tr key={lineIdx} className="bg-sage/[0.06]">
                                <td className="w-10 border-r border-forest/[0.06] bg-forest/[0.01]" />
                                <td className="w-1/2 border-r border-forest/[0.06] bg-forest/[0.01]" />
                                <td className="text-sage/50 text-right pr-3 pl-4 w-10 select-none border-r border-sage/15">{line.rightNum}</td>
                                <td className="px-4 text-sage/90 w-1/2">
                                  <span className="text-sage/40 mr-1">+</span>
                                  <InlineLatex text={line.right || ''} />
                                </td>
                              </tr>
                            )
                          }
                          return null
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full border-collapse">
                      <tbody>
                        {section.lines.map((line, lineIdx) => {
                          if (line.type === 'info') {
                            return (
                              <tr key={lineIdx}>
                                <td colSpan={3} className="bg-forest/[0.03] text-forest/25 text-[11px] px-4 py-1 border-y border-forest/[0.04]">
                                  {line.content}
                                </td>
                              </tr>
                            )
                          }
                          const isAdd = line.type === 'add'
                          const isRemove = line.type === 'remove'
                          const bg = isAdd ? 'bg-sage/[0.06]' : isRemove ? 'bg-sienna/[0.04]' : 'hover:bg-forest/[0.02]'
                          const textColor = isAdd ? 'text-sage/90' : isRemove ? 'text-sienna/70' : 'text-forest/50'
                          const prefix = isAdd ? '+' : isRemove ? '−' : ' '
                          const prefixColor = isAdd ? 'text-sage/40' : isRemove ? 'text-sienna/30' : 'text-transparent'
                          const content = (isRemove ? line.left : (line.right || line.left)) ?? ''
                          const lineNum = isRemove ? line.leftNum : line.rightNum || line.leftNum

                          return (
                            <tr key={lineIdx} className={bg}>
                              <td className="text-forest/15 text-right pr-3 pl-4 w-10 select-none border-r border-forest/[0.06]">{lineNum}</td>
                              <td className={`px-4 ${textColor}`}>
                                <span className={`${prefixColor} mr-2`}>{prefix}</span>
                                <InlineLatex text={content} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
