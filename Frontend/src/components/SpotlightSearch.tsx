/**
 * @file SpotlightSearch.tsx
 * Full-featured AI search and chat panel with two rendering modes:
 *  - **inline** — static, rendered as part of the page layout
 *  - **overlay** — a draggable/resizable floating panel (no backdrop blur)
 *
 * Communicates with three backend endpoints:
 *  - `/api/noot`    — general AI chat (returns markdown or structured actions)
 *  - `/api/prompt`  — knowledge-graph expansion
 *  - `/api/explain` — node-level explanation for graph nodes
 *
 * The AI can return special response types recognised by `parse*Response()`
 * helpers: `[GRAPH]` JSON for task graphs, `[WRITE_TO_EDITOR]` for inserting
 * blocks, `[NAVIGATE]` to route the user, `[CREATE_REPO]` to create a
 * nootbook, and `[MESSAGE]` for plain text.
 *
 * Also exports {@link SpotlightFAB} — a standalone ⌘K FAB that wraps the
 * overlay panel.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import GraphView, { type TaskItem, type ExpandFn, type QueryFn } from '../pages/GraphView'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rawGraphPrompt from '../../../gpt_prompts/gpt_prompt.txt?raw'
import rawSimplePrompt from '../../../gpt_prompts/gpt_prompt_simple.txt?raw'
import { useAuth } from '../hooks/useAuth'
import { useEditorBridge, type BlockSpec } from '../contexts/EditorBridgeContext'
import { supabase } from '../lib/supabase'
import { createDocument } from '../hooks/useMyRepos'

/** Metadata for a file the user has attached to the current prompt. */
interface AttachedFile {
  name: string
  size: number
  type: string
}

/* ------------------------------------------------------------------ */
/* SpotlightSearch                                                      */
/* Two modes:                                                           */
/*   inline  — rendered statically on the page (no backdrop)           */
/*   overlay — draggable / resizable floating panel, no blur overlay   */
/* ------------------------------------------------------------------ */

// ─── API CONFIG ─────────────────────────────────────────────────────────
/** Base URL for all backend API calls, derived from `VITE_API_URL` env var. */
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api/prompt').replace(/\/api\/prompt$/, '')
/** Endpoint for the main noot AI agent (chat, actions). */
const NOOT_API_URL = `${API_BASE}/api/noot`
/** Endpoint for knowledge-graph prompt expansion. */
const GRAPH_API_URL  = `${API_BASE}/api/prompt`
/** Endpoint for per-node explanation queries. */
const EXPLAIN_API_URL = `${API_BASE}/api/explain`

// ─── PARSE GRAPH RESPONSE ──────────────────────────────────────────────
/**
 * Removes duplicate task items from a parsed graph array, keying by `name`.
 *
 * @param parsed - Raw array of task items returned by the AI.
 * @returns De-duplicated array preserving first occurrence of each name.
 */
function dedupeItems(parsed: TaskItem[]): TaskItem[] {
  const seen = new Set<string>()
  return parsed.filter(it => {
    if (typeof it.name !== 'string' || seen.has(it.name)) return false
    seen.add(it.name)
    return true
  })
}

/**
 * Parses AI responses that use the text-format task schema instead of JSON.
 * Each item is expected to match: `name  text: "..."  depends_on: [...]`
 *
 * @param content - Raw text content from the AI response.
 * @returns Parsed items + summary string, or `null` if no items were found.
 */
function parseTextFormat(content: string): { items: TaskItem[]; summary: string } | null {
  const re = /^(.+?)\s+text:\s+"((?:[^"\\]|\\.)*)"\s+depends_on:\s+(\[[^\]]*\])/gm
  const items: TaskItem[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    try {
      const deps = JSON.parse(match[3]) as string[]
      items.push({ name: match[1].trim(), text: match[2], depends_on: deps })
    } catch { /* skip */ }
  }
  if (items.length === 0) return null
  const summaryLines: string[] = []
  content.split(/\n+/).forEach(line => {
    // Collect lines that aren't task-item definitions as the summary text
    const t = line.trim(); if (t && !re.test(t)) summaryLines.push(t)
  })
  return { items: dedupeItems(items), summary: summaryLines.join(' ').trim() }
}

/**
 * Normalises the raw body of a response before JSON parsing.
 * Strips leading metadata tags like `[GRAPH_RESPONSE]` and extracts
 * the JSON array from `{…}` or `[{…}]` wrapped strings.
 *
 * @param raw - Raw string to normalise.
 * @returns `body` — the JSON-like portion; `suffix` — any trailing text.
 */
function normaliseContent(raw: string): { body: string; suffix: string } {
  const stripped = raw.replace(/^\s*\[[A-Z_a-z\s]+\]\s*/g, '').trim()
  if (stripped.startsWith('{')) {
    const lastBrace = stripped.lastIndexOf('}')
    if (lastBrace !== -1) {
      return { body: '[' + stripped.slice(0, lastBrace + 1) + ']', suffix: stripped.slice(lastBrace + 1).trim() }
    }
  }
  return { body: stripped, suffix: '' }
}

/**
 * Attempts to parse a `[GRAPH]` AI response into a task-graph structure.
 * Tries JSON parsing first (with LaTeX-backslash fixing); falls back to
 * the text-format parser if JSON fails.
 *
 * @param content - Full AI response string, potentially prefixed with `[GRAPH]`.
 * @returns Task items + summary string, or `null` if parsing fails.
 */
function parseGraphResponse(content: string): { items: TaskItem[]; summary: string } | null {
  // Strip optional [GRAPH] marker before parsing
  const stripped = content.replace(/^\s*\[GRAPH\]\s*/i, '')
  const { body, suffix } = normaliseContent(stripped)
  try {
    const rawStart = body.indexOf('[')
    if (rawStart !== -1) {
      const afterBracket = body.slice(rawStart + 1).trimStart()
      const start = afterBracket.startsWith('{') ? rawStart : body.indexOf('[{')
      const end = body.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end >= start) {
        const jsonStr = body.slice(start, end + 1).replace(/\/\/[^\n\r]*/g, '')
        const parsed = JSON.parse(fixLatexJson(jsonStr))
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].name === 'string' && typeof parsed[0].text === 'string') {
          const items = dedupeItems(parsed as TaskItem[])
          if (items.length > 0) return { items, summary: (suffix || body.slice(end + 1)).trim() }
        }
      }
    }
  } catch { /* fall through */ }
  return parseTextFormat(stripped)
}

/** Normalize backslashes in a raw JSON string so JSON.parse succeeds.
 *
 *  Strategy — process each \X or \\X pair in one pass (left-to-right):
 *   • \\X  (already-escaped backslash pair)  → leave alone → parses as \X ✓
 *   • \n \r \t \u \\ \"  \/  (standard JSON escapes) → leave alone ✓
 *   • \X  for any other X  (bare LaTeX: \frac \leq \delta …) → double to \\X ✓
 *
 *  \f and \b are technically valid JSON escapes but collide with \frac / \begin
 *  etc. Note content never contains literal form-feed (0x0C) or backspace (0x08)
 *  so we treat them as bare LaTeX backslashes and double them. */
function fixLatexJson(str: string): string {
  return str.replace(/\\(\\|["\\/nrtu]|.)/g, (_m, c: string) =>
    (c === '\\' || '"\\/nrtu'.includes(c)) ? _m : '\\\\' + c
  )
}

/**
 * Parses a `[WRITE_TO_EDITOR]` AI response into a list of block specs
 * and a human-readable confirmation message.
 * Also normalises informal list type names (e.g. `"ul"` → `"bullet_list"`).
 *
 * @param content - Full AI response string.
 * @returns Block specs + confirmation, or `null` if the marker is absent.
 */
function parseWriteResponse(content: string): { blocks: BlockSpec[]; confirmation: string } | null {
  if (!/^\s*\[WRITE_TO_EDITOR\]/i.test(content)) return null
  try {
    const body = content.replace(/^\s*\[WRITE_TO_EDITOR\]\s*/i, '')
    const rawStart = body.indexOf('[')
    if (rawStart === -1) return null
    const afterBracket = body.slice(rawStart + 1).trimStart()
    const start = afterBracket.startsWith('{') ? rawStart : body.indexOf('[{')
    const end = body.lastIndexOf(']')
    if (start === -1 || end === -1 || end <= start) return null
    const parsed = JSON.parse(fixLatexJson(body.slice(start, end + 1)))
    if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0].type !== 'string') return null
    const TYPE_MAP: Record<string, string> = {
      ul: 'bullet_list', ol: 'ordered_list', steps: 'ordered_list',
      list: 'bullet_list', numbered_list: 'ordered_list',
    }
    // Normalise informal list aliases (e.g. "ul", "steps") to canonical BlockSpec type names
    const blocks = parsed.map((b: BlockSpec) => ({ ...b, type: (TYPE_MAP[b.type] ?? b.type) as BlockSpec['type'] }))
    const confirmation = body.slice(end + 1).trim() || `Wrote ${blocks.length} block(s) to your notes.`
    return { blocks, confirmation }
  } catch {
    return null
  }
}

/**
 * Parses a `[NAVIGATE]` AI response into a route path and display message.
 * The route may contain a `__SEARCH:title__` placeholder that the caller
 * resolves against the user's documents.
 *
 * @param content - Full AI response string.
 * @returns Route + message, or `null` if the marker is absent.
 */
function parseNavigateResponse(content: string): { route: string; message: string } | null {
  if (!/^\s*\[NAVIGATE\]/i.test(content)) return null
  try {
    const body = content.replace(/^\s*\[NAVIGATE\]\s*/i, '')
    const parsed = JSON.parse(fixLatexJson(body.trim()))
    if (typeof parsed.route !== 'string') return null
    return { route: parsed.route, message: parsed.message || 'Navigating…' }
  } catch {
    return null
  }
}

/**
 * Parses a `[CREATE_REPO]` AI response into nootbook creation parameters.
 *
 * @param content - Full AI response string.
 * @returns Creation params + confirmation message, or `null` if marker is absent.
 */
function parseCreateRepoResponse(content: string): {
  title: string; description?: string; visibility?: string
  tags?: string[]; initial_blocks?: BlockSpec[]; message: string
} | null {
  if (!/^\s*\[CREATE_REPO\]/i.test(content)) return null
  try {
    const body = content.replace(/^\s*\[CREATE_REPO\]\s*/i, '')
    const parsed = JSON.parse(fixLatexJson(body.trim()))
    if (typeof parsed.title !== 'string') return null
    return {
      title: parsed.title,
      description: parsed.description,
      visibility: parsed.visibility || 'private',
      tags: parsed.tags || [],
      initial_blocks: parsed.initial_blocks,
      message: parsed.message || `Created "${parsed.title}"!`,
    }
  } catch {
    return null
  }
}

/**
 * Parses a `[MESSAGE]` AI response into a plain text message object.
 *
 * @param content - Full AI response string.
 * @returns `{ message }` or `null` if the marker is absent or JSON is invalid.
 */
function parseMessageResponse(content: string): { message: string } | null {
  if (!/^\s*\[MESSAGE\]/i.test(content)) return null
  try {
    const body = content.replace(/^\s*\[MESSAGE\]\s*/i, '')
    const parsed = JSON.parse(fixLatexJson(body.trim()))
    if (typeof parsed.message !== 'string') return null
    return { message: parsed.message }
  } catch { return null }
}

/**
 * Escapes special HTML characters for safe insertion into a generated HTML string.
 *
 * @param str - Raw string that may contain `&`, `<`, `>`, `"`, or `'`.
 * @returns HTML-escaped string.
 */
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Opens a new browser tab containing a print-ready HTML document of the
 * conversation and triggers the browser's print dialog after a short delay.
 * The document uses the Nootes Botanical colour palette and Gamja Flower font.
 *
 * @param messages - The full chat message array to export.
 */
function exportToPDF(messages: ChatMessage[]) {
  const userMessages = messages.filter(m => m.role === 'user')
  const mainPrompt = userMessages[0]?.content ?? 'Noot Conversation'
  const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  let bodyHtml = ''
  let graphIndex = 0

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role === 'user') {
      bodyHtml += `<div class="followup-prompt"><span class="label">follow-up</span>${escHtml(msg.content)}</div>`
      continue
    }
    if (msg.graphData) {
      graphIndex++
      bodyHtml += `<section class="graph-section">`
      bodyHtml += `<h2 class="section-title">Tasks · group ${graphIndex}</h2><ul class="task-list">`
      msg.graphData.items.forEach(item => {
        // Render each task as an HTML list item with its name and descriptive text
        bodyHtml += `<li class="task-item"><div class="task-name">${escHtml(item.name)}</div><div class="task-text">${escHtml(item.text)}</div></li>`
      })
      bodyHtml += `</ul>`
      if (msg.graphData.summary) bodyHtml += `<div class="summary-block"><span class="label">summary</span>${escHtml(msg.graphData.summary)}</div>`
      bodyHtml += `</section>`
    } else {
      bodyHtml += `<div class="text-response">${escHtml(msg.content)}</div>`
    }
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${escHtml(mainPrompt)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Gamja+Flower&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#E9E4D4;color:#1A1A18;font-family:'JetBrains Mono',monospace;font-size:11pt;line-height:1.7;padding:48pt 56pt;max-width:760pt;margin:0 auto}
.cover{border-bottom:3px solid #264635;padding-bottom:28pt;margin-bottom:36pt}
.brand{font-size:8pt;text-transform:uppercase;letter-spacing:.18em;color:#A3B18A;margin-bottom:14pt;display:flex;align-items:center;gap:8pt}
.brand::before{content:'';display:inline-block;width:8pt;height:8pt;background:#264635;clip-path:polygon(50% 0%,100% 100%,0% 100%)}
.main-title{font-family:'Gamja Flower',cursive;font-size:30pt;color:#264635;line-height:1.25;margin-bottom:10pt}
.meta{font-size:8pt;color:#A3B18A;letter-spacing:.08em}
.graph-section{margin-bottom:36pt;padding-bottom:28pt;border-bottom:1px solid rgba(38,70,53,.15)}
.graph-section:last-child{border-bottom:none}
.section-title{font-family:'Gamja Flower',cursive;font-size:16pt;color:#264635;margin-bottom:14pt;display:flex;align-items:center;gap:8pt}
.section-title::before{content:'';display:inline-block;width:10pt;height:10pt;border:1.5pt solid #A3B18A;border-radius:50%;flex-shrink:0}
.task-list{list-style:none;display:flex;flex-direction:column;gap:10pt;margin-bottom:18pt}
.task-item{padding:10pt 14pt;border-left:3pt solid #264635;background:rgba(255,255,255,.55)}
.task-name{font-family:'Gamja Flower',cursive;font-size:13pt;color:#264635;margin-bottom:3pt}
.task-text{font-size:9.5pt;color:#3A3A38;line-height:1.65}
.summary-block{background:rgba(163,177,138,.15);border-left:3pt solid #A3B18A;padding:10pt 14pt;font-size:9.5pt;color:#1A1A18;line-height:1.7}
.followup-prompt{margin:24pt 0 12pt;padding:8pt 14pt;background:#264635;color:#E9E4D4;font-size:9.5pt;line-height:1.6}
.text-response{margin-bottom:24pt;padding:12pt 14pt;border:1.5pt solid rgba(38,70,53,.2);font-size:9.5pt;line-height:1.7;white-space:pre-wrap}
.label{display:inline-block;font-size:7pt;text-transform:uppercase;letter-spacing:.15em;color:#A3B18A;border:1pt solid #A3B18A;padding:1pt 5pt;margin-right:8pt;vertical-align:middle}
@media print{body{background:#E9E4D4;padding:0}.graph-section{page-break-inside:avoid}.task-item{page-break-inside:avoid}}
</style></head><body>
<div class="cover"><div class="brand">nootes · noot ai companion</div><h1 class="main-title">${escHtml(mainPrompt)}</h1><div class="meta">generated ${generatedAt}</div></div>
${bodyHtml}</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  // Trigger the browser's print dialog after styles and fonts have had time to load
  win.onload = () => setTimeout(() => win.print(), 600)
  win.document.close()
}

/**
 * Copies the full conversation as a structured plain-text string to the clipboard.
 * Different message types (graph, navigate, write, plain) are serialised into
 * readable ASCII blocks.
 *
 * @param messages - The full chat message array to copy.
 * @returns `true` if the clipboard write succeeded, `false` otherwise.
 */
async function copyAsText(messages: ChatMessage[]): Promise<boolean> {
  const lines: string[] = ['═══ Noot Conversation ═══', `Generated: ${new Date().toLocaleString()}`, '']
  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`▸ You: ${msg.content}`, '')
    } else if (msg.graphData) {
      lines.push('▸ Noot [Graph]:')
      msg.graphData.items.forEach((item, i) => {
        // Serialize each task as a numbered entry with its name, description, and deps
        lines.push(`  ${i + 1}. ${item.name}`)
        lines.push(`     ${item.text}`)
        if (item.depends_on?.length) lines.push(`     → ${item.depends_on.join(', ')}`)
      })
      if (msg.graphData.summary) lines.push('', `  Summary: ${msg.graphData.summary}`)
      lines.push('')
    } else if (msg.navigateData) {
      lines.push(`▸ Noot [Navigate]: ${msg.navigateData.message}`, '')
    } else if (msg.createRepoData) {
      lines.push(`▸ Noot [Create Nootbook]: ${msg.createRepoData.message}`, '')
    } else if (msg.writeData) {
      lines.push('▸ Noot [Written to Editor]:')
      msg.writeData.blocks.forEach((b, i) => {
        // List each written block with its type and truncated content preview
        lines.push(`  ${i + 1}. [${b.type}] ${b.content}`)
      })
      lines.push('', `  ${msg.writeData.confirmation}`, '')
    } else {
      lines.push(`▸ Noot: ${msg.content}`, '')
    }
  }
  try { await navigator.clipboard.writeText(lines.join('\n')); return true } catch { return false }
}

/** A single turn in the spotlight chat history. */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Present when the AI returned a `[GRAPH]` knowledge-graph response. */
  graphData?: { items: TaskItem[]; summary: string } | null
  /** Present when the AI returned a `[WRITE_TO_EDITOR]` block-insertion response. */
  writeData?: { blocks: BlockSpec[]; confirmation: string } | null
  /** Present when the AI returned a `[NAVIGATE]` routing response. */
  navigateData?: { route: string; message: string } | null
  /** Present when the AI returned a `[CREATE_REPO]` nootbook creation response. */
  createRepoData?: { title: string; message: string; repoId?: string } | null
}

/** Preset prompt suggestions shown when the chat is empty. */
const SUGGESTIONS = [
  'Explain the chain rule',
  'Plan a study schedule for finals',
  'Break down how to build a todo app',
  "What is Bayes' theorem?",
]

/** Props for the {@link SpotlightSearch} component. */
interface SpotlightSearchProps {
  /** Rendering mode: `"inline"` embeds in the page; `"overlay"` floats. */
  mode: 'inline' | 'overlay'
  /** Whether the overlay is currently visible (overlay mode only). */
  open?: boolean
  /** Called when the overlay should close (Escape key or × button). */
  onClose?: () => void
  /** Placeholder text shown in the search/chat input. */
  placeholder?: string
  /** Visual theme for the panel. */
  variant?: 'light' | 'dark'
  /** Additional CSS class applied to the root wrapper (inline mode only). */
  className?: string
}

/**
 * AI search and chat panel.
 *
 * Maintains a conversation history (`historyRef`) that is sent to the
 * backend on each turn to preserve multi-turn context. Parses structured
 * action responses from the AI and executes side-effects (editor insert,
 * navigation, document creation) automatically.
 *
 * In `"overlay"` mode the panel is draggable and resizable. In `"inline"`
 * mode it renders as a static element within the page flow.
 */
export function SpotlightSearch({
  mode,
  open = true,
  onClose,
  placeholder = 'Ask anything…',
  variant = 'light',
  className = '',
}: SpotlightSearchProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expanded, setExpanded] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const navigate = useNavigate()
  const { user } = useAuth()
  const editorBridge = useEditorBridge()

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  // Drag / resize (overlay mode only)
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, window.innerWidth / 2 - 336),
    y: Math.round(window.innerHeight * 0.18),
  }))
  const [panelWidth, setPanelWidth] = useState(672)
  const [chatHeight, setChatHeight] = useState(420)

  const isDark = variant === 'dark'

  // Focus input when overlay opens
  useEffect(() => {
    // Focus input when the overlay opens (short delay avoids animation glitch)
    if (mode === 'overlay' && open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [mode, open])

  // Auto-scroll messages
  useEffect(() => {
    // Keep the latest message in view after every update or when loading state changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /**
   * Sends the current input to the noot AI endpoint, parses the response
   * for structured action types (write, navigate, create-repo, message,
   * graph), and dispatches the appropriate side-effect before appending
   * the reply to the message list.
   */
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setExpanded(true)
    setLoading(true)
    const id = Date.now().toString()
    const userMsg: ChatMessage = { id, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    try {
      const res = await fetch(NOOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'noot_agent_v1',
          messages: historyRef.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const content: string = data.content ?? ''
      historyRef.current = [...historyRef.current, { role: 'assistant', content }]

      // Check for write-to-editor response
      const writeData = parseWriteResponse(content)
      if (writeData) {
        if (editorBridge.isEditorActive) {
          editorBridge.insertBlocks(writeData.blocks)
          setMessages(prev => [...prev, {
            id: id + '-r',
            role: 'assistant' as const,
            content: writeData.confirmation,
            writeData,
          }])
        } else {
          // No editor open — create a new document and navigate to it
          const blocks = writeData.blocks.map(b => ({ ...b, id: crypto.randomUUID() }))
          const h1Block = blocks.find(b => b.type === 'h1')
          const rawTitle = (h1Block?.content as string | undefined) || text
          const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '…' : rawTitle
          let docId: string | null = null
          if (user) {
            try {
              const { data, error } = await supabase
                .from('documents')
                .insert({
                  owner_user_id: user.id,
                  title,
                  blocks,
                  access_level: 'private',
                  is_public_root: false,
                })
                .select('id')
                .single()
              if (!error && data?.id) docId = data.id
            } catch { /* fall through to warning */ }
          }

          if (docId) {
            setMessages(prev => [...prev, {
              id: id + '-r',
              role: 'assistant' as const,
              content: `Created note "${title}" — opening editor…`,
              writeData,
            }])
            onClose?.()
            navigate(`/editor/${docId}`, { state: { name: title } })
          } else {
            setMessages(prev => [...prev, {
              id: id + '-r',
              role: 'assistant' as const,
              content: writeData.confirmation + '\n\n⚠ Could not create note — are you signed in?',
              writeData,
            }])
          }
        }
      } else {
        // ── Check for navigate response
        const navData = parseNavigateResponse(content)
        if (navData) {
          let resolvedRoute = navData.route
          let navMessage = navData.message
          const searchMatch = resolvedRoute.match(/__SEARCH:(.+?)__/)
          if (searchMatch && user) {
            const searchTitle = searchMatch[1]
            const { data: found } = await supabase
              .from('documents')
              .select('id')
              .eq('owner_user_id', user.id)
              .ilike('title', `%${searchTitle}%`)
              .limit(1)
              .single()
            if (found) {
              resolvedRoute = `/editor/${found.id}`
            } else {
              navMessage += `\n\n⚠ Couldn't find a nootbook matching "${searchTitle}".`
              resolvedRoute = ''
            }
          } else if (searchMatch) {
            navMessage += '\n\n⚠ Sign in to search your nootbooks.'
            resolvedRoute = ''
          }
          setMessages(prev => [...prev, {
            id: id + '-r', role: 'assistant' as const, content: navMessage,
            navigateData: { route: resolvedRoute, message: navMessage },
          }])
          if (resolvedRoute) navigate(resolvedRoute)
        } else {
          // ── Check for create-repo response
          const repoData = parseCreateRepoResponse(content)
          if (repoData) {
            let repoMessage = repoData.message
            let createdId: string | undefined
            if (user) {
              const { docId, error } = await createDocument(user, {
                title: repoData.title,
                tags: repoData.tags ?? [],
              })
              if (error) {
                repoMessage += `\n\n⚠ ${error}`
              } else if (docId) {
                createdId = docId
                if (repoData.initial_blocks?.length) {
                  // Assign unique stable IDs to each initial block before persisting
                  const blocksWithIds = repoData.initial_blocks.map((b, i) => ({
                    id: `init-${Date.now()}-${i}`,
                    type: b.type,
                    content: b.content,
                    ...(b.meta ? { meta: b.meta } : {}),
                  }))
                  await fetch(`${API_BASE}/api/repos/${docId}/personal/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ blocks: blocksWithIds, title: repoData.title }),
                  }).catch(() => {
                    // Non-fatal: the nootbook exists even if initial blocks failed to persist
                    repoMessage += '\n\n⚠ Nootbook created but initial content could not be saved.'
                  })
                }
                navigate(`/editor/${docId}`)
              }
            } else {
              repoMessage += '\n\n⚠ You need to be signed in to create a nootbook.'
            }
            setMessages(prev => [...prev, {
              id: id + '-r', role: 'assistant' as const, content: repoMessage,
              createRepoData: { title: repoData.title, message: repoMessage, repoId: createdId },
            }])
          } else {
            // ── MESSAGE or graph/plain response
            const msgData = parseMessageResponse(content)
            const graphData = parseGraphResponse(content)
            setMessages(prev => [...prev, {
              id: id + '-r',
              role: 'assistant' as const,
              content: msgData ? msgData.message : content,
              graphData: msgData ? undefined : graphData,
            }])
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: id + '-r',
        role: 'assistant',
        content: `⚠ ${err instanceof Error ? err.message : 'Failed to reach API'}`,
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, navigate, user, editorBridge])

  // ── Expand a graph node into subtasks ──────────────────────────────
  /**
   * Fetches a sub-graph for a specific task node by calling the graph API
   * with the full ancestor chain as context. Used by `GraphView` when the
   * user clicks "expand" on a node.
   *
   * @param item      - The task node to expand.
   * @param context   - Optional additional context string.
   * @param ancestors - Ordered list of ancestor nodes (parent → grandparent…).
   * @returns Parsed sub-task items and summary.
   */
  const expandTask: ExpandFn = useCallback(async (item, context, ancestors) => {
    const userMessages = historyRef.current.filter(m => m.role === 'user')
    const topLevelPrompt = userMessages[0]?.content ?? ''
    let prompt = `other context: Top-level goal: ${topLevelPrompt}`
    if (ancestors.length > 0) {
      prompt += `\n\nother context: Ancestor task chain:\n${ancestors.map((a, i) => `${i + 1}. ${a.name}: ${a.text}`).join('\n')}`
    }
    prompt += `\n\ncurrent node title: ${item.name}: ${item.text}`
    if (context) prompt += `\n\nother context: ${context}`

    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: rawGraphPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const parsed = parseGraphResponse(data.content ?? '')
    if (!parsed) throw new Error('Could not parse expansion response')
    return parsed
  }, [])

  // ── Query/explain a graph node ────────────────────────────────────
  /**
   * Asks the explain API a question about a specific graph node.
   * Provides the full task hierarchy as context so the model can give
   * a relevant, focused answer.
   *
   * @param item      - The task node being queried.
   * @param question  - The user's question about this node.
   * @param ancestors - Ordered ancestor chain for context.
   * @returns Plain-text explanation string.
   */
  const queryNode: QueryFn = useCallback(async (item, question, ancestors) => {
    const userMessages = historyRef.current.filter(m => m.role === 'user')
    const topLevelPrompt = userMessages[0]?.content ?? ''
    let context = `other context: Overall goal: ${topLevelPrompt}`
    if (ancestors.length > 0) {
      context += `\n\nother context: Task hierarchy:\n${ancestors.map((a, i) => `${i + 1}. ${a.name}: ${a.text}`).join('\n')}`
    }
    context += `\n\ncurrent node title: ${item.name}: ${item.text}`
    context += `\n\nother context: ${question}`

    const res = await fetch(EXPLAIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: context },
        ],
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    return data.content?.trim() ?? 'No response.'
  }, [])

  /** Fills the input field with a suggestion chip text and focuses the input. */
  const handleSuggestion = useCallback((s: string) => {
    setInput(s)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  /** Reads selected files from the file picker and appends them to `attachedFiles`. */
  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setAttachedFiles(prev => [
      ...prev,
      ...files.map(f => ({ name: f.name, size: f.size, type: f.type })),
    ])
    e.target.value = ''
  }, [])

  /** Removes a previously attached file by name from `attachedFiles`. */
  const removeFile = useCallback((name: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== name))
  }, [])

  /**
   * Clears all messages, files, and conversation history with a brief
   * fade animation (`clearing` flag triggers the CSS transition).
   */
  const clearChat = useCallback(() => {
    if (clearing) return
    setClearing(true)
    setTimeout(() => {
      // Execute the wipe after the CSS fade-out animation finishes (250 ms)
      setMessages([])
      setAttachedFiles([])
      setExpanded(false)
      setClearing(false)
      historyRef.current = []
    }, 250)
  }, [clearing])

  // ── Drag ────────────────────────────────────────────────────────────
  /**
   * Initiates a drag operation for the overlay panel.
   * Attaches temporary `mousemove`/`mouseup` listeners to `window` and
   * updates `pos` to keep the panel within the viewport bounds.
   *
   * @param e - The mousedown event on the drag handle bar.
   */
  const handleDragStart = (e: React.MouseEvent) => {
    // Don't drag when clicking interactive children
    if ((e.target as HTMLElement).closest('button, input, a')) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY
    const spx = pos.x, spy = pos.y
    const pw = panelWidth
    /** Updates panel position on every mousemove, clamping to viewport bounds. */
    const onMove = (ev: MouseEvent) => {
      setPos({
        x: Math.max(16, Math.min(window.innerWidth - pw - 16, spx + ev.clientX - sx)),
        y: Math.max(16, Math.min(window.innerHeight - 60, spy + ev.clientY - sy)),
      })
    }
    /** Removes temporary window listeners once the drag ends. */
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Resize ──────────────────────────────────────────────────────────
  /**
   * Initiates a resize operation from the bottom-right corner handle.
   * Clamps `panelWidth` to `[360, viewport - 32]` and `chatHeight` to
   * `[160, 600]` to prevent the panel from becoming unusable.
   *
   * @param e - The mousedown event on the resize handle.
   */
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const sw = panelWidth, sh = chatHeight
    /** Adjusts panel width and chat area height while clamping to allowed ranges. */
    const onMove = (ev: MouseEvent) => {
      setPanelWidth(Math.max(360, Math.min(window.innerWidth - 32, sw + ev.clientX - sx)))
      setChatHeight(Math.max(160, Math.min(600, sh + ev.clientY - sy)))
    }
    /** Removes temporary window listeners once the resize ends. */
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (mode === 'overlay' && !open) return null

  // ── Colors ──────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-[#0f1f1a]' : 'bg-parchment'
  const border = isDark ? 'border-sage/20' : 'border-forest/[0.12]'
  const textColor = isDark ? 'text-parchment' : 'text-forest'
  const placeholderColor = isDark ? 'placeholder:text-sage/30' : 'placeholder:text-forest/30'
  const msgUserBg = isDark ? 'bg-sage/20 text-parchment' : 'bg-forest text-parchment'
  const msgAiBg = isDark ? 'bg-forest border border-sage/15 text-parchment/80' : 'bg-cream border border-forest/10 text-forest/80'
  const suggestionStyle = isDark
    ? 'border-sage/15 text-sage/50 hover:border-sage/30 hover:text-sage/70'
    : 'border-forest/12 text-forest/40 hover:border-forest/25 hover:text-forest/65'
  const mutedText = isDark ? 'text-sage/30' : 'text-forest/30'
  const iconMuted = isDark ? 'text-sage/40' : 'text-forest/25'
  const subtleBtn = isDark
    ? 'text-sage/35 hover:text-sage/60 hover:bg-sage/10'
    : 'text-forest/30 hover:text-forest/55 hover:bg-forest/8'
  // Drag handle bar — forest header in light, subtle lift in dark
  const handleBg = isDark ? 'bg-white/[0.04]' : 'bg-forest'
  const handleBorder = isDark ? 'border-sage/15' : 'border-forest-deep/25'
  const handleGrip = isDark ? 'text-sage/30' : 'text-parchment/35'
  const handleLabel = isDark ? 'text-sage/50' : 'text-parchment/70'
  const handleClose = isDark
    ? 'text-sage/35 hover:text-sage/65 hover:bg-sage/10'
    : 'text-parchment/45 hover:text-parchment/90 hover:bg-parchment/10'

  // ── Shared sub-elements ─────────────────────────────────────────────

  const inputRowJSX = (
    <div className="flex items-center gap-3">
      <svg className={`w-4 h-4 shrink-0 ${iconMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M21 21l-5.197-5.197M15.803 15.803A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
          if (e.key === 'Escape' && onClose) onClose()
        }}
        placeholder={placeholder}
        className={`flex-1 bg-transparent text-sm ${textColor} ${placeholderColor} outline-none font-[family-name:var(--font-body)]`}
      />
      {mode === 'overlay' && !expanded && (
        <span className={`font-mono text-[9px] ${isDark ? 'text-sage/25' : 'text-forest/20'} shrink-0`}>ESC</span>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${subtleBtn}`}
        aria-label="Attach file"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
        </svg>
      </button>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />
      <button
        onClick={sendMessage}
        disabled={!input.trim() || loading}
        className={`shrink-0 w-8 h-8 ${isDark ? 'bg-sage/20 hover:bg-sage/30' : 'bg-forest hover:bg-forest-deep'} squircle-sm flex items-center justify-center text-parchment transition-colors disabled:opacity-20 cursor-pointer`}
        aria-label="Send"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )

  const fileChipsJSX = attachedFiles.length > 0 && (
    <div className="flex flex-wrap gap-1.5 pl-7">
      {attachedFiles.map(f => (
        <span
          key={f.name}
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-[family-name:var(--font-body)]
            ${isDark ? 'bg-sage/10 border-sage/20 text-sage/60' : 'bg-forest/6 border-forest/12 text-forest/50'}`}
        >
          <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          <span className="max-w-[120px] truncate">{f.name}</span>
          <button
            onClick={() => removeFile(f.name)}
            className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label={`Remove ${f.name}`}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  )

  const chatHeaderJSX = (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${border}`}>
      <span className={`text-[10px] font-[family-name:var(--font-body)] tracking-wide uppercase ${mutedText}`}>
        Conversation
      </span>
      <button
        onClick={clearChat}
        className={`flex items-center gap-1 text-[10px] font-[family-name:var(--font-body)] px-2 py-1 rounded-lg transition-colors cursor-pointer ${subtleBtn}`}
        aria-label="Clear chat"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear
      </button>
    </div>
  )

  const messagesJSX = (
    <div className="space-y-2.5">
      {messages.map(msg => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.role === 'user' ? (
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-xl font-[family-name:var(--font-body)] ${msgUserBg}`}
              style={{ animation: 'fade-up 0.2s ease-out' }}
            >
              {msg.content}
            </div>
          ) : msg.graphData ? (
            /* ── Graph response ── */
            <div className="w-full" style={{ animation: 'fade-up 0.2s ease-out' }}>
              <div
                className={`rounded-xl overflow-hidden border ${isDark ? 'border-sage/15' : 'border-forest/10'}`}
                style={{ height: 320 }}
              >
                <GraphView items={msg.graphData.items} onExpand={expandTask} onQuery={queryNode} />
              </div>
              {msg.graphData.summary && (
                <div className={`mt-1.5 px-3 py-2 rounded-lg text-[11px] leading-relaxed font-[family-name:var(--font-body)] ${isDark ? 'bg-sage/10 text-parchment/70 border border-sage/15' : 'bg-forest/5 text-forest/60 border border-forest/10'}`}>
                  <span className={`font-mono text-[9px] uppercase tracking-widest mr-1.5 ${isDark ? 'text-sage/40' : 'text-forest/30'}`}>summary</span>
                  {msg.graphData.summary}
                </div>
              )}
            </div>
          ) : msg.navigateData ? (
            /* ── Navigate response ── */
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-xl font-[family-name:var(--font-body)] ${msgAiBg}`}
              style={{ animation: 'fade-up 0.2s ease-out' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className={`w-3.5 h-3.5 ${isDark ? 'text-sage/70' : 'text-sage'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <span className={`font-mono text-[9px] uppercase tracking-widest ${isDark ? 'text-sage/50' : 'text-forest/40'}`}>
                  navigated
                </span>
              </div>
              <div className={`text-[11px] ${isDark ? 'text-parchment/70' : 'text-forest/65'}`}>
                {msg.navigateData.message}
              </div>
            </div>
          ) : msg.createRepoData ? (
            /* ── Create repo response ── */
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-xl font-[family-name:var(--font-body)] ${msgAiBg}`}
              style={{ animation: 'fade-up 0.2s ease-out' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className={`w-3.5 h-3.5 ${msg.createRepoData.repoId ? 'text-green-500' : (isDark ? 'text-amber-400' : 'text-amber-600')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {msg.createRepoData.repoId
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  }
                </svg>
                <span className={`font-mono text-[9px] uppercase tracking-widest ${isDark ? 'text-sage/50' : 'text-forest/40'}`}>
                  {msg.createRepoData.repoId ? 'nootbook created' : 'creation failed'}
                </span>
              </div>
              <div className={`text-[11px] ${isDark ? 'text-parchment/70' : 'text-forest/65'}`}>
                {msg.createRepoData.message}
              </div>
            </div>
          ) : msg.writeData ? (
            /* ── Write-to-editor response ── */
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-xl font-[family-name:var(--font-body)] ${msgAiBg}`}
              style={{ animation: 'fade-up 0.2s ease-out' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className={`w-3.5 h-3.5 ${editorBridge.isEditorActive ? 'text-green-500' : (isDark ? 'text-amber-400' : 'text-amber-600')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {editorBridge.isEditorActive
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  }
                </svg>
                <span className={`font-mono text-[9px] uppercase tracking-widest ${isDark ? 'text-sage/50' : 'text-forest/40'}`}>
                  {editorBridge.isEditorActive ? 'written to editor' : 'editor not open'}
                </span>
              </div>
              <div className={`text-[11px] ${isDark ? 'text-parchment/70' : 'text-forest/65'}`}>
                {msg.writeData.confirmation}
              </div>
              {/* Preview the blocks that were (or would be) inserted */}
              <div className={`mt-2 pt-2 border-t ${isDark ? 'border-sage/10' : 'border-forest/8'} space-y-1`}>
                {msg.writeData.blocks.slice(0, 4).map((b, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-sage/45' : 'text-forest/35'}`}>
                    <span className="font-mono uppercase tracking-wider w-12 shrink-0 text-[8px]">{b.type}</span>
                    <span className="truncate">{b.content || '—'}</span>
                  </div>
                ))}
                {msg.writeData.blocks.length > 4 && (
                  <div className={`text-[10px] ${isDark ? 'text-sage/35' : 'text-forest/25'}`}>
                    +{msg.writeData.blocks.length - 4} more…
                  </div>
                )}
              </div>
              {/* Manual insert button when not on editor page */}
              {!editorBridge.isEditorActive && msg.writeData && (
                <button
                  onClick={() => {
                    // Serialise each block to its Markdown equivalent then copy to clipboard
                    const text = msg.writeData!.blocks.map(b => {
                      if (b.type === 'h1') return `# ${b.content}`
                      if (b.type === 'h2') return `## ${b.content}`
                      if (b.type === 'h3') return `### ${b.content}`
                      if (b.type === 'latex') return `$$${b.content}$$`
                      if (b.type === 'code') return `\`\`\`${(b.meta as Record<string, string>)?.language ?? ''}\n${b.content}\n\`\`\``
                      if (b.type === 'quote') return `> ${b.content}`
                      if (b.type === 'divider') return '---'
                      return b.content
                    }).join('\n\n')
                    navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  className={`mt-2 text-[10px] px-2 py-1 rounded-md border cursor-pointer transition-colors ${isDark ? 'border-sage/20 text-sage/60 hover:bg-sage/10' : 'border-forest/15 text-forest/50 hover:bg-forest/5'}`}
                >
                  {copied ? '✓ Copied' : 'Copy as markdown'}
                </button>
              )}
            </div>
          ) : (
            /* ── Text response with markdown ── */
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-xl font-[family-name:var(--font-body)] ${msgAiBg}`}
              style={{ animation: 'fade-up 0.2s ease-out' }}
            >
              <div className="prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:pl-3 [&_ol]:pl-4 [&_li]:mb-0.5 [&_code]:text-[10px] [&_code]:bg-forest/8 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:text-[10px] [&_pre]:bg-forest/8 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-sage [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:opacity-80">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
      {/* ── Loading indicator ── */}
      {loading && (
        <div className="flex justify-start">
          <div className={`px-3 py-2 rounded-xl flex items-center gap-1.5 ${msgAiBg}`}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-sage/60' : 'bg-forest/40'}`}
                style={{
                  animation: `noot-bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
      <style>{`
        @keyframes noot-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )

  const chatAnimation = clearing
    ? 'chat-clear 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    : 'spotlight-expand 0.25s cubic-bezier(0.16, 1, 0.3, 1)'

  // ── Overlay mode: draggable / resizable panel ────────────────────────
  if (mode === 'overlay') {
    return (
      <div
        className={`fixed z-[100] ${bg} border ${border} rounded-2xl overflow-hidden
          shadow-[0_16px_64px_-8px_rgba(26,47,38,0.38),0_2px_12px_-2px_rgba(26,47,38,0.14),0_0_0_0.5px_rgba(26,47,38,0.10)]`}
        style={{ left: pos.x, top: pos.y, width: panelWidth, animation: 'fade-up 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drag handle bar ── */}
        <div
          onMouseDown={handleDragStart}
          className={`flex items-center justify-between px-4 py-2.5 border-b ${handleBorder} ${handleBg} cursor-grab active:cursor-grabbing select-none`}
        >
          <div className="flex items-center gap-2.5">
            {/* 6-dot grip icon */}
            <svg className={`w-3 h-3 shrink-0 ${handleGrip}`} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
              <circle cx="3" cy="2.5" r="1.1" /><circle cx="9" cy="2.5" r="1.1" />
              <circle cx="3" cy="6" r="1.1" /><circle cx="9" cy="6" r="1.1" />
              <circle cx="3" cy="9.5" r="1.1" /><circle cx="9" cy="9.5" r="1.1" />
            </svg>
            <span className={`font-[family-name:var(--font-display)] text-[22px] leading-none ${handleLabel}`}>
              noot
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Export PDF */}
            {expanded && messages.length > 0 && (
              <>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => exportToPDF(messages)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${handleClose}`}
                  aria-label="Export PDF"
                  title="Export as PDF"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </button>
                {/* Copy text */}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={async () => { const ok = await copyAsText(messages); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500) } }}
                  className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${copied ? (isDark ? 'text-green-400' : 'text-green-600') : handleClose}`}
                  aria-label="Copy text"
                  title={copied ? 'Copied!' : 'Copy as text'}
                >
                  {copied ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
                </button>
              </>
            )}
            {/* Close */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={onClose}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${handleClose}`}
              aria-label="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Input area ── */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {inputRowJSX}
          {fileChipsJSX}
        </div>

        {/* ── Suggestions ── */}
        {!expanded && !clearing && (
          <div className={`px-4 pb-3 pt-0 flex flex-wrap gap-2 ${isDark ? '' : 'bg-forest/[0.025]'}`}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className={`font-[family-name:var(--font-body)] text-[11px] px-3 py-1.5 border squircle-sm transition-all cursor-pointer ${suggestionStyle}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Chat area ── */}
        {(expanded || clearing) && (
          <div
            className={`border-t ${border} overflow-hidden`}
            style={{ animation: chatAnimation, transformOrigin: 'top center' }}
          >
            {chatHeaderJSX}
            <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: chatHeight }}>
              {messagesJSX}
            </div>
          </div>
        )}

        {/* ── Resize handle (bottom-right corner) ── */}
        <div
          onMouseDown={handleResizeStart}
          className={`absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1.5`}
          aria-label="Resize"
        >
          <svg className={`w-2.5 h-2.5 ${mutedText}`} viewBox="0 0 10 10" fill="currentColor" aria-hidden>
            <circle cx="8.5" cy="8.5" r="1" />
            <circle cx="5" cy="8.5" r="1" />
            <circle cx="8.5" cy="5" r="1" />
          </svg>
        </div>
      </div>
    )
  }

  // ── Inline mode ──────────────────────────────────────────────────────
  const searchBar = (
    <div className={`w-full ${bg} border ${border} px-4 py-3 flex flex-col gap-2
      shadow-[0_4px_32px_-10px_rgba(38,70,53,0.08)]
      focus-within:border-sage/40 focus-within:shadow-[0_6px_32px_-10px_rgba(138,155,117,0.16)]
      transition-all rounded-2xl`}
    >
      {inputRowJSX}
      {fileChipsJSX}
    </div>
  )

  const responsePanel = (expanded || clearing) && (
    <div
      className={`w-full ${bg} border ${border} rounded-2xl mt-2 overflow-hidden`}
      style={{ animation: chatAnimation, transformOrigin: 'top center' }}
    >
      {chatHeaderJSX}
      <div className="px-4 py-3 max-h-72 overflow-y-auto">
        {messagesJSX}
      </div>
    </div>
  )

  const suggestions = !expanded && (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      {SUGGESTIONS.map(s => (
        <button
          key={s}
          onClick={() => handleSuggestion(s)}
          className={`font-[family-name:var(--font-body)] text-[11px] px-3 py-1.5 border squircle-sm transition-all cursor-pointer ${suggestionStyle}`}
        >
          {s}
        </button>
      ))}
    </div>
  )

  return (
    <div className={`w-full ${className}`}>
      {searchBar}
      {responsePanel}
      {suggestions}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* SpotlightFAB                                                         */
/* Bottom-left floating button. Click or ⌘K opens spotlight overlay.  */
/* ------------------------------------------------------------------ */

/**
 * Standalone floating action button that toggles the {@link SpotlightSearch}
 * overlay. Registers a global ⌘K / Ctrl+K keyboard shortcut.
 *
 * @param variant - Visual theme passed through to `SpotlightSearch`.
 */
export function SpotlightFAB({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false)
  const isDark = variant === 'dark'

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    /** Toggles the spotlight overlay and prevents the default browser shortcut. */
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <SpotlightSearch
        mode="overlay"
        open={open}
        onClose={() => setOpen(false)}
        placeholder="Ask noot anything… ⌘K"
        variant={variant}
      />
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center
          shadow-[0_4px_24px_-4px_rgba(26,47,38,0.45)]
          hover:scale-110 hover:shadow-[0_8px_32px_-4px_rgba(26,47,38,0.55)]
          transition-all duration-200 cursor-pointer
          ${isDark ? 'bg-sage/30' : 'bg-forest'}`}
        aria-label="Open AI assistant (⌘K)"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21 C12 21 5 17 5 10 C5 6 8.5 3.5 12 3.5 C15.5 3.5 19 6 19 10 C19 17 12 21 12 21Z"
            stroke="#E9E4D4"
            strokeWidth="1.4"
            fill="rgba(233,228,212,0.08)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 21 L12 10" stroke="#E9E4D4" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M12 12 L9 9.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <path d="M12 15 L15 12.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <g opacity="0.85">
            <path d="M18.5 5 L18.5 7" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M17.5 6 L19.5 6" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>
      </button>
    </>
  )
}
