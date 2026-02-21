import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { KaTeX } from './KaTeX'
import { CodeBlock } from './CodeBlock'
import { newBlock } from '../hooks/useDocument'
import type { Block, BlockType } from '../hooks/useDocument'

// ─── Public handle exposed via ref ───────────────────────────────────────────

export type BlockEditorHandle = {
  insertBlock: (type: BlockType) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEXT_TYPES: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'quote']
const RICH_TYPES: BlockType[] = ['latex', 'code', 'chemistry', 'table', 'callout']

const TYPE_LABEL: Record<string, string> = {
  paragraph: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  quote: 'Quote',
  latex: 'LaTeX',
  code: 'Code',
  chemistry: 'Chemistry',
  table: 'Table (CSV)',
  callout: 'Callout',
  divider: 'Divider',
}

const CALLOUT_VARIANTS = ['info', 'tip', 'warning', 'important'] as const

const CALLOUT_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  info:      { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'ℹ',  label: 'Info' },
  tip:       { bg: 'bg-sage/10',   border: 'border-sage/30',   icon: '💡', label: 'Tip' },
  warning:   { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠',  label: 'Warning' },
  important: { bg: 'bg-sienna/10', border: 'border-sienna/30', icon: '❗', label: 'Important' },
}

// ─── BlockPreview — pure render, no interaction ───────────────────────────────

export function BlockPreview({ block }: { block: Block }) {
  if (block.type === 'paragraph') {
    return <p className="font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed mb-4">{block.content || <span className="opacity-0">.</span>}</p>
  }
  if (block.type === 'h1') {
    return <h1 className="font-[family-name:var(--font-display)] text-5xl text-forest leading-tight mt-10 mb-5">{block.content}</h1>
  }
  if (block.type === 'h2') {
    return <h2 className="font-[family-name:var(--font-body)] text-2xl font-semibold text-forest mt-8 mb-3">{block.content}</h2>
  }
  if (block.type === 'h3') {
    return <h3 className="font-[family-name:var(--font-body)] text-lg font-medium text-forest/80 mt-6 mb-2">{block.content}</h3>
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="pl-4 border-l-2 border-sage/50 my-4 italic text-forest/60 font-[family-name:var(--font-body)] text-base">
        {block.content}
      </blockquote>
    )
  }
  if (block.type === 'latex') {
    return (
      <div className="my-4 bg-parchment border border-forest/10 squircle-xl px-8 py-6 overflow-x-auto">
        <KaTeX math={block.content} display />
      </div>
    )
  }
  if (block.type === 'code') {
    const lang = (block.meta?.language as string) || 'plaintext'
    const filename = block.meta?.filename as string | undefined
    return <CodeBlock code={block.content} language={lang} filename={filename} />
  }
  if (block.type === 'chemistry') {
    const caption = block.meta?.caption as string | undefined
    return (
      <div className="my-4 bg-parchment border border-forest/10 squircle-xl px-8 py-5">
        {caption && <p className="font-mono text-[10px] text-forest/35 mb-2 tracking-wider">{caption}</p>}
        <KaTeX math={block.content} display />
      </div>
    )
  }
  if (block.type === 'table') {
    const caption = block.meta?.caption as string | undefined
    const lines = block.content.split('\n').filter(Boolean)
    if (!lines.length) return <div className="my-4 h-12 border border-dashed border-forest/15 squircle flex items-center justify-center font-mono text-xs text-forest/25">Empty table</div>
    const [headerRow, ...dataRows] = lines
    const headers = headerRow.split(',').map(s => s.trim())
    const rows = dataRows.map(r => r.split(',').map(s => s.trim()))
    return (
      <div className="my-6 bg-parchment border border-forest/10 squircle-xl overflow-hidden">
        {caption && <div className="px-5 py-2 border-b border-forest/[0.06]"><span className="font-mono text-[10px] text-forest/40">{caption}</span></div>}
        <table className="w-full text-left">
          <thead>
            <tr className="bg-forest/[0.03]">
              {headers.map((h, i) => <th key={i} className="px-5 py-2.5 font-[family-name:var(--font-body)] text-[10px] font-medium text-forest/50 tracking-widest uppercase border-b border-forest/[0.06]">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-forest/[0.04] last:border-0">
                {row.map((cell, j) => <td key={j} className="px-5 py-2 font-mono text-sm text-forest/80">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (block.type === 'callout') {
    const variant = (block.meta?.calloutType as string) || 'info'
    const s = CALLOUT_STYLE[variant] ?? CALLOUT_STYLE.info
    return (
      <div className={`my-4 ${s.bg} border ${s.border} squircle-xl px-5 py-4 flex gap-3`}>
        <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
        <p className="font-[family-name:var(--font-body)] text-sm text-forest/80 leading-relaxed">{block.content}</p>
      </div>
    )
  }
  if (block.type === 'divider') {
    return <hr className="my-8 border-0 border-t border-forest/[0.08]" />
  }
  return null
}

// ─── Text block (paragraph / h1 / h2 / h3 / quote) ───────────────────────────

function TextBlock({
  block,
  focused,
  onFocus,
  onChange,
  onEnter,
  onDelete,
  onBackspaceEmpty,
}: {
  block: Block
  focused: boolean
  onFocus: () => void
  onChange: (content: string) => void
  onEnter: () => void
  onDelete: () => void
  onBackspaceEmpty: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus when newly focused
  useEffect(() => {
    if (focused && taRef.current) {
      taRef.current.focus()
      // Move cursor to end
      const len = taRef.current.value.length
      taRef.current.setSelectionRange(len, len)
    }
  }, [focused])

  // Auto-grow textarea height
  const autoResize = useCallback(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => { if (focused) autoResize() }, [focused, block.content, autoResize])

  const textClass =
    block.type === 'h1' ? 'font-[family-name:var(--font-display)] text-5xl text-forest leading-tight'
    : block.type === 'h2' ? 'font-[family-name:var(--font-body)] text-2xl font-semibold text-forest'
    : block.type === 'h3' ? 'font-[family-name:var(--font-body)] text-lg font-medium text-forest/80'
    : block.type === 'quote' ? 'font-[family-name:var(--font-body)] text-base italic text-forest/60'
    : 'font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed'

  const wrapClass =
    block.type === 'h1' ? 'mt-10 mb-2'
    : block.type === 'h2' ? 'mt-7 mb-1'
    : block.type === 'h3' ? 'mt-5 mb-0.5'
    : block.type === 'quote' ? 'my-3'
    : 'my-1'

  if (focused) {
    return (
      <div className={`relative group ${wrapClass}`}>
        {/* Sage accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sage/50 rounded-full" />
        <div className="pl-4 relative">
          <textarea
            ref={taRef}
            value={block.content}
            rows={1}
            className={`w-full resize-none overflow-hidden bg-transparent outline-none border-none ring-0 ${textClass}`}
            placeholder={`${TYPE_LABEL[block.type] ?? 'Write'}…`}
            onChange={e => { onChange(e.target.value); autoResize() }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() }
              if (e.key === 'Backspace' && block.content === '') { e.preventDefault(); onBackspaceEmpty() }
            }}
          />
          {/* Ghost type label */}
          <span className="absolute bottom-0 right-0 font-mono text-[9px] text-forest/20 select-none pointer-events-none">
            {TYPE_LABEL[block.type]}
          </span>
        </div>
      </div>
    )
  }

  // Unfocused preview (click to edit)
  return (
    <div
      className={`relative group ${wrapClass} cursor-text rounded hover:bg-forest/[0.02] transition-colors`}
      onClick={onFocus}
    >
      {/* Faint hover accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sage/0 group-hover:bg-sage/25 rounded-full transition-colors" />
      <div className="pl-4">
        {block.type === 'paragraph' && (
          <p className={`${textClass} min-h-[1.5em]`}>
            {block.content || <span className="text-forest/20">Click to edit…</span>}
          </p>
        )}
        {block.type === 'h1' && <h1 className={`${textClass} min-h-[1.2em]`}>{block.content || <span className="text-forest/20">Heading 1</span>}</h1>}
        {block.type === 'h2' && <h2 className={`${textClass} min-h-[1.2em]`}>{block.content || <span className="text-forest/20">Heading 2</span>}</h2>}
        {block.type === 'h3' && <h3 className={`${textClass} min-h-[1.2em]`}>{block.content || <span className="text-forest/20">Heading 3</span>}</h3>}
        {block.type === 'quote' && (
          <blockquote className={`${textClass} border-l-2 border-sage/40 pl-3 min-h-[1.5em]`}>
            {block.content || <span className="text-forest/20">Block quote…</span>}
          </blockquote>
        )}
      </div>
    </div>
  )
}

// ─── Rich block (latex / code / chemistry / table / callout) ─────────────────
// Click to edit — live split-pane with realtime rendered preview

function RichBlock({
  block,
  onUpdate,
  onDelete,
  autoEdit = false,
}: {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
  onDelete: () => void
  autoEdit?: boolean
}) {
  const [editing, setEditing] = useState(autoEdit)
  const [draft, setDraft] = useState(block.content)
  const [draftMeta, setDraftMeta] = useState<Record<string, unknown>>(block.meta ?? {})
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keep draft in sync if block changes externally (e.g. undo)
  useEffect(() => {
    if (!editing) {
      setDraft(block.content)
      setDraftMeta(block.meta ?? {})
    }
  }, [block.content, block.meta, editing])

  const openEdit = () => {
    setDraft(block.content)
    setDraftMeta(block.meta ?? {})
    setEditing(true)
  }

  const commit = () => {
    onUpdate({ content: draft, meta: draftMeta })
    setEditing(false)
  }

  const cancel = () => {
    setDraft(block.content)
    setDraftMeta(block.meta ?? {})
    setEditing(false)
  }

  const updateMeta = (key: string, value: unknown) =>
    setDraftMeta(prev => ({ ...prev, [key]: value }))

  // Escape to close
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); commit() }
  }

  const hint =
    block.type === 'latex' ? 'KaTeX · e.g. \\frac{a}{b}'
    : block.type === 'code' ? 'Source code'
    : block.type === 'chemistry' ? 'KaTeX chem · e.g. \\text{H}_2\\text{O}'
    : block.type === 'table' ? 'CSV · first row = headers'
    : 'Callout text'

  const sourceRows = block.type === 'code' ? 10 : block.type === 'table' ? 7 : 5

  if (!editing) {
    return (
      <div
        className="relative my-4 group cursor-pointer"
        onClick={openEdit}
      >
        {/* Hover ring */}
        <div className="absolute inset-0 rounded-xl ring-inset ring-0 group-hover:ring-2 group-hover:ring-sage/40 transition-all pointer-events-none" />
        {/* Delete button on hover */}
        <button
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-cream border border-forest/15 squircle-sm flex items-center justify-center font-mono text-[10px] text-forest/40 hover:text-sienna hover:border-sienna/30 transition-all shadow-sm z-10"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          ✕
        </button>
        <BlockPreview block={block} />
      </div>
    )
  }

  // ── Edit mode: split pane ────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="my-4 border border-sage/40 squircle-xl overflow-hidden bg-cream shadow-[0_2px_16px_-4px_rgba(38,70,53,0.10)]" onKeyDown={handleKeyDown}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-parchment border-b border-forest/[0.08]">
        <span className="font-mono text-[10px] text-forest/45 tracking-wider uppercase">{TYPE_LABEL[block.type]}</span>
        {/* Meta controls */}
        <div className="flex items-center gap-2 ml-1 flex-1">
          {block.type === 'code' && (
            <>
              <select
                value={(draftMeta.language as string) || 'plaintext'}
                onChange={e => updateMeta('language', e.target.value)}
                className="h-6 bg-transparent font-mono text-[10px] text-forest/50 border border-forest/15 squircle-sm px-1.5 focus:outline-none"
              >
                {['python','javascript','typescript','java','c','cpp','rust','go','bash','sql','html','css','json','plaintext'].map(l =>
                  <option key={l} value={l}>{l}</option>
                )}
              </select>
              <input
                type="text"
                placeholder="filename"
                value={(draftMeta.filename as string) || ''}
                onChange={e => updateMeta('filename', e.target.value)}
                className="h-6 bg-transparent font-mono text-[10px] text-forest/50 border border-forest/15 squircle-sm px-2 focus:outline-none w-32"
              />
            </>
          )}
          {block.type === 'callout' && (
            <select
              value={(draftMeta.calloutType as string) || 'info'}
              onChange={e => updateMeta('calloutType', e.target.value)}
              className="h-6 bg-transparent font-mono text-[10px] text-forest/50 border border-forest/15 squircle-sm px-1.5 focus:outline-none"
            >
              {CALLOUT_VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {(block.type === 'chemistry' || block.type === 'table') && (
            <input
              type="text"
              placeholder="Caption (optional)"
              value={(draftMeta.caption as string) || ''}
              onChange={e => updateMeta('caption', e.target.value)}
              className="h-6 bg-transparent font-mono text-[10px] text-forest/50 border border-forest/15 squircle-sm px-2 focus:outline-none w-44"
            />
          )}
          <span className="font-mono text-[9px] text-forest/25 ml-1">{hint}</span>
        </div>
        <button onClick={commit} className="h-6 px-2.5 bg-forest text-parchment squircle-sm font-[family-name:var(--font-body)] text-[10px] hover:bg-forest/80 transition-all">Done</button>
        <button onClick={cancel} className="h-6 px-2 font-[family-name:var(--font-body)] text-[10px] text-forest/35 hover:text-forest/70 transition-all">Cancel</button>
        <button onClick={onDelete} className="h-6 px-2 font-[family-name:var(--font-body)] text-[10px] text-forest/35 hover:text-sienna transition-all">Delete</button>
      </div>

      {/* Stacked: source on top, live preview below */}
      <div className="flex flex-col divide-y divide-forest/[0.06]">
        {/* Source */}
        <textarea
          autoFocus
          value={draft}
          rows={sourceRows}
          onChange={e => setDraft(e.target.value)}
          className="w-full bg-transparent font-mono text-[13px] text-forest/80 leading-relaxed p-4 resize-none focus:outline-none"
          spellCheck={false}
          placeholder={hint}
        />

        {/* Live preview */}
        <div className="p-4 bg-parchment/30">
          <span className="font-mono text-[9px] text-forest/25 block mb-2 tracking-wider uppercase">Live Preview</span>
          <LivePreview block={{ ...block, content: draft, meta: draftMeta }} />
        </div>
      </div>
    </div>
  )
}

// Lightweight live preview — same as BlockPreview but wrapped in error boundary
function LivePreview({ block }: { block: Block }) {
  try {
    return <BlockPreview block={block} />
  } catch {
    return <span className="font-mono text-[11px] text-sienna/60">Rendering error</span>
  }
}

// ─── Divider block ────────────────────────────────────────────────────────────

function DividerBlock({ onDelete }: { onDelete: () => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="relative my-6 group cursor-pointer"
      tabIndex={0}
      onClick={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <hr className="border-0 border-t border-forest/[0.1]" />
      {focused && (
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 bg-cream border border-forest/15 squircle-sm flex items-center justify-center font-mono text-[10px] text-forest/40 hover:text-sienna transition-all"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ─── Main BlockEditor ─────────────────────────────────────────────────────────

export const BlockEditor = forwardRef<
  BlockEditorHandle,
  { blocks: Block[]; onChange: (blocks: Block[]) => void; readOnly?: boolean }
>(function BlockEditor({ blocks, onChange, readOnly = false }, ref) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [autoEditId, setAutoEditId] = useState<string | null>(null)

  // Expose insertBlock to parent toolbar via ref
  useImperativeHandle(ref, () => ({
    insertBlock(type: BlockType) {
      const idx = focusedId ? blocks.findIndex(b => b.id === focusedId) : blocks.length - 1
      const insertAt = idx === -1 ? blocks.length : idx + 1
      const nb = newBlock(type)
      const next = [...blocks.slice(0, insertAt), nb, ...blocks.slice(insertAt)]
      onChange(next)
      if (TEXT_TYPES.includes(type)) {
        // Focus text blocks immediately
        setTimeout(() => setFocusedId(nb.id), 0)
      } else if (RICH_TYPES.includes(type)) {
        // Auto-open rich blocks in edit mode so the user sees the editor right away
        setTimeout(() => setAutoEditId(nb.id), 0)
      }
    },
  }), [blocks, focusedId, onChange])

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }, [blocks, onChange])

  const deleteBlock = useCallback((id: string) => {
    if (blocks.length <= 1) {
      const fresh = newBlock('paragraph')
      onChange([fresh])
      setFocusedId(fresh.id)
      return
    }
    const idx = blocks.findIndex(b => b.id === id)
    const next = blocks.filter(b => b.id !== id)
    onChange(next)
    const focusTarget = next[Math.max(0, idx - 1)]
    setFocusedId(focusTarget?.id ?? null)
  }, [blocks, onChange])

  const insertAfter = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    const idx = blocks.findIndex(b => b.id === afterId)
    const nb = newBlock(type)
    const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    onChange(next)
    setTimeout(() => setFocusedId(nb.id), 0)
  }, [blocks, onChange])

  // Click on bottom empty area → focus last block or add paragraph
  const handleBottomClick = useCallback(() => {
    const last = blocks[blocks.length - 1]
    if (last && TEXT_TYPES.includes(last.type)) {
      setFocusedId(last.id)
    } else {
      const nb = newBlock('paragraph')
      onChange([...blocks, nb])
      setTimeout(() => setFocusedId(nb.id), 0)
    }
  }, [blocks, onChange])

  if (readOnly) {
    return (
      <div>
        {blocks.map(b => <BlockPreview key={b.id} block={b} />)}
      </div>
    )
  }

  return (
    <div className="outline-none" onClick={e => { if (e.target === e.currentTarget) handleBottomClick() }}>
      {blocks.map(block => {
        if (TEXT_TYPES.includes(block.type)) {
          return (
            <TextBlock
              key={block.id}
              block={block}
              focused={focusedId === block.id}
              onFocus={() => setFocusedId(block.id)}
              onChange={content => updateBlock(block.id, { content })}
              onEnter={() => insertAfter(block.id)}
              onDelete={() => deleteBlock(block.id)}
              onBackspaceEmpty={() => deleteBlock(block.id)}
            />
          )
        }
        if (RICH_TYPES.includes(block.type)) {
          return (
            <RichBlock
              key={block.id}
              block={block}
              autoEdit={autoEditId === block.id}
              onUpdate={updates => { updateBlock(block.id, updates); setAutoEditId(null) }}
              onDelete={() => { deleteBlock(block.id); setAutoEditId(null) }}
            />
          )
        }
        if (block.type === 'divider') {
          return (
            <DividerBlock
              key={block.id}
              onDelete={() => deleteBlock(block.id)}
            />
          )
        }
        return null
      })}
      {/* Click-to-continue area */}
      <div className="min-h-16 cursor-text" onClick={handleBottomClick} />
    </div>
  )
})
