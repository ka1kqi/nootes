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
    return <h1 id={`block-${block.id}`} className="font-[family-name:var(--font-display)] text-5xl text-forest leading-tight mt-14 mb-4">{block.content}</h1>
  }
  if (block.type === 'h2') {
    return <h2 id={`block-${block.id}`} className="font-[family-name:var(--font-body)] text-2xl font-semibold text-forest mt-10 mb-2">{block.content}</h2>
  }
  if (block.type === 'h3') {
    return <h3 id={`block-${block.id}`} className="font-[family-name:var(--font-body)] text-lg font-medium text-forest/80 mt-7 mb-1">{block.content}</h3>
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
      <div className="my-2 bg-parchment border border-forest/10 squircle-xl px-6 py-4 overflow-x-auto">
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
      <div className="my-2 bg-parchment border border-forest/10 squircle-xl px-6 py-3">
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
      <div className="my-2 bg-parchment border border-forest/10 squircle-xl overflow-hidden">
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
      <div className={`my-2 ${s.bg} border ${s.border} squircle-xl px-4 py-3 flex gap-3`}>
        <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
        <p className="font-[family-name:var(--font-body)] text-sm text-forest/80 leading-relaxed">{block.content}</p>
      </div>
    )
  }
  if (block.type === 'divider') {
    return <hr className="my-2 border-0 border-t border-forest/[0.08]" />
  }
  return null
}

// ─── Text block (paragraph / h1 / h2 / h3 / quote) ───────────────────────────
// Uses contenteditable so users can select text across multiple blocks.
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
  onBackspaceMerge,
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
  onBackspaceMerge: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onCursorChange?: (pos: number) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  // Read cursor offset as plain-text character position
  const getCursorPos = useCallback((): number => {
    const el = divRef.current
    if (!el) return 0
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return 0
    const range = sel.getRangeAt(0)
    const pre = range.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.startContainer, range.startOffset)
    return pre.toString().length
  }, [])

  // Set cursor to a plain-text character offset
  const setCursorPos = useCallback((pos: number) => {
    const el = divRef.current
    if (!el) return
    const clamped = Math.min(Math.max(0, pos), (el.textContent || '').length)
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    let rem = clamped
    let placed = false
    const walk = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = (node as Text).length
        if (rem <= len) { range.setStart(node, rem); range.collapse(true); placed = true; return true }
        rem -= len
      } else {
        for (const child of Array.from(node.childNodes)) { if (walk(child)) return true }
      }
      return false
    }
    walk(el)
    if (!placed) { range.setStart(el, el.childNodes.length); range.collapse(true) }
    sel.removeAllRanges()
    sel.addRange(range)
  }, [])

  // Sync DOM when block changes externally (type change, undo, merge) — skip while editing
  useEffect(() => {
    const el = divRef.current
    if (!el || document.activeElement === el) return
    if ((el.textContent ?? '') !== block.content) el.textContent = block.content
  }, [block.content, block.type])

  // Focus and position cursor
  useEffect(() => {
    const el = divRef.current
    if (!focused || !el) return
    // Don't steal focus/selection while user has an active selection
    // (e.g. mid-drag or shift+click) — el.focus() would wipe it in most browsers.
    const curSel = window.getSelection()
    if (curSel && !curSel.isCollapsed) return
    el.focus()
    if (focusEdge === null) return
    const len = (el.textContent || '').length
    const pos = focusEdge === 'start' ? 0 : focusEdge === 'end' ? len : Math.min(focusEdge as number, len)
    // Set cursor synchronously — no requestAnimationFrame.
    // el.focus() places the caret at a default position, but since setCursorPos
    // runs in the same synchronous block the browser only paints once (the
    // correct position), eliminating the visible "jump through lines" effect.
    setCursorPos(pos)
  }, [focused, focusEdge, setCursorPos])

  const handleInput = useCallback(() => {
    if (composingRef.current) return
    const el = divRef.current
    if (!el) return
    const raw = el.textContent || ''
    const shortcuts: [string, BlockType][] = [['### ', 'h3'], ['## ', 'h2'], ['# ', 'h1'], ['> ', 'quote']]
    for (const [prefix, type] of shortcuts) {
      if (raw.startsWith(prefix)) {
        const v = raw.slice(prefix.length)
        onTypeChange(type); onChange(v)
        el.textContent = v
        requestAnimationFrame(() => setCursorPos(v.length))
        return
      }
    }
    onChange(raw)
  }, [onChange, onTypeChange, setCursorPos])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = divRef.current
    if (!el) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); onCursorChange?.(getCursorPos()); onEnter(); return
    }
    if (e.key === 'Backspace') {
      const text = el.textContent || ''
      const sel = window.getSelection()
      const hasSelection = sel ? sel.toString().length > 0 : false
      if (!hasSelection) {
        if (text === '') { e.preventDefault(); onBackspaceEmpty(); return }
        if (getCursorPos() === 0) { e.preventDefault(); onBackspaceMerge(); return }
      }
    }
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const savedPos = getCursorPos()
      if (savedPos === 0) { e.preventDefault(); onCursorChange?.(savedPos); onArrowUp(); return }
      // If caret is already on the first visual line, navigate immediately
      // (avoids the browser moving cursor within the block before we can check)
      const selUp = window.getSelection()
      if (selUp && selUp.rangeCount > 0) {
        const cr = selUp.getRangeAt(0).getBoundingClientRect()
        const er = el.getBoundingClientRect()
        if (cr.height > 0 && cr.top - er.top < cr.height) {
          e.preventDefault(); onCursorChange?.(savedPos); onArrowUp(); return
        }
      }
      // Not on first line — let browser move up, then check boundary in RAF
      requestAnimationFrame(() => {
        if (document.activeElement !== el) return
        const newPos = getCursorPos()
        if (newPos === 0 || newPos === savedPos) { onCursorChange?.(savedPos); onArrowUp() }
      })
    }
    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const savedPos = getCursorPos()
      const len = (el.textContent || '').length
      if (savedPos === len) { e.preventDefault(); onCursorChange?.(savedPos); onArrowDown(); return }
      // If caret is already on the last visual line, navigate immediately
      const selDn = window.getSelection()
      if (selDn && selDn.rangeCount > 0) {
        const cr = selDn.getRangeAt(0).getBoundingClientRect()
        const er = el.getBoundingClientRect()
        if (cr.height > 0 && er.bottom - cr.bottom < cr.height) {
          e.preventDefault(); onCursorChange?.(savedPos); onArrowDown(); return
        }
      }
      // Not on last line — let browser move down, then check boundary in RAF
      requestAnimationFrame(() => {
        if (document.activeElement !== el) return
        const newPos = getCursorPos()
        if (newPos === (el.textContent || '').length || newPos === savedPos) { onCursorChange?.(savedPos); onArrowDown() }
      })
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    sel.deleteFromDocument()
    const range = sel.getRangeAt(0)
    const node = document.createTextNode(text)
    range.insertNode(node)
    range.setStartAfter(node); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    handleInput()
  }

  // Shift+click: extend selection across blocks
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.shiftKey) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const el = divRef.current
    if (!el) return
    const anchorEl = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest('[data-block-id]')
    if (!anchorEl || anchorEl === el) return // Same block — let browser handle
    e.preventDefault()
    // Locate the exact click position and extend the selection there
    type CaretPos = { offsetNode: Node; offset: number } | null
    const clickRange: Range | null =
      document.caretRangeFromPoint?.(e.clientX, e.clientY) ??
      (() => {
        const cp = (document as Document & { caretPositionFromPoint?: (x: number, y: number) => CaretPos }).caretPositionFromPoint?.(e.clientX, e.clientY)
        if (!cp) return null
        const r = document.createRange(); r.setStart(cp.offsetNode, cp.offset); return r
      })()
    if (clickRange) sel.extend(clickRange.startContainer, clickRange.startOffset)
  }, [])

  const textClass =
    block.type === 'h1'      ? 'font-[family-name:var(--font-display)] text-5xl text-forest leading-tight mt-6 mb-0.5'
    : block.type === 'h2'    ? 'font-[family-name:var(--font-body)] text-2xl font-semibold text-forest mt-5'
    : block.type === 'h3'    ? 'font-[family-name:var(--font-body)] text-lg font-medium text-forest/80 mt-3'
    : block.type === 'quote' ? 'font-[family-name:var(--font-body)] text-base italic text-forest/60 border-l-2 border-sage/40 pl-4 my-1'
    : 'font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed'

  return (
    <div
      ref={divRef}
      data-block-id={block.id}
      id={['h1', 'h2', 'h3'].includes(block.type) ? `block-${block.id}` : undefined}
      contentEditable
      suppressContentEditableWarning
      onMouseDown={handleMouseDown}
      onFocus={() => { if (!focused) onFocus() }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onSelect={() => onCursorChange?.(getCursorPos())}
      onPaste={handlePaste}
      onCompositionStart={() => { composingRef.current = true }}
      onCompositionEnd={() => { composingRef.current = false; handleInput() }}
      className={`block w-full outline-none bg-transparent caret-forest cursor-text ${textClass}`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.2em' }}
    />
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
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); commit() }
  }

  const hint =
    block.type === 'latex' ? 'KaTeX · e.g. \\frac{a}{b}'
    : block.type === 'code' ? 'Source code'
    : block.type === 'chemistry' ? 'KaTeX chem · e.g. \\text{H}_2\\text{O}'
    : block.type === 'table' ? 'CSV · first row = headers'
    : 'Callout text'

  const sourceRows = block.type === 'code' ? 6 : block.type === 'table' ? 4 : 3

  const ringRadius = block.type === 'code' ? 'squircle' : 'squircle-xl'

  if (!editing) {
    return (
      <div
        ref={wrapRef}
        tabIndex={-1}
        className={`relative group cursor-pointer outline-none transition-all ${ringRadius} ${selected ? 'ring-2 ring-sage/50' : ''}`}
        onClick={openEdit}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' && !e.shiftKey)   { e.preventDefault(); onArrowUp?.() }
          if (e.key === 'ArrowDown' && !e.shiftKey) { e.preventDefault(); onArrowDown?.() }
          if (e.key === 'Enter')     { e.preventDefault(); openEdit() }
          if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); onDelete() }
        }}
      >
        {/* Hover ring (not shown when selected — outer div has the ring) */}
        <div className={`absolute inset-0 ${ringRadius} ring-inset pointer-events-none transition-all ${selected ? '' : 'ring-0 group-hover:ring-2 group-hover:ring-sage/40'}`} />
        <BlockPreview block={block} />
        {/* Action buttons — visible on hover or when keyboard-selected */}
        <div className={`absolute -bottom-[26px] left-1/2 -translate-x-1/2 flex items-center gap-px bg-forest/80 backdrop-blur-sm squircle-sm shadow-sm z-10 overflow-hidden transition-opacity duration-150 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            className="flex items-center gap-1.5 px-3 py-1 font-[family-name:var(--font-body)] text-[10px] text-parchment/80 hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={e => { e.stopPropagation(); openEdit() }}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            Edit
          </button>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <button
            className="flex items-center gap-1.5 px-3 py-1 font-[family-name:var(--font-body)] text-[10px] text-parchment/60 hover:text-sienna/90 hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete
          </button>
        </div>
      </div>
    )
  }

  // ── Edit mode: split pane ────────────────────────────────────────────────
  return (
      <div ref={wrapRef} className="my-1 border border-sage/40 squircle-xl overflow-hidden bg-cream shadow-[0_2px_16px_-4px_rgba(38,70,53,0.10)]" onKeyDown={handleKeyDown}>
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
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const el = e.currentTarget
              const start = el.selectionStart
              const end = el.selectionEnd
              const newValue = draft.slice(0, start) + '\t' + draft.slice(end)
              setDraft(newValue)
              requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1))
            }
          }}
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
      className="relative my-2 group cursor-pointer outline-none"
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

      // If a text block is focused, insert the new block at the cursor position.
      // Only keep the "before" text if it's non-empty — an empty before-block
      // would create an unwanted blank line above the inserted block.
      const focusedBlock = focusedId ? blocks.find(b => b.id === focusedId) : null
      if (focusedBlock && TEXT_TYPES.includes(focusedBlock.type) && idx !== -1) {
        const cursor = cursorPosRef.current
        const before = focusedBlock.content.slice(0, cursor)
        const after  = focusedBlock.content.slice(cursor)
        const afterBlock = { ...newBlock('paragraph'), content: after }
        const next = [
          ...blocks.slice(0, idx),
          ...(before.length > 0 ? [{ ...focusedBlock, content: before }] : []),
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

  // Split a text block at the cursor position (Enter key — like Google Docs)
  const splitBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx === -1) return
    const block = blocks[idx]
    if (!TEXT_TYPES.includes(block.type)) return
    const cursor = cursorPosRef.current
    const content = block.content

    // Empty block: just insert paragraph after
    if (content === '') {
      const nb = newBlock('paragraph')
      const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
      onChange(next)
      setTimeout(() => focusBlock(nb.id, 'start'), 0)
      return
    }

    // Cursor at start: insert blank line before, keep focus on current
    if (cursor === 0) {
      const nb = newBlock('paragraph')
      const next = [...blocks.slice(0, idx), nb, ...blocks.slice(idx)]
      onChange(next)
      setTimeout(() => focusBlock(block.id, 'start'), 0)
      return
    }

    // Split at cursor position
    const before = content.slice(0, cursor)
    const after = content.slice(cursor)
    const nb = newBlock('paragraph')
    nb.content = after
    const next = [
      ...blocks.slice(0, idx),
      { ...block, content: before },
      nb,
      ...blocks.slice(idx + 1),
    ]
    onChange(next)
    setTimeout(() => focusBlock(nb.id, 'start'), 0)
  }, [blocks, focusBlock, onChange])

  // Merge current text block with previous (Backspace at position 0 — like Google Docs)
  const mergeUp = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx <= 0) return
    const prevBlock = blocks[idx - 1]
    if (TEXT_TYPES.includes(prevBlock.type)) {
      const curBlock = blocks[idx]
      const merged = prevBlock.content + curBlock.content
      const cursorPos = prevBlock.content.length
      const next = blocks.map((b, i) =>
        i === idx - 1 ? { ...b, content: merged } : b
      ).filter((_, i) => i !== idx)
      onChange(next)
      setTimeout(() => focusBlock(prevBlock.id, cursorPos), 0)
    } else {
      // Previous is rich/divider — select it
      setFocusedId(prevBlock.id)
    }
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

  // ── Cross-block selection handler (capture phase) ─────────────────────────
  // Fires before individual block key handlers so we can intercept cross-block
  // actions: delete / type-to-replace / Shift+Arrow extension.
  const handleCrossBlockKeyDown = useCallback((e: React.KeyboardEvent) => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)

    const blockElOf = (node: Node | null): HTMLElement | null => {
      if (!node) return null
      const el = node instanceof Element ? node : node.parentElement
      return el?.closest('[data-block-id]') as HTMLElement | null
    }
    const getFirstText = (el: Element): Text | null => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      return w.nextNode() as Text | null
    }
    const getLastText = (el: Element): Text | null => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let last: Text | null = null; let n = w.nextNode()
      while (n) { last = n as Text; n = w.nextNode() }
      return last
    }
    const extendToEnd   = (el: Element) => { const lt = getLastText(el);  lt ? sel.extend(lt, lt.length) : sel.extend(el, el.childNodes.length) }
    const extendToStart = (el: Element) => { const ft = getFirstText(el); ft ? sel.extend(ft, 0)          : sel.extend(el, 0) }

    // ── Delete / type-to-replace on a cross-block selection ─────────────────
    if (!sel.isCollapsed) {
      const startEl = blockElOf(range.startContainer)
      const endEl   = blockElOf(range.endContainer)
      if (startEl && endEl && startEl !== endEl) {
        const isDelete = e.key === 'Backspace' || e.key === 'Delete'
        const isChar   = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey
        if (isDelete || isChar) {
          e.preventDefault()
          e.stopPropagation()
          const startIdx = blocks.findIndex(b => b.id === startEl.dataset.blockId)
          const endIdx   = blocks.findIndex(b => b.id === endEl.dataset.blockId)
          if (startIdx === -1 || endIdx === -1) return

          const preRange = document.createRange()
          preRange.selectNodeContents(startEl)
          preRange.setEnd(range.startContainer, range.startOffset)
          const textBefore = preRange.toString()

          const postRange = document.createRange()
          postRange.selectNodeContents(endEl)
          postRange.setStart(range.endContainer, range.endOffset)
          const textAfter = postRange.toString()

          const insert     = isChar ? e.key : ''
          const newContent = textBefore + insert + textAfter
          const startBlock = blocks[startIdx]
          onChange([
            ...blocks.slice(0, startIdx),
            { ...startBlock, content: newContent },
            ...blocks.slice(endIdx + 1),
          ])
          // Clear stale cross-block selection so the focus effect can place the cursor
          window.getSelection()?.removeAllRanges()
          setTimeout(() => focusBlock(startBlock.id, textBefore.length + insert.length), 0)
          return
        }
        // Non-delete/typing key with a cross-block selection (e.g. Shift+Arrow):
        // fall through to the extension logic below.
      }
    }

    // ── Shift+Arrow: extend selection across block boundaries ────────────────
    if (!e.shiftKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return

    const focusEl      = blockElOf(sel.focusNode)
    const anchorBlockEl = blockElOf(sel.anchorNode)
    if (!focusEl) return

    // If a cross-block selection already exists, the browser's default
    // Shift+Arrow behaviour is undefined across contenteditable boundaries —
    // it often collapses or corrupts the selection.  Prevent it and extend
    // the focus end ourselves immediately.
    if (!sel.isCollapsed && anchorBlockEl && anchorBlockEl !== focusEl) {
      e.preventDefault()
      const focusIdx = blocks.findIndex(b => b.id === focusEl.dataset.blockId)
      if (focusIdx === -1 || !TEXT_TYPES.includes(blocks[focusIdx].type)) return
      if (e.key === 'ArrowDown') {
        let ni = focusIdx + 1
        while (ni < blocks.length && !TEXT_TYPES.includes(blocks[ni].type)) ni++
        if (ni >= blocks.length) return
        const nextEl = document.querySelector(`[data-block-id="${blocks[ni].id}"]`)
        if (nextEl) extendToEnd(nextEl)
      } else {
        let pi = focusIdx - 1
        while (pi >= 0 && !TEXT_TYPES.includes(blocks[pi].type)) pi--
        if (pi < 0) return
        const prevEl = document.querySelector(`[data-block-id="${blocks[pi].id}"]`)
        if (prevEl) extendToStart(prevEl)
      }
      return
    }

    // Selection is within a single block: let the browser extend within the
    // block first, then check in a RAF whether the focus reached the boundary.
    const key = e.key
    requestAnimationFrame(() => {
      const s = window.getSelection()
      if (!s) return
      const fe = blockElOf(s.focusNode)
      if (!fe) return
      const fi = blocks.findIndex(b => b.id === fe.dataset.blockId)
      if (fi === -1 || !TEXT_TYPES.includes(blocks[fi].type)) return

      const pr = document.createRange()
      pr.selectNodeContents(fe)
      pr.setEnd(s.focusNode!, s.focusOffset)
      const focusCharPos = pr.toString().length
      const blockLen     = (fe.textContent || '').length

      if (key === 'ArrowDown' && focusCharPos >= blockLen) {
        let ni = fi + 1
        while (ni < blocks.length && !TEXT_TYPES.includes(blocks[ni].type)) ni++
        if (ni >= blocks.length) return
        const nextEl = document.querySelector(`[data-block-id="${blocks[ni].id}"]`)
        if (nextEl) extendToEnd(nextEl)
      } else if (key === 'ArrowUp' && focusCharPos === 0) {
        let pi = fi - 1
        while (pi >= 0 && !TEXT_TYPES.includes(blocks[pi].type)) pi--
        if (pi < 0) return
        const prevEl = document.querySelector(`[data-block-id="${blocks[pi].id}"]`)
        if (prevEl) extendToStart(prevEl)
      }
    })
  }, [blocks, onChange, focusBlock])

  return (
    <div
      className="outline-none"
      onClick={e => { if (e.target === e.currentTarget) handleBottomClick() }}
      onKeyDownCapture={handleCrossBlockKeyDown}
      onMouseMove={e => {
        if (!(e.buttons & 1)) return  // primary button not held
        const sel = window.getSelection()
        if (!sel || !sel.anchorNode) return
        // Only intervene when dragging into a different block than where selection started
        const anchorEl = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('[data-block-id]')
        const hoverEl  = (e.target instanceof Element ? e.target : null)?.closest('[data-block-id]')
        if (!anchorEl || !hoverEl || anchorEl === hoverEl) return
        // Extend selection to exact character position under the cursor
        type CaretPos = { offsetNode: Node; offset: number } | null
        const cr = document.caretRangeFromPoint?.(e.clientX, e.clientY) ??
          (() => {
            const cp = (document as Document & { caretPositionFromPoint?: (x: number, y: number) => CaretPos }).caretPositionFromPoint?.(e.clientX, e.clientY)
            if (!cp) return null
            const r = document.createRange(); r.setStart(cp.offsetNode, cp.offset); return r
          })()
        if (cr) sel.extend(cr.startContainer, cr.startOffset)
      }}
    >
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
                onEnter={() => splitBlock(block.id)}
                onBackspaceEmpty={() => deleteBlock(block.id)}
                onBackspaceMerge={() => mergeUp(block.id)}
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
