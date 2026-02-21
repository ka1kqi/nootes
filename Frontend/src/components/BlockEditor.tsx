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
  setCurrentType: (type: BlockType) => void
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
    return <p className="font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed mb-5">{block.content || <span className="opacity-0">.</span>}</p>
  }
  if (block.type === 'h1') {
    return <h1 className="font-[family-name:var(--font-display)] text-5xl text-forest leading-tight mt-14 mb-4">{block.content}</h1>
  }
  if (block.type === 'h2') {
    return <h2 className="font-[family-name:var(--font-body)] text-2xl font-semibold text-forest mt-10 mb-2">{block.content}</h2>
  }
  if (block.type === 'h3') {
    return <h3 className="font-[family-name:var(--font-body)] text-lg font-medium text-forest/80 mt-7 mb-1">{block.content}</h3>
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="pl-4 border-l-2 border-sage/50 my-5 italic text-forest/60 font-[family-name:var(--font-body)] text-base">
        {block.content}
      </blockquote>
    )
  }
  if (block.type === 'latex') {
    return (
      <div className="my-6 bg-parchment border border-forest/10 squircle-xl px-6 py-4 overflow-x-auto">
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
      <div className="my-6 bg-parchment border border-forest/10 squircle-xl px-6 py-3">
        {caption && <p className="font-mono text-[10px] text-forest/35 mb-1 tracking-wider">{caption}</p>}
        <KaTeX math={block.content} display />
      </div>
    )
  }
  if (block.type === 'table') {
    const caption = block.meta?.caption as string | undefined
    const lines = block.content.split('\n').filter(Boolean)
    if (!lines.length) return <div className="my-6 h-10 border border-dashed border-forest/15 squircle flex items-center justify-center font-mono text-xs text-forest/25">Empty table</div>
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
      <div className={`my-5 ${s.bg} border ${s.border} squircle-xl px-4 py-3 flex gap-3`}>
        <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
        <p className="font-[family-name:var(--font-body)] text-sm text-forest/80 leading-relaxed">{block.content}</p>
      </div>
    )
  }
  if (block.type === 'divider') {
    return <hr className="my-4 border-0 border-t border-forest/[0.08]" />
  }
  return null
}

// ─── Text block (paragraph / h1 / h2 / h3 / quote) ───────────────────────────
// Completely document-like — no borders, no containers, flows as natural text.
// Markdown shortcuts: "# ", "## ", "### ", "> " at block start change the type.

function TextBlock({
  block,
  focused,
  focusEdge,
  onFocus,
  onChange,
  onTypeChange,
  onEnter,
  onBackspaceEmpty,
  onArrowUp,
  onArrowDown,
  onCursorChange,
}: {
  block: Block
  focused: boolean
  focusEdge: 'start' | 'end' | number | null
  onFocus: () => void
  onChange: (content: string) => void
  onTypeChange: (type: BlockType) => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onCursorChange?: (pos: number) => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Focus and position cursor when this block becomes active
  useEffect(() => {
    const el = taRef.current
    if (!focused || !el) return
    el.focus()
    if (focusEdge === null) return // preserve existing cursor (e.g. user clicked)
    if (focusEdge === 'start') {
      el.setSelectionRange(0, 0)
    } else if (focusEdge === 'end') {
      el.setSelectionRange(el.value.length, el.value.length)
    } else {
      // Numeric — position cursor at this column (clamped to content length)
      const pos = Math.min(focusEdge, el.value.length)
      el.setSelectionRange(pos, pos)
    }
  }, [focused, focusEdge])

  // Auto-grow textarea to fit its content
  const autoResize = useCallback(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => { autoResize() }, [block.content, block.type, autoResize])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    // Markdown shortcuts detected at the very start of the content
    if (val.startsWith('### ')) { onTypeChange('h3'); onChange(val.slice(4)); return }
    if (val.startsWith('## '))  { onTypeChange('h2'); onChange(val.slice(3)); return }
    if (val.startsWith('# '))   { onTypeChange('h1'); onChange(val.slice(2)); return }
    if (val.startsWith('> '))   { onTypeChange('quote'); onChange(val.slice(2)); return }
    onChange(val)
    autoResize()
  }

  // Per-type text styles — no container chrome at all
  const textClass =
    block.type === 'h1'    ? 'font-[family-name:var(--font-display)] text-5xl text-forest leading-tight mt-10 mb-1'
    : block.type === 'h2'  ? 'font-[family-name:var(--font-body)] text-2xl font-semibold text-forest mt-8 mb-0.5'
    : block.type === 'h3'  ? 'font-[family-name:var(--font-body)] text-lg font-medium text-forest/80 mt-6'
    : block.type === 'quote' ? 'font-[family-name:var(--font-body)] text-base italic text-forest/60 border-l-2 border-sage/40 pl-4 my-3'
    : 'font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed'

  return (
    <div onClick={onFocus}>
      <textarea
        ref={taRef}
        value={block.content}
        rows={1}
        onFocus={() => { if (!focused) onFocus() }}
        onSelect={e => onCursorChange?.((e.target as HTMLTextAreaElement).selectionStart)}
        onClick={e => onCursorChange?.((e.target as HTMLTextAreaElement).selectionStart)}
        className={`block w-full resize-none overflow-hidden bg-transparent outline-none border-none ring-0 p-0 caret-forest ${textClass}`}
        onChange={handleChange}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() }
          if (e.key === 'Backspace' && block.content === '') { e.preventDefault(); onBackspaceEmpty() }
          if (e.key === 'ArrowUp' && !e.shiftKey) {
            const el = taRef.current
            if (!el) return
            const savedCol = el.selectionStart
            if (el.selectionStart === 0 && el.selectionEnd === 0) {
              e.preventDefault(); onCursorChange?.(savedCol); onArrowUp(); return
            }
            requestAnimationFrame(() => {
              if (document.activeElement !== el) return
              if (el.selectionStart === 0 || el.selectionStart === savedCol) {
                onCursorChange?.(savedCol); onArrowUp()
              }
            })
          }
          if (e.key === 'ArrowDown' && !e.shiftKey) {
            const el = taRef.current
            if (!el) return
            const savedCol = el.selectionStart
            const len = el.value.length
            if (el.selectionStart === len && el.selectionEnd === len) {
              e.preventDefault(); onCursorChange?.(savedCol); onArrowDown(); return
            }
            requestAnimationFrame(() => {
              if (document.activeElement !== el) return
              if (el.selectionStart === el.value.length || el.selectionStart === savedCol) {
                onCursorChange?.(savedCol); onArrowDown()
              }
            })
          }
        }}
      />
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
  selected = false,
  onArrowUp,
  onArrowDown,
}: {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
  onDelete: () => void
  autoEdit?: boolean
  selected?: boolean
  onArrowUp?: () => void
  onArrowDown?: () => void
}) {
  const [editing, setEditing] = useState(autoEdit)
  const [draft, setDraft] = useState(block.content)
  const [draftMeta, setDraftMeta] = useState<Record<string, unknown>>(block.meta ?? {})
  const wrapRef = useRef<HTMLDivElement>(null)

  // When keyboard-selected, grab DOM focus so key events reach us
  useEffect(() => {
    if (selected && !editing) wrapRef.current?.focus()
  }, [selected, editing])

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

  const sourceRows = block.type === 'code' ? 6 : block.type === 'table' ? 4 : 3

  if (!editing) {
    return (
      <div
        ref={wrapRef}
        tabIndex={-1}
        className={`relative my-2 group cursor-pointer outline-none transition-all squircle-xl ${selected ? 'ring-2 ring-sage/50' : ''}`}
        onClick={openEdit}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' && !e.shiftKey)   { e.preventDefault(); onArrowUp?.() }
          if (e.key === 'ArrowDown' && !e.shiftKey) { e.preventDefault(); onArrowDown?.() }
          if (e.key === 'Enter')     { e.preventDefault(); openEdit() }
          if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); onDelete() }
        }}
      >
        {/* Hover ring (not shown when selected — outer div has the ring) */}
        <div className={`absolute inset-0 squircle-xl ring-inset pointer-events-none transition-all ${selected ? '' : 'ring-0 group-hover:ring-2 group-hover:ring-sage/40'}`} />
        {/* Delete button on hover */}
        <button
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-cream border border-forest/15 squircle-sm flex items-center justify-center font-mono text-[10px] text-forest/40 hover:text-sienna hover:border-sienna/30 transition-all shadow-sm z-10"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          ✕
        </button>
        <BlockPreview block={block} />
        {/* Keyboard hint when selected */}
        {selected && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-forest/80 text-parchment/80 px-2.5 py-0.5 squircle-sm font-mono text-[9px] backdrop-blur-sm shadow-sm z-10 whitespace-nowrap">
            <span>↩ edit</span>
            <span className="text-parchment/30">·</span>
            <span>⌫ delete</span>
            <span className="text-parchment/30">·</span>
            <span>↑↓ navigate</span>
          </div>
        )}
      </div>
    )
  }

  // ── Edit mode: split pane ────────────────────────────────────────────────
  return (
      <div ref={wrapRef} className="my-2 border border-sage/40 squircle-xl overflow-hidden bg-cream shadow-[0_2px_16px_-4px_rgba(38,70,53,0.10)]" onKeyDown={handleKeyDown}>
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
          className="w-full bg-transparent font-mono text-[13px] text-forest/80 leading-relaxed p-3 resize-none focus:outline-none"
          spellCheck={false}
          placeholder={hint}
        />

        {/* Live preview */}
        <div className="p-3 bg-parchment/30">
          <span className="font-mono text-[9px] text-forest/25 block mb-1 tracking-wider uppercase">Live Preview</span>
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

function DividerBlock({ onDelete, selected = false, onArrowUp, onArrowDown }: {
  onDelete: () => void
  selected?: boolean
  onArrowUp?: () => void
  onArrowDown?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (selected) ref.current?.focus() }, [selected])
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="relative my-6 group cursor-pointer outline-none"
      onKeyDown={e => {
        if (e.key === 'ArrowUp' && !e.shiftKey)   { e.preventDefault(); onArrowUp?.() }
        if (e.key === 'ArrowDown' && !e.shiftKey) { e.preventDefault(); onArrowDown?.() }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); onDelete() }
      }}
    >
      <hr className={`border-0 border-t transition-colors ${selected ? 'border-sage/50' : 'border-forest/[0.1] group-hover:border-forest/20'}`} />
      {selected && (
        <>
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 bg-cream border border-forest/15 squircle-sm flex items-center justify-center font-mono text-[10px] text-forest/40 hover:text-sienna transition-all"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >
            ✕
          </button>
          {/* Keyboard hint */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-forest/80 text-parchment/80 px-2.5 py-0.5 squircle-sm font-mono text-[9px] backdrop-blur-sm shadow-sm z-10 whitespace-nowrap">
            <span>⌫ delete</span>
            <span className="text-parchment/30">·</span>
            <span>↑↓ navigate</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main BlockEditor ─────────────────────────────────────────────────────────

export const BlockEditor = forwardRef<
  BlockEditorHandle,
  { blocks: Block[]; onChange: (blocks: Block[]) => void; readOnly?: boolean; onFocusChange?: (type: BlockType | null) => void }
>(function BlockEditor({ blocks, onChange, readOnly = false, onFocusChange }, ref) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusEdge, setFocusEdge] = useState<'start' | 'end' | number | null>('end')
  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const cursorPosRef = useRef<number>(0)

  const focusBlock = useCallback((id: string | null, edge: 'start' | 'end' | number | null = 'end') => {
    setFocusEdge(edge)
    setFocusedId(id)
  }, [])

  // Notify parent of the focused block's type so the toolbar can reflect it
  useEffect(() => {
    const block = blocks.find(b => b.id === focusedId)
    onFocusChange?.(block && TEXT_TYPES.includes(block.type) ? block.type : null)
  }, [focusedId, blocks, onFocusChange])

  // Expose insertBlock + setCurrentType to parent toolbar via ref
  useImperativeHandle(ref, () => ({
    insertBlock(type: BlockType) {
      const idx = focusedId ? blocks.findIndex(b => b.id === focusedId) : blocks.length - 1
      const insertAt = idx === -1 ? blocks.length : idx + 1
      const nb = newBlock(type)

      // If a text block is focused, split it at the cursor position
      const focusedBlock = focusedId ? blocks.find(b => b.id === focusedId) : null
      if (focusedBlock && TEXT_TYPES.includes(focusedBlock.type) && idx !== -1) {
        const cursor = cursorPosRef.current
        const before = focusedBlock.content.slice(0, cursor)
        const after = focusedBlock.content.slice(cursor)
        const afterBlock = { ...newBlock('paragraph'), content: after }
        const next = [
          ...blocks.slice(0, idx),
          { ...focusedBlock, content: before },
          nb,
          ...(after.length > 0 ? [afterBlock] : []),
          ...blocks.slice(idx + 1),
        ]
        onChange(next)
        if (TEXT_TYPES.includes(type)) {
          setTimeout(() => focusBlock(nb.id, 'end'), 0)
        } else if (RICH_TYPES.includes(type)) {
          setTimeout(() => setAutoEditId(nb.id), 0)
        }
        return
      }

      const next = [...blocks.slice(0, insertAt), nb, ...blocks.slice(insertAt)]
      onChange(next)
      if (TEXT_TYPES.includes(type)) {
        setTimeout(() => focusBlock(nb.id, 'end'), 0)
      } else if (RICH_TYPES.includes(type)) {
        setTimeout(() => setAutoEditId(nb.id), 0)
      }
    },
    setCurrentType(type: BlockType) {
      if (!focusedId) return
      const block = blocks.find(b => b.id === focusedId)
      if (block && TEXT_TYPES.includes(block.type)) {
        onChange(blocks.map(b => b.id === focusedId ? { ...b, type } : b))
      }
    },
  }), [blocks, focusedId, focusBlock, onChange])

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }, [blocks, onChange])

  const deleteBlock = useCallback((id: string) => {
    if (blocks.length <= 1) {
      const fresh = newBlock('paragraph')
      onChange([fresh])
      focusBlock(fresh.id, 'end')
      return
    }
    const idx = blocks.findIndex(b => b.id === id)
    const next = blocks.filter(b => b.id !== id)
    onChange(next)
    const focusTarget = next[Math.max(0, idx - 1)]
    focusBlock(focusTarget?.id ?? null, 'end')
  }, [blocks, focusBlock, onChange])

  const insertAfter = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    const idx = blocks.findIndex(b => b.id === afterId)
    const nb = newBlock(type)
    const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    onChange(next)
    setTimeout(() => focusBlock(nb.id, 'start'), 0)
  }, [blocks, focusBlock, onChange])

  // Navigate one block at a time — lands on rich/divider blocks too (gives them keyboard focus)
  const arrowNav = useCallback((direction: 'up' | 'down') => {
    if (!focusedId) return
    const idx = blocks.findIndex(b => b.id === focusedId)
    if (idx === -1) return
    const step = direction === 'up' ? -1 : 1
    const target = blocks[idx + step]
    if (!target) return
    if (TEXT_TYPES.includes(target.type)) {
      // Preserve column position across blocks
      focusBlock(target.id, cursorPosRef.current)
    } else {
      // Rich or divider: set as focused (its useEffect will grab DOM focus)
      setFocusedId(target.id)
    }
  }, [blocks, focusedId, focusBlock])

  // Click on bottom empty area → focus last block or add paragraph
  const handleBottomClick = useCallback(() => {
    const last = blocks[blocks.length - 1]
    if (last && TEXT_TYPES.includes(last.type)) {
      focusBlock(last.id, 'end')
    } else {
      const nb = newBlock('paragraph')
      onChange([...blocks, nb])
      setTimeout(() => focusBlock(nb.id, 'end'), 0)
    }
  }, [blocks, focusBlock, onChange])

  if (readOnly) {
    return (
      <div>
        {blocks.map(b => <BlockPreview key={b.id} block={b} />)}
      </div>
    )
  }

  const insertAt = useCallback((idx: number) => {
    const nb = newBlock('paragraph')
    const next = [...blocks.slice(0, idx), nb, ...blocks.slice(idx)]
    onChange(next)
    setTimeout(() => focusBlock(nb.id, 'start'), 0)
  }, [blocks, focusBlock, onChange])

  return (
    <div className="outline-none" onClick={e => { if (e.target === e.currentTarget) handleBottomClick() }}>
      {/* Click zone before first block if it's a rich/divider block */}
      {blocks.length > 0 && !TEXT_TYPES.includes(blocks[0].type) && (
        <div className="h-2 cursor-text" onClick={() => insertAt(0)} />
      )}
      {blocks.map((block, idx) => {
        const blockEl = (() => {
          if (TEXT_TYPES.includes(block.type)) {
            return (
              <TextBlock
                block={block}
                focused={focusedId === block.id}
                focusEdge={focusEdge}
                onFocus={() => focusBlock(block.id, null)}
                onChange={content => updateBlock(block.id, { content })}
                onTypeChange={type => updateBlock(block.id, { type })}
                onEnter={() => insertAfter(block.id)}
                onBackspaceEmpty={() => deleteBlock(block.id)}
                onArrowUp={() => arrowNav('up')}
                onArrowDown={() => arrowNav('down')}
                onCursorChange={pos => { cursorPosRef.current = pos }}
              />
            )
          }
          if (RICH_TYPES.includes(block.type)) {
            return (
              <RichBlock
                block={block}
                autoEdit={autoEditId === block.id}
                selected={focusedId === block.id}
                onUpdate={updates => { updateBlock(block.id, updates); setAutoEditId(null) }}
                onDelete={() => { deleteBlock(block.id); setAutoEditId(null) }}
                onArrowUp={() => arrowNav('up')}
                onArrowDown={() => arrowNav('down')}
              />
            )
          }
          if (block.type === 'divider') {
            return (
              <DividerBlock
                selected={focusedId === block.id}
                onDelete={() => deleteBlock(block.id)}
                onArrowUp={() => arrowNav('up')}
                onArrowDown={() => arrowNav('down')}
              />
            )
          }
          return null
        })()

        // Minimal click zone only between adjacent non-text blocks
        const nextBlock = blocks[idx + 1]
        const showGap = !TEXT_TYPES.includes(block.type) && (!nextBlock || !TEXT_TYPES.includes(nextBlock.type))

        return (
          <div key={block.id}>
            {blockEl}
            {showGap && (
              <div className="h-1 cursor-text hover:h-2 transition-all" onClick={() => insertAt(idx + 1)} />
            )}
          </div>
        )
      })}
      {/* Click-to-continue area */}
      <div className="min-h-16 cursor-text" onClick={handleBottomClick} />
    </div>
  )
})
