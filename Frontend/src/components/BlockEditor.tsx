/**
 * @file BlockEditor.tsx
 * Rich block-based document editor built on contenteditable + custom
 * React components. Supports text blocks (paragraph, h1–h3, quote),
 * rich blocks (LaTeX, code, chemistry, table, callout, diagram), an
 * interactive bullet-list block, and a divider block.
 *
 * Key behaviours:
 * - Cross-block text selection (click-drag, Shift+Arrow, Shift+Click)
 * - Markdown shortcuts (`# `, `## `, `### `, `> `) inside text blocks
 * - Enter splits text blocks; Backspace at offset 0 merges with the
 *   previous block (Google-Docs style)
 * - Undo/redo handled externally by the parent through `blocks`/`onChange`
 * - Exposes `insertBlock` and `setCurrentType` via an imperative ref handle
 */

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
import { Mermaid } from './Mermaid'
import { newBlock } from '../hooks/useDocument'
import type { Block, BlockType } from '../hooks/useDocument'
// minor fix
// ─── Public handle exposed via ref ───────────────────────────────────────────

/**
 * Imperative handle returned to parent components via `ref`.
 * Lets toolbar buttons insert blocks and change the focused block's type
 * without the parent managing block-array state directly.
 */
export type BlockEditorHandle = {
  /** Inserts a new block of `type` after the currently focused block. */
  insertBlock: (type: BlockType) => void
  /** Changes the type of the currently focused *text* block. */
  setCurrentType: (type: BlockType) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Block types that render as contenteditable text elements. */
const TEXT_TYPES: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'quote']
/** Block types that open a source/preview split-pane editor on click. */
const RICH_TYPES: BlockType[] = ['latex', 'code', 'chemistry', 'table', 'callout', 'diagram', 'ordered_list']
/** Block types that manage their own internal item focus. */
const BULLET_TYPES: BlockType[] = ['bullet_list']

/** Human-readable display names for the toolbar and edit-mode header. */
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
  diagram: 'Diagram',
  bullet_list: 'Bullet List',
  ordered_list: 'Numbered List',
}

/** Ordered list of valid callout variant keys. */
const CALLOUT_VARIANTS = ['info', 'tip', 'warning', 'important'] as const

/** Per-variant Tailwind classes and metadata for callout blocks. */
const CALLOUT_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  info:      { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'ℹ',  label: 'Info' },
  tip:       { bg: 'bg-sage/10',   border: 'border-sage/30',   icon: '💡', label: 'Tip' },
  warning:   { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠',  label: 'Warning' },
  important: { bg: 'bg-sienna/10', border: 'border-sienna/30', icon: '❗', label: 'Important' },
}

// ─── BlockPreview — pure render, no interaction ───────────────────────────────

/**
 * Read-only renderer for a single block.
 * Used both in the `readOnly` editor mode and as the live-preview pane
 * inside the `RichBlock` edit modal.
 *
 * @param block - The block data to render.
 */
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
  if (block.type === 'diagram') {
    const caption = block.meta?.caption as string | undefined
    return (
      <div className="my-2 bg-parchment border border-forest/10 squircle-xl px-6 py-4 overflow-x-auto">
        {caption && <p className="font-mono text-[10px] text-forest/35 mb-2 tracking-wider">{caption}</p>}
        {block.content.trim()
          ? <Mermaid chart={block.content} />
          : <div className="h-10 flex items-center justify-center font-mono text-xs text-forest/25">Empty diagram</div>
        }
      </div>
    )
  }
  if (block.type === 'bullet_list') {
    // Prefer structured items from meta; fall back to legacy newline-split content
    const rawItems = block.meta?.items as Array<{ id?: string; text: string; indent: number }> | undefined
    const items = Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems
      : block.content.split('\n').filter(Boolean).map(line => {
          const spaces = line.match(/^( +)/)?.[1]?.length ?? 0
          return { text: line.trimStart(), indent: Math.floor(spaces / 2) }
        })
    if (!items.length) return null
    /**
     * Recursively builds a nested `<ul>` tree from the flat `items` array.
     * Items at `parentIndent` become `<li>` entries; deeper items are
     * collected by a recursive call and attached as nested `<ul>` children.
     * Returns the rendered element and the count of items consumed so the
     * caller can advance its index past the nested group.
     */
    const renderItems = (parentIndent: number, startIdx: number): { el: React.ReactNode; consumed: number } => {
      const listItems: React.ReactNode[] = []
      let i = startIdx
      while (i < items.length) {
        const item = items[i]
        if (item.indent < parentIndent) break
        if (item.indent === parentIndent) {
          // Check if next items have deeper indent
          let j = i + 1
          let nested: React.ReactNode = null
          if (j < items.length && items[j].indent > parentIndent) {
            const sub = renderItems(items[j].indent, j)
            nested = sub.el
            j += sub.consumed
          }
          listItems.push(
            <li key={i} className="font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-[0.55em] ${
                  parentIndent === 0 ? 'w-1.5 h-1.5 rounded-full bg-sage'
                  : parentIndent === 1 ? 'w-1.5 h-1.5 rounded-sm border border-sage/60'
                  : 'w-1 h-1 rounded-full bg-sage/40'
                }`} />
                <span>{item.text}</span>
              </div>
              {nested}
            </li>
          )
          i = j
        } else {
          i++
        }
      }
      return {
        el: <ul className="my-1 space-y-1 ml-0">{listItems}</ul>,
        consumed: i - startIdx,
      }
    }
    return <div className="my-3 ml-1">{renderItems(0, 0).el}</div>
  }
  if (block.type === 'ordered_list') {
    const items = block.content.split('\n').filter(Boolean)
    return (
      <ol className="my-3 ml-1 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed">
            <span className="w-5 shrink-0 font-mono text-xs text-sage/80 mt-[0.4em] text-right select-none">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
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

/**
 * Contenteditable text block supporting paragraph, heading, and quote types.
 * Handles cross-block keyboard navigation, markdown shortcuts, paste
 * normalisation, and Shift+Click cross-block selection extension.
 */
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
  /** The block data to render and edit. */
  block: Block
  /** Whether this block currently holds the logical focus. */
  focused: boolean
  /** Where to place the cursor when focus is set: `"start"`, `"end"`, or a character offset. */
  focusEdge: 'start' | 'end' | number | null
  /** Called when the user clicks or tabs into this block. */
  onFocus: () => void
  /** Called with the updated text content on every input event. */
  onChange: (content: string) => void
  /** Called when a markdown prefix shortcut changes the block type. */
  onTypeChange: (type: BlockType) => void
  /** Called when the user presses Enter (non-shift) to split the block. */
  onEnter: () => void
  /** Called when Backspace is pressed on an empty block to delete it. */
  onBackspaceEmpty: () => void
  /** Called when Backspace is pressed at offset 0 to merge with the previous block. */
  onBackspaceMerge: () => void
  /** Called when ArrowUp should move focus to the previous block. */
  onArrowUp: () => void
  /** Called when ArrowDown should move focus to the next block. */
  onArrowDown: () => void
  /** Called with the current cursor character offset on key/select events. */
  onCursorChange?: (pos: number) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  /**
   * Reads the current selection's start offset as a plain-text character
   * index within the contenteditable element (ignoring HTML structure).
   */
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

  /**
   * Moves the browser caret to the given plain-text character offset by
   * walking the DOM tree of the contenteditable element.
   *
   * @param pos - Target character offset (clamped to `[0, textLength]`).
   */
  const setCursorPos = useCallback((pos: number) => {
    const el = divRef.current
    if (!el) return
    const clamped = Math.min(Math.max(0, pos), (el.textContent || '').length)
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    let rem = clamped
    let placed = false
    /** Traverses DOM text nodes, subtracting their lengths from `rem` until the
     *  target position is reached, then sets the range start on that text node. */
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

  // Sync DOM when block content changes externally (type change, undo, merge).
  // We rely on the content equality check rather than activeElement: if the user
  // just typed the character, el.textContent already matches block.content and
  // no DOM write occurs (cursor is preserved). On undo, they differ and we sync.
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    if ((el.textContent ?? '') !== block.content) {
      const pos = document.activeElement === el ? getCursorPos() : null
      el.textContent = block.content
      if (pos !== null) setCursorPos(Math.min(pos, block.content.length))
    }
  }, [block.content, block.type, getCursorPos, setCursorPos])

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

  /**
   * Fires on every `input` event (excluding IME composition).
   * Checks for markdown prefix shortcuts at the start of the line and
   * converts the block type if one is detected; otherwise propagates
   * the raw text content to `onChange`.
   */
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

  /**
   * Handles keyboard events for navigation and structural editing:
   * Enter → split, Backspace → delete/merge, ArrowUp/Down → cross-block nav.
   */
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
        // If focus left the element or the cursor didn't move, we've hit the top edge
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
        // If focus left the element or the cursor didn't advance, we've hit the bottom edge
        if (document.activeElement !== el) return
        const newPos = getCursorPos()
        if (newPos === (el.textContent || '').length || newPos === savedPos) { onCursorChange?.(savedPos); onArrowDown() }
      })
    }
  }

  /**
   * Strips HTML from clipboard data and inserts plain text at the caret,
   * preserving the existing selection behaviour.
   */
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

  /**
   * Extends an existing cross-block selection when Shift+Click lands on a
   * different block than the selection anchor. Falls through to the browser
   * for same-block shift-clicks.
   */
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

/**
 * Wrapper for structured blocks that require a source editor.
 * In preview mode, renders the block via {@link BlockPreview} with
 * hover/keyboard action buttons. In edit mode, shows a split-pane with
 * a textarea source editor and a live-rendered preview below.
 */
function RichBlock({
  block,
  onUpdate,
  onDelete,
  autoEdit = false,
  selected = false,
  onArrowUp,
  onArrowDown,
}: {
  /** The block data to render. */
  block: Block
  /** Called with partial updates when the user commits an edit. */
  onUpdate: (updates: Partial<Block>) => void
  /** Called when the user clicks the Delete button. */
  onDelete: () => void
  /** When `true`, enters edit mode immediately on mount (used after toolbar insertion). */
  autoEdit?: boolean
  /** When `true`, the block renders its keyboard-focus ring. */
  selected?: boolean
  /** Called when ArrowUp should move focus to the previous block. */
  onArrowUp?: () => void
  /** Called when ArrowDown should move focus to the next block. */
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

  /** Opens edit mode, copying block content/meta into local draft state. */
  const openEdit = () => {
    setDraft(block.content)
    setDraftMeta(block.meta ?? {})
    setEditing(true)
  }

  /** Saves draft changes back to the block and exits edit mode. */
  const commit = () => {
    onUpdate({ content: draft, meta: draftMeta })
    setEditing(false)
  }

  /** Discards draft changes and exits edit mode, restoring original block data. */
  const cancel = () => {
    setDraft(block.content)
    setDraftMeta(block.meta ?? {})
    setEditing(false)
  }

  /** Updates a single meta field in the draft without affecting `draft` content. */
  const updateMeta = (key: string, value: unknown) =>
    setDraftMeta(prev => ({ ...prev, [key]: value }))

  // Escape to close
  /** Commits the draft on Escape or Shift+Enter, preventing bubbling to the block editor. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); commit() }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); commit() }
  }

  const hint =
    block.type === 'latex' ? 'KaTeX · e.g. \\frac{a}{b}'
    : block.type === 'code' ? 'Source code'
    : block.type === 'chemistry' ? 'KaTeX chem · e.g. \\text{H}_2\\text{O}'
    : block.type === 'table' ? 'CSV · first row = headers'
    : block.type === 'diagram' ? 'Mermaid · e.g. graph TD; A-->B'
    : block.type === 'bullet_list' || block.type === 'ordered_list' ? 'One item per line'
    : 'Callout text'

  const sourceRows = block.type === 'code' ? 6 : block.type === 'table' ? 4 : block.type === 'diagram' ? 5 : (block.type === 'bullet_list' || block.type === 'ordered_list') ? 4 : 3

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
          {(block.type === 'chemistry' || block.type === 'table' || block.type === 'diagram') && (
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
              // Insert a literal tab character at the cursor instead of shifting focus
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
/**
 * Wraps {@link BlockPreview} in a try/catch so a rendering error in the
 * live-preview pane doesn't crash the entire editor.
 */
function LivePreview({ block }: { block: Block }) {
  try {
    return <BlockPreview block={block} />
  } catch {
    return <span className="font-mono text-[11px] text-sienna/60">Rendering error</span>
  }
}

// ─── Bullet list block — interactive, indentable ─────────────────────────────

/** An individual item in an interactive bullet list. */
type BulletItem = { id: string; text: string; indent: number }

/**
 * Parses a block into an array of {@link BulletItem} objects.
 * Prefers structured items stored in `block.meta.items`; falls back to
 * parsing the legacy newline-separated `block.content` string.
 *
 * @param block - The bullet_list block to parse.
 */
function parseBulletItems(block: Block): BulletItem[] {
  const raw = block.meta?.items as BulletItem[] | undefined
  if (Array.isArray(raw) && raw.length > 0) return raw
  const lines = block.content.split('\n').filter(l => l.trim() !== '')
  if (!lines.length) return [{ id: crypto.randomUUID(), text: '', indent: 0 }]
  return lines.map(line => {
    const spaces = line.match(/^( +)/)?.[1]?.length ?? 0
    return { id: crypto.randomUUID(), text: line.trimStart(), indent: Math.floor(spaces / 2) }
  })
}

/**
 * Serialises a list of {@link BulletItem} objects back into a newline-separated
 * string using leading spaces to encode indent level (2 spaces per level).
 *
 * @param items - Structured bullet items to serialise.
 */
function serializeBulletContent(items: BulletItem[]): string {
  return items.map(item => '  '.repeat(item.indent) + item.text).join('\n')
}

/**
 * A single row in an interactive bullet list.
 * Uses `forwardRef` so the parent {@link BulletListBlock} can focus
 * specific rows programmatically via a `Map` of refs.
 */
const BulletItemRow = forwardRef<
  HTMLDivElement,
  {
    /** The bullet item data for this row. */
    item: BulletItem
    /** Called when the user types to update the item's text. */
    onTextChange: (text: string) => void
    /** Called when Enter is pressed to insert a sibling item below. */
    onEnter: () => void
    /** Called with `+1` or `-1` when Tab/Shift+Tab changes indent level. */
    onIndent: (delta: number) => void
    /** Called when Backspace is pressed on an empty item to remove it. */
    onRemove: () => void
    /** Called when ArrowUp at the first visual line should move to the previous item/block. */
    onArrowUp: () => void
    /** Called when ArrowDown at the last visual line should move to the next item/block. */
    onArrowDown: () => void
  }
>(function BulletItemRow({ item, onTextChange, onEnter, onIndent, onRemove, onArrowUp, onArrowDown }, ref) {
  const innerRef = useRef<HTMLDivElement>(null)

  // Merge forwarded ref with local ref
  /** Assigns the DOM element to both the local `innerRef` and the forwarded parent `ref`. */
  const setRef = (el: HTMLDivElement | null) => {
    (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Sync DOM only when text changes externally (undo, indent, etc.)
  useEffect(() => {
    // Skip when this element is focused — the user is actively typing, don't overwrite
    const el = innerRef.current
    if (!el || el === document.activeElement) return
    if ((el.textContent ?? '') !== item.text) el.textContent = item.text
  }, [item.text])

  // Initial DOM content
  useEffect(() => {
    // Seed the contenteditable with the item's text on first mount
    const el = innerRef.current
    if (el && el.textContent !== item.text) el.textContent = item.text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bulletClass =
    item.indent === 0 ? 'w-1.5 h-1.5 rounded-full bg-sage mt-[0.55em] shrink-0'
    : item.indent === 1 ? 'w-1.5 h-1.5 rounded-sm border border-sage/60 mt-[0.55em] shrink-0'
    : 'w-1 h-1 rounded-full bg-sage/40 mt-[0.6em] shrink-0'

  return (
    <div className="flex items-start gap-2.5 py-[2px]" style={{ paddingLeft: `${item.indent * 20}px` }}>
      <span className={bulletClass} />
      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 font-[family-name:var(--font-body)] text-base text-forest/85 leading-relaxed outline-none bg-transparent caret-forest cursor-text"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.4em' }}
        onInput={e => onTextChange((e.currentTarget.textContent ?? ''))}
        onKeyDown={e => {
          const text = e.currentTarget.textContent ?? ''
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter(); return }
          if (e.key === 'Tab') { e.preventDefault(); onIndent(e.shiftKey ? -1 : 1); return }
          if (e.key === 'Backspace' && text === '') { e.preventDefault(); if (item.indent > 0) { onIndent(-1) } else { onRemove() } return }
          if (e.key === 'ArrowUp') {
            // Navigate to the previous item/block when caret is on the first visual line
            const sel = window.getSelection()
            if (sel?.rangeCount) {
              const r = sel.getRangeAt(0)
              const er = e.currentTarget.getBoundingClientRect()
              const cr = r.getBoundingClientRect()
              if (cr.top - er.top < 4) { e.preventDefault(); onArrowUp(); return }
            }
          }
          if (e.key === 'ArrowDown') {
            // Navigate to the next item/block when caret is on the last visual line
            const sel = window.getSelection()
            if (sel?.rangeCount) {
              const r = sel.getRangeAt(0)
              const er = e.currentTarget.getBoundingClientRect()
              const cr = r.getBoundingClientRect()
              if (er.bottom - cr.bottom < 4) { e.preventDefault(); onArrowDown(); return }
            }
          }
        }}
        onPaste={e => {
          // Strip HTML from pasted content and insert plain text only
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
      />
    </div>
  )
})

/**
 * Interactive bullet-list block that manages its own array of {@link BulletItem}s.
 * Supports Tab/Shift+Tab indenting, Enter to add items, Backspace to remove,
 * and ArrowUp/Down to move between items or escape to adjacent blocks.
 */
function BulletListBlock({
  block,
  selected,
  onFocus,
  onUpdate,
  onDelete,
  onArrowUp,
  onArrowDown,
}: {
  /** The block data (type must be `"bullet_list"`). */
  block: Block
  /** Whether this block has keyboard focus in the parent editor. */
  selected?: boolean
  /** Called when any item in the list receives focus. */
  onFocus?: () => void
  /** Called with partial block updates (content + meta) when items change. */
  onUpdate: (updates: Partial<Block>) => void
  /** Called when the list should be removed from the document. */
  onDelete: () => void
  /** Called when ArrowUp on the first item should escape to the previous block. */
  onArrowUp?: () => void
  /** Called when ArrowDown on the last item should escape to the next block. */
  onArrowDown?: () => void
}) {
  const [items, setItems] = useState<BulletItem[]>(() => parseBulletItems(block))
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const lastCommittedRef = useRef<string>('')
  const prevSelectedRef = useRef<boolean | undefined>(false)

  // Sync from external changes (undo, etc.) — skip our own writes
  useEffect(() => {
    // Bail early when the change originated here (lastCommittedRef fingerprint matches)
    const ext = JSON.stringify(block.meta?.items ?? block.content)
    if (ext === lastCommittedRef.current) return
    const parsed = parseBulletItems(block)
    lastCommittedRef.current = JSON.stringify(block.meta?.items ?? block.content)
    setItems(parsed)
  }, [block.meta, block.content])

  // When block becomes selected via keyboard nav, focus appropriate item
  useEffect(() => {
    // Only act on the rising edge of `selected` to avoid re-focusing on every re-render
    if (selected && !prevSelectedRef.current) {
      const first = items[0]
      if (first) focusItemId(first.id, 'start')
    }
    prevSelectedRef.current = selected
  }, [selected, items])

  /**
   * Focuses a bullet item row by ID and positions the caret at the
   * specified edge. Uses `requestAnimationFrame` so the DOM is ready.
   *
   * @param id   - The `BulletItem.id` to focus.
   * @param edge - `"start"` places the caret at offset 0; `"end"` at the end.
   */
  const focusItemId = (id: string, edge: 'start' | 'end' = 'end') => {
    requestAnimationFrame(() => {
      // Defer until React has committed the DOM so the element definitely exists
      const el = rowRefs.current.get(id)
      if (!el) return
      el.focus()
      const len = (el.textContent || '').length
      const offset = edge === 'start' ? 0 : len
      const sel = window.getSelection()
      if (!sel) return
      const range = document.createRange()
      const textNode = el.firstChild
      if (textNode?.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, Math.min(offset, (textNode as Text).length))
      } else {
        range.setStart(el, 0)
      }
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    })
  }

  /**
   * Persists the updated item array to the parent block, serialising
   * to both `meta.items` (structured) and `content` (plain-text fallback).
   *
   * @param newItems - The new array of bullet items after a user action.
   */
  const commit = (newItems: BulletItem[]) => {
    lastCommittedRef.current = JSON.stringify(newItems)
    setItems(newItems)
    onUpdate({
      meta: { ...(block.meta ?? {}), items: newItems },
      content: serializeBulletContent(newItems),
    })
  }

  return (
    <div
      className="my-2"
      onFocus={onFocus}
    >
      {items.map((item, idx) => (
        <BulletItemRow
          key={item.id}
          ref={el => {
            // Register or deregister the row's DOM node so focusItemId can reach it
            if (el) rowRefs.current.set(item.id, el)
            else rowRefs.current.delete(item.id)
          }}
          item={item}
          onTextChange={text => {
            // Update only this item's text while preserving all other items unchanged
            const next = items.map((it, i) => i === idx ? { ...it, text } : it)
            commit(next)
          }}
          onEnter={() => {
            // Insert a sibling item at the same indent level immediately below this one
            const newItem: BulletItem = { id: crypto.randomUUID(), text: '', indent: item.indent }
            const next = [...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)]
            commit(next)
            focusItemId(newItem.id, 'start')
          }}
          onIndent={delta => {
            // Clamp new indent to [0, 6], then re-focus the same item after the commit
            const newIndent = Math.max(0, Math.min(6, item.indent + delta))
            const next = items.map((it, i) => i === idx ? { ...it, indent: newIndent } : it)
            commit(next)
            focusItemId(item.id, 'end')
          }}
          onRemove={() => {
            // Delete the whole list when this is the last item; otherwise remove just this row
            if (items.length <= 1) { onDelete(); return }
            const next = items.filter((_, i) => i !== idx)
            commit(next)
            const targetId = idx > 0 ? items[idx - 1].id : items[1].id
            focusItemId(targetId, 'end')
          }}
          onArrowUp={() => {
            // Move to the previous list item, or escape upward to the block above this list
            if (idx > 0) focusItemId(items[idx - 1].id, 'end')
            else onArrowUp?.()
          }}
          onArrowDown={() => {
            // Move to the next list item, or escape downward to the block below this list
            if (idx < items.length - 1) focusItemId(items[idx + 1].id, 'start')
            else onArrowDown?.()
          }}
        />
      ))}
    </div>
  )
}

// ─── Divider block ────────────────────────────────────────────────────────────

/**
 * Simple horizontal rule block with keyboard-delete support and a hover/focus
 * action button that matches the style of {@link RichBlock}.
 */
function DividerBlock({ onDelete, selected = false, onArrowUp, onArrowDown }: {
  /** Called when the divider should be removed from the document. */
  onDelete: () => void
  /** Whether the block has keyboard focus (shows the delete button). */
  selected?: boolean
  /** Called when ArrowUp should move focus to the previous block. */
  onArrowUp?: () => void
  /** Called when ArrowDown should move focus to the next block. */
  onArrowDown?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Grab DOM focus when keyboard-selected so onKeyDown events reach this element
  useEffect(() => { if (selected) ref.current?.focus() }, [selected])
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="relative my-2 group cursor-pointer outline-none"
      onKeyDown={e => {
        // Arrow keys navigate between blocks; Delete/Backspace removes the divider
        if (e.key === 'ArrowUp' && !e.shiftKey)   { e.preventDefault(); onArrowUp?.() }
        if (e.key === 'ArrowDown' && !e.shiftKey) { e.preventDefault(); onArrowDown?.() }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); onDelete() }
      }}
    >
      <hr className={`border-0 border-t transition-colors ${selected ? 'border-sage/50' : 'border-forest/[0.1] group-hover:border-forest/20'}`} />
      {/* Action button — matches RichBlock style */}
      <div className={`absolute -bottom-[26px] left-1/2 -translate-x-1/2 flex items-center gap-px bg-forest/80 backdrop-blur-sm squircle-sm shadow-sm z-10 overflow-hidden transition-opacity duration-150 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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

// ─── Main BlockEditor ─────────────────────────────────────────────────────────

/**
 * Root block editor component.
 *
 * Renders an ordered list of blocks, delegating to {@link TextBlock},
 * {@link RichBlock}, {@link BulletListBlock}, or {@link DividerBlock} based
 * on `block.type`. Manages focus tracking, cursor position, cross-block
 * selection, and exposes an imperative handle for toolbar integration.
 *
 * When `readOnly` is `true`, all blocks are rendered via {@link BlockPreview}
 * with no interactive elements.
 *
 * @param blocks          - The ordered array of blocks to render.
 * @param onChange        - Called with the updated block array after any mutation.
 * @param readOnly        - Disables all editing interactions when `true`.
 * @param onFocusChange   - Called with the focused block's type when it changes
 *                          (only for text-type blocks; `null` otherwise).
 */
export const BlockEditor = forwardRef<
  BlockEditorHandle,
  { blocks: Block[]; onChange: (blocks: Block[]) => void; readOnly?: boolean; onFocusChange?: (type: BlockType | null) => void }
>(function BlockEditor({ blocks, onChange, readOnly = false, onFocusChange }, ref) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusEdge, setFocusEdge] = useState<'start' | 'end' | number | null>('end')
  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const cursorPosRef = useRef<number>(0)

  /**
   * Sets the logically focused block ID and cursor-placement hint.
   *
   * @param id   - Block ID to focus, or `null` to clear focus.
   * @param edge - Where to place the cursor: `"start"`, `"end"`, or a character offset.
   */
  const focusBlock = useCallback((id: string | null, edge: 'start' | 'end' | number | null = 'end') => {
    setFocusEdge(edge)
    setFocusedId(id)
  }, [])

  // Notify parent of the focused block's type so the toolbar can reflect it
  useEffect(() => {
    // Resolve text-type vs non-text-type and report to the parent toolbar callback
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
        } else if (BULLET_TYPES.includes(type)) {
          setTimeout(() => setFocusedId(nb.id), 0)
        } else if (RICH_TYPES.includes(type)) {
          setTimeout(() => setAutoEditId(nb.id), 0)
        }
        return
      }

      const next = [...blocks.slice(0, insertAt), nb, ...blocks.slice(insertAt)]
      onChange(next)
      if (TEXT_TYPES.includes(type)) {
        setTimeout(() => focusBlock(nb.id, 'end'), 0)
      } else if (BULLET_TYPES.includes(type)) {
        // BulletListBlock manages its own focus; just set focusedId
        setTimeout(() => setFocusedId(nb.id), 0)
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

  /**
   * Applies partial updates to a block by ID, merging them into the existing block data.
   *
   * @param id      - ID of the block to update.
   * @param updates - Partial block fields to merge.
   */
  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }, [blocks, onChange])

  /**
   * Removes a block by ID. If it would leave the document empty, replaces it
   * with a fresh paragraph and focuses it.
   *
   * @param id - ID of the block to remove.
   */
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

  /**
   * Inserts a new paragraph block immediately after `afterId` and focuses it.
   *
   * @param afterId - ID of the block after which the new block is inserted.
   * @param type    - Type of the new block (defaults to `"paragraph"`).
   */
  const insertAfter = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    const idx = blocks.findIndex(b => b.id === afterId)
    const nb = newBlock(type)
    const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    onChange(next)
    setTimeout(() => focusBlock(nb.id, 'start'), 0)
  }, [blocks, focusBlock, onChange])

  /**
   * Splits a text block at the current cursor position (Enter key behaviour).
   * - Empty block → insert empty paragraph below and focus it.
   * - Cursor at start → insert empty paragraph *above* and focus the new line.
   * - Cursor mid-text → split into two blocks at the cursor.
   *
   * @param id - ID of the text block to split.
   */
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

    // Cursor at start: insert blank line before, move focus to the new blank line
    // (was: keep focus on current block — caused repeated Enter presses to stack
    // empty blocks above without the cursor appearing to move)
    if (cursor === 0) {
      const nb = newBlock('paragraph')
      const next = [...blocks.slice(0, idx), nb, ...blocks.slice(idx)]
      onChange(next)
      setTimeout(() => focusBlock(nb.id, 'end'), 0)
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

  /**
   * Merges a text block with the one above it (Backspace at offset 0).
   * If the previous block is also a text type, concatenates their content
   * and focuses the merge point. If the previous block is rich/divider,
   * keyboard-selects it instead.
   *
   * @param id - ID of the block whose content should be merged upward.
   */
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

  /**
   * Moves keyboard focus one block up or down.
   * Preserves the horizontal cursor column when navigating between text blocks.
   * Rich and divider blocks receive DOM focus via their own `useEffect`.
   *
   * @param direction - `"up"` or `"down"`.
   */
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

  /**
   * Handles clicks on the empty space below all blocks.
   * Focuses the last block if it is a text type; otherwise appends a new
   * paragraph and focuses it, so the editor always accepts cursor input.
   */
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

  /**
   * Inserts a new paragraph block at a specific index in the block array
   * (used by the click-zones between adjacent non-text blocks).
   *
   * @param idx - Array index at which to insert the new block.
   */
  const insertAt = useCallback((idx: number) => {
    const nb = newBlock('paragraph')
    const next = [...blocks.slice(0, idx), nb, ...blocks.slice(idx)]
    onChange(next)
    setTimeout(() => focusBlock(nb.id, 'start'), 0)
  }, [blocks, focusBlock, onChange])

  // ── Cross-block selection handler (capture phase) ─────────────────────────
  // Fires before individual block key handlers so we can intercept cross-block
  // actions: delete / type-to-replace / Shift+Arrow extension.
  /**
   * Capture-phase keydown handler for the editor root.
   * Intercepts two cross-block scenarios before inner block handlers see the event:
   * 1. Delete / character-key on a multi-block selection → collapses blocks and
   *    merges surrounding text.
   * 2. Shift+ArrowUp/Down → extends the selection focus end across block
   *    boundaries when the browser's default behaviour would fail or corrupt it.
   */
  const handleCrossBlockKeyDown = useCallback((e: React.KeyboardEvent) => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)

    /** Returns the nearest `[data-block-id]` ancestor element for a given DOM node. */
    const blockElOf = (node: Node | null): HTMLElement | null => {
      if (!node) return null
      const el = node instanceof Element ? node : node.parentElement
      return el?.closest('[data-block-id]') as HTMLElement | null
    }
    /** Finds the first text node inside a block element via a forward TreeWalker. */
    const getFirstText = (el: Element): Text | null => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      return w.nextNode() as Text | null
    }
    /** Finds the last text node inside a block element by exhausting a forward TreeWalker. */
    const getLastText = (el: Element): Text | null => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let last: Text | null = null; let n = w.nextNode()
      while (n) { last = n as Text; n = w.nextNode() }
      return last
    }
    /** Extends the selection focus to the very end of a block element. */
    const extendToEnd   = (el: Element) => { const lt = getLastText(el);  lt ? sel.extend(lt, lt.length) : sel.extend(el, el.childNodes.length) }
    /** Extends the selection focus to the very start of a block element. */
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
      // Check after the browser has moved the selection focus end within its own block
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

  if (readOnly) {
    return (
      <div>
        {blocks.map(b => <BlockPreview key={b.id} block={b} />)}
      </div>
    )
  }

  return (
    <div
      className="outline-none"
      onClick={e => { if (e.target === e.currentTarget) handleBottomClick() }}
      onKeyDownCapture={handleCrossBlockKeyDown}
      onMouseMove={e => {
        // Extend a cross-block drag-selection as the pointer moves over other block elements
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
        // Resolve the correct interactive component for this block's type
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
                // Also clear autoEditId so re-opening the block doesn't re-trigger auto-edit mode
                onDelete={() => { deleteBlock(block.id); setAutoEditId(null) }}
                onArrowUp={() => arrowNav('up')}
                onArrowDown={() => arrowNav('down')}
              />
            )
          }
          if (block.type === 'bullet_list') {
            return (
              <BulletListBlock
                block={block}
                selected={focusedId === block.id}
                onFocus={() => setFocusedId(block.id)}
                onUpdate={updates => updateBlock(block.id, updates)}
                onDelete={() => deleteBlock(block.id)}
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
