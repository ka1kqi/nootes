import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Diff Visualizer                                                     */
/* Side-by-side / unified diff view for merge comparison               */
/* ------------------------------------------------------------------ */

type DiffLine = {
  type: 'same' | 'add' | 'remove' | 'info'
  left?: string
  right?: string
  leftNum?: number
  rightNum?: number
  content?: string
}

const mergeInfo = {
  title: 'Chain Rule — Formal Proof & Examples',
  repo: 'Intro to Algorithms',
  base: 'main',
  compare: 'aisha/chain-rule-section',
  author: 'Aisha M.',
  authorInitials: 'AM',
  reviewer: 'James K.',
  reviewerInitials: 'JK',
  timestamp: '2 hours ago',
  additions: 24,
  deletions: 8,
  files: 3,
  status: 'open' as const,
  comments: 4,
}

const diffBlocks: { filename: string; language: string; lines: DiffLine[] }[] = [
  {
    filename: 'nootes/chain-rule.md',
    language: 'markdown',
    lines: [
      { type: 'info', content: '@@ -12,14 +12,28 @@ ## The Chain Rule' },
      { type: 'same', leftNum: 12, rightNum: 12, left: '## The Chain Rule', right: '## The Chain Rule' },
      { type: 'same', leftNum: 13, rightNum: 13, left: '', right: '' },
      { type: 'remove', leftNum: 14, left: 'The chain rule lets you differentiate composite functions.' },
      { type: 'remove', leftNum: 15, left: 'If y = f(g(x)), then dy/dx = f\'(g(x)) * g\'(x).' },
      { type: 'add', rightNum: 14, right: 'The chain rule provides a method for differentiating **composite functions**.' },
      { type: 'add', rightNum: 15, right: 'Formally, if $h(x) = f(g(x))$, then:' },
      { type: 'add', rightNum: 16, right: '' },
      { type: 'add', rightNum: 17, right: '$$\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)$$' },
      { type: 'add', rightNum: 18, right: '' },
      { type: 'add', rightNum: 19, right: 'This is often written in Leibniz notation as:' },
      { type: 'add', rightNum: 20, right: '' },
      { type: 'add', rightNum: 21, right: '$$\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$$' },
      { type: 'same', leftNum: 16, rightNum: 22, left: '', right: '' },
      { type: 'same', leftNum: 17, rightNum: 23, left: '### Example 1', right: '### Example 1' },
      { type: 'remove', leftNum: 18, left: 'Find the derivative of (3x + 1)^2.' },
      { type: 'remove', leftNum: 19, left: 'Answer: 2(3x + 1) * 3 = 6(3x + 1)' },
      { type: 'add', rightNum: 24, right: 'Find the derivative of $h(x) = (3x + 1)^2$.' },
      { type: 'add', rightNum: 25, right: '' },
      { type: 'add', rightNum: 26, right: 'Let $u = 3x + 1$, so $h(x) = u^2$.' },
      { type: 'add', rightNum: 27, right: '' },
      { type: 'add', rightNum: 28, right: '$$h\'(x) = 2u \\cdot \\frac{du}{dx} = 2(3x+1) \\cdot 3 = 6(3x+1)$$' },
      { type: 'same', leftNum: 20, rightNum: 29, left: '', right: '' },
      { type: 'same', leftNum: 21, rightNum: 30, left: '### Example 2', right: '### Example 2' },
    ],
  },
  {
    filename: 'nootes/complexity.md',
    language: 'markdown',
    lines: [
      { type: 'info', content: '@@ -5,8 +5,12 @@ ## Time Complexity' },
      { type: 'same', leftNum: 5, rightNum: 5, left: '## Time Complexity', right: '## Time Complexity' },
      { type: 'same', leftNum: 6, rightNum: 6, left: '', right: '' },
      { type: 'same', leftNum: 7, rightNum: 7, left: '| Algorithm | Best | Average | Worst |', right: '| Algorithm | Best | Average | Worst |' },
      { type: 'same', leftNum: 8, rightNum: 8, left: '|-----------|------|---------|-------|', right: '|-----------|------|---------|-------|' },
      { type: 'same', leftNum: 9, rightNum: 9, left: '| Binary Search | O(1) | O(log n) | O(log n) |', right: '| Binary Search | O(1) | O(log n) | O(log n) |' },
      { type: 'remove', leftNum: 10, left: '| Quick Sort | O(n log n) | O(n log n) | O(n^2) |' },
      { type: 'add', rightNum: 10, right: '| Quick Sort | $O(n \\log n)$ | $O(n \\log n)$ | $O(n^2)$ |' },
      { type: 'add', rightNum: 11, right: '| Merge Sort | $O(n \\log n)$ | $O(n \\log n)$ | $O(n \\log n)$ |' },
      { type: 'add', rightNum: 12, right: '| Heap Sort  | $O(n \\log n)$ | $O(n \\log n)$ | $O(n \\log n)$ |' },
      { type: 'same', leftNum: 11, rightNum: 13, left: '', right: '' },
    ],
  },
  {
    filename: 'code/binary_search.py',
    language: 'python',
    lines: [
      { type: 'info', content: '@@ -1,9 +1,15 @@ def binary_search(arr, target):' },
      { type: 'same', leftNum: 1, rightNum: 1, left: 'def binary_search(arr, target):', right: 'def binary_search(arr, target):' },
      { type: 'remove', leftNum: 2, left: '    lo, hi = 0, len(arr) - 1' },
      { type: 'add', rightNum: 2, right: '    """Binary search for target in sorted array."""' },
      { type: 'add', rightNum: 3, right: '    lo, hi = 0, len(arr) - 1' },
      { type: 'same', leftNum: 3, rightNum: 4, left: '    while lo <= hi:', right: '    while lo <= hi:' },
      { type: 'same', leftNum: 4, rightNum: 5, left: '        mid = (lo + hi) // 2', right: '        mid = (lo + hi) // 2' },
      { type: 'same', leftNum: 5, rightNum: 6, left: '        if arr[mid] == target:', right: '        if arr[mid] == target:' },
      { type: 'same', leftNum: 6, rightNum: 7, left: '            return mid', right: '            return mid' },
      { type: 'same', leftNum: 7, rightNum: 8, left: '        elif arr[mid] < target:', right: '        elif arr[mid] < target:' },
      { type: 'same', leftNum: 8, rightNum: 9, left: '            lo = mid + 1', right: '            lo = mid + 1' },
      { type: 'same', leftNum: 9, rightNum: 10, left: '        else:', right: '        else:' },
      { type: 'same', leftNum: 10, rightNum: 11, left: '            hi = mid - 1', right: '            hi = mid - 1' },
      { type: 'remove', leftNum: 11, left: '    return -1' },
      { type: 'add', rightNum: 12, right: '    return -1  # target not found' },
      { type: 'add', rightNum: 13, right: '' },
      { type: 'add', rightNum: 14, right: '# Time: O(log n) | Space: O(1)' },
    ],
  },
]

const comments = [
  { author: 'James K.', initials: 'JK', file: 'nootes/chain-rule.md', line: 17, text: 'Love the Leibniz notation addition — makes it way clearer for people coming from physics background.', time: '1h ago' },
  { author: 'Aisha M.', initials: 'AM', file: 'nootes/chain-rule.md', line: 28, text: 'Added the substitution step based on your feedback!', time: '45m ago' },
  { author: 'James K.', initials: 'JK', file: 'code/binary_search.py', line: 2, text: 'Good call adding the docstring. Maybe also add type hints?', time: '30m ago' },
  { author: 'Aisha M.', initials: 'AM', file: 'code/binary_search.py', line: 14, text: 'Will add type hints in a follow-up push.', time: '15m ago' },
]

function InlineLatex({ text }: { text: string }) {
  // Render inline $...$ and $$...$$ in diff lines
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <KaTeX key={i} math={part.slice(2, -2)} className="text-xs inline" />
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <KaTeX key={i} math={part.slice(1, -1)} className="text-xs inline" />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function Diff() {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [showComments, setShowComments] = useState(true)

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10 stagger">

          {/* Merge header */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                mergeInfo.status === 'open' ? 'bg-sage/15 text-sage' : 'bg-forest/10 text-forest/50'
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest">{mergeInfo.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`font-mono text-[10px] px-2.5 py-1 squircle-sm ${
                    mergeInfo.status === 'open' ? 'bg-sage/15 text-sage' : 'bg-forest/10 text-forest/40'
                  }`}>
                    {mergeInfo.status === 'open' ? 'Open' : 'Merged'}
                  </span>
                  <span className="font-[family-name:var(--font-body)] text-xs text-forest/40">
                    <span className="text-forest/70 font-medium">{mergeInfo.author}</span> wants to merge{' '}
                    <span className="font-mono text-forest/50 bg-forest/[0.04] px-1.5 py-0.5 squircle-sm">{mergeInfo.compare}</span>{' '}
                    into{' '}
                    <span className="font-mono text-forest/50 bg-forest/[0.04] px-1.5 py-0.5 squircle-sm">{mergeInfo.base}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 py-3 px-5 bg-parchment border border-forest/10 squircle-xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest/80 flex items-center justify-center text-[9px] text-parchment font-medium">{mergeInfo.authorInitials}</span>
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{mergeInfo.author}</span>
                <svg className="w-3 h-3 text-forest/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                <span className="w-6 h-6 rounded-full bg-sienna/60 flex items-center justify-center text-[9px] text-parchment font-medium">{mergeInfo.reviewerInitials}</span>
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{mergeInfo.reviewer}</span>
              </div>
              <div className="h-4 w-px bg-forest/10" />
              <span className="font-mono text-[10px] text-forest/30">{mergeInfo.timestamp}</span>
              <div className="h-4 w-px bg-forest/10" />
              <span className="font-mono text-[10px] text-sage">+{mergeInfo.additions}</span>
              <span className="font-mono text-[10px] text-sienna/60">-{mergeInfo.deletions}</span>
              <div className="h-4 w-px bg-forest/10" />
              <span className="font-mono text-[10px] text-forest/30">{mergeInfo.files} files</span>
              <div className="ml-auto flex items-center gap-2">
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
                <div className="w-px h-4 bg-forest/10" />
                <button
                  onClick={() => setShowComments(!showComments)}
                  className={`font-mono text-[10px] px-3 py-1.5 squircle-sm transition-colors ${showComments ? 'bg-amber/15 text-amber' : 'text-forest/30 hover:bg-forest/5'}`}
                >
                  {mergeInfo.comments} comments
                </button>
              </div>
            </div>
          </div>

          {/* Diff blocks */}
          <div className="space-y-6">
            {diffBlocks.map((block, blockIdx) => (
              <div key={blockIdx} className="border border-forest/10 squircle-xl overflow-hidden shadow-[0_2px_20px_-8px_rgba(38,70,53,0.04)]">
                {/* File header */}
                <div className="bg-parchment px-4 py-3 flex items-center gap-3 border-b border-forest/10">
                  <svg className="w-4 h-4 text-forest/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="font-mono text-xs text-forest/60">{block.filename}</span>
                  <span className="font-mono text-[9px] text-forest/20 bg-forest/[0.04] px-2 py-0.5 squircle-sm">{block.language}</span>
                </div>

                {/* Diff content */}
                <div className="bg-cream font-mono text-[12px] leading-[1.8] overflow-x-auto">
                  {viewMode === 'split' ? (
                    /* ---- Split view ---- */
                    <table className="w-full border-collapse">
                      <tbody>
                        {block.lines.map((line, lineIdx) => {
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
                            const relevantComments = showComments
                              ? comments.filter(c => c.file === block.filename && c.line === line.rightNum)
                              : []
                            return (
                              <>
                                <tr key={lineIdx} className="bg-sage/[0.06]">
                                  <td className="w-10 border-r border-forest/[0.06] bg-forest/[0.01]" />
                                  <td className="w-1/2 border-r border-forest/[0.06] bg-forest/[0.01]" />
                                  <td className="text-sage/50 text-right pr-3 pl-4 w-10 select-none border-r border-sage/15">{line.rightNum}</td>
                                  <td className="px-4 text-sage/90 w-1/2">
                                    <span className="text-sage/40 mr-1">+</span>
                                    <InlineLatex text={line.right || ''} />
                                  </td>
                                </tr>
                                {relevantComments.map((comment, ci) => (
                                  <tr key={`comment-${lineIdx}-${ci}`}>
                                    <td colSpan={4} className="p-0">
                                      <div className="mx-4 my-2 bg-amber/[0.04] border border-amber/15 squircle-sm p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="w-5 h-5 rounded-full bg-forest/60 flex items-center justify-center text-[8px] text-parchment">{comment.initials}</div>
                                          <span className="font-[family-name:var(--font-body)] text-[11px] text-forest/70 font-medium">{comment.author}</span>
                                          <span className="font-mono text-[9px] text-forest/20">{comment.time}</span>
                                        </div>
                                        <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/50 leading-relaxed">{comment.text}</p>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )
                          }
                          return null
                        })}
                      </tbody>
                    </table>
                  ) : (
                    /* ---- Unified view ---- */
                    <table className="w-full border-collapse">
                      <tbody>
                        {block.lines.map((line, lineIdx) => {
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

          {/* Review comments summary */}
          {showComments && (
            <div className="mt-10">
              <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">REVIEW</span>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Conversation</h2>
              <div className="bg-parchment border border-forest/10 squircle-xl p-6 space-y-4 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.04)]">
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-parchment font-medium shrink-0 ${
                      c.initials === 'AM' ? 'bg-forest/80' : 'bg-sienna/60'
                    }`}>
                      {c.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 font-medium">{c.author}</span>
                        <span className="font-mono text-[10px] text-forest/20">{c.time}</span>
                        <span className="font-mono text-[9px] text-forest/15 bg-forest/[0.04] px-1.5 py-0.5 squircle-sm">{c.file}:{c.line}</span>
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-sm text-forest/50 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}

                {/* Merge action */}
                <div className="pt-4 border-t border-forest/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                    <span className="font-[family-name:var(--font-body)] text-xs text-forest/40">All checks passed · Ready to merge</span>
                  </div>
                  <button className="bg-sage text-parchment font-mono text-xs px-5 py-2.5 squircle-sm hover:bg-sage/80 transition-colors shadow-sm">
                    Merge Nootes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
