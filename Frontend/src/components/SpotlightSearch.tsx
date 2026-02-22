import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import GraphView, { type TaskItem, type ExpandFn, type QueryFn } from '../pages/GraphView'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rawGraphPrompt from '../../../gpt_prompts/gpt_prompt.txt?raw'
import rawSimplePrompt from '../../../gpt_prompts/gpt_prompt_simple.txt?raw'
import { useGraphHistory, rawNodesToItems } from '../hooks/useGraphHistory'
import { useAuth } from '../hooks/useAuth'
import { useEditorBridge, type BlockSpec } from '../contexts/EditorBridgeContext'
import { supabase } from '../lib/supabase'
import { parseWriteResponse, normalizeBlocks, titleFromBlocks } from '../lib/writeToEditor'

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
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api/prompt').replace(/\/api\/prompt$/, '')
const NOOT_API_URL  = `${API_BASE}/api/noot`
const GRAPH_API_URL = `${API_BASE}/api/prompt`

// ─── PARSE GRAPH RESPONSE ──────────────────────────────────────────────
function dedupeItems(parsed: TaskItem[]): TaskItem[] {
  const seen = new Set<string>()
  return parsed.filter(it => {
    if (typeof it.name !== 'string' || seen.has(it.name)) return false
    seen.add(it.name)
    return true
  })
}

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
  content.split(/\n+/).forEach(line => { const t = line.trim(); if (t && !re.test(t)) summaryLines.push(t) })
  return { items: dedupeItems(items), summary: summaryLines.join(' ').trim() }
}

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

function parseGraphResponse(content: string): { items: TaskItem[]; summary: string } | null {
  const { body, suffix } = normaliseContent(content)
  try {
    const rawStart = body.indexOf('[')
    if (rawStart !== -1) {
      const afterBracket = body.slice(rawStart + 1).trimStart()
      const start = afterBracket.startsWith('{') ? rawStart : body.indexOf('[{')
      const end   = body.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end >= start) {
        const jsonStr = body.slice(start, end + 1).replace(/\/\/[^\n\r]*/g, '')
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].name === 'string' && typeof parsed[0].text === 'string') {
          const items = dedupeItems(parsed as TaskItem[])
          if (items.length > 0) return { items, summary: (suffix || body.slice(end + 1)).trim() }
        }
      }
    }
  } catch { /* fall through */ }
  return parseTextFormat(content)
}


function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function exportToPDF(messages: ChatMessage[]) {
  const userMessages  = messages.filter(m => m.role === 'user')
  const mainPrompt    = userMessages[0]?.content ?? 'Noot Conversation'
  const generatedAt   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
  win.onload = () => setTimeout(() => win.print(), 600)
  win.document.close()
}

async function copyAsText(messages: ChatMessage[]): Promise<boolean> {
  const lines: string[] = ['═══ Noot Conversation ═══', `Generated: ${new Date().toLocaleString()}`, '']
  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`▸ You: ${msg.content}`, '')
    } else if (msg.graphData) {
      lines.push('▸ Noot [Graph]:')
      msg.graphData.items.forEach((item, i) => {
        lines.push(`  ${i + 1}. ${item.name}`)
        lines.push(`     ${item.text}`)
        if (item.depends_on?.length) lines.push(`     → ${item.depends_on.join(', ')}`)
      })
      if (msg.graphData.summary) lines.push('', `  Summary: ${msg.graphData.summary}`)
      lines.push('')
    } else if (msg.writeData) {
      lines.push('▸ Noot [Written to Editor]:')
      msg.writeData.blocks.forEach((b, i) => {
        lines.push(`  ${i + 1}. [${b.type}] ${b.content}`)
      })
      lines.push('', `  ${msg.writeData.confirmation}`, '')
    } else {
      lines.push(`▸ Noot: ${msg.content}`, '')
    }
  }
  try { await navigator.clipboard.writeText(lines.join('\n')); return true } catch { return false }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  graphData?: { items: TaskItem[]; summary: string } | null
  writeData?: { blocks: BlockSpec[]; confirmation: string } | null
}

const SUGGESTIONS = [
  'Explain the chain rule',
  'Plan a study schedule for finals',
  'Break down how to build a todo app',
  "What is Bayes' theorem?",
]

interface SpotlightSearchProps {
  mode: 'inline' | 'overlay'
  open?: boolean
  onClose?: () => void
  placeholder?: string
  variant?: 'light' | 'dark'
  className?: string
}

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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const history = useGraphHistory()
  const editorBridge = useEditorBridge()
  const { user } = useAuth()
  const navigate = useNavigate()

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
    if (mode === 'overlay' && open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [mode, open])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
          model: 'gpt-4o',
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
            role: 'assistant',
            content: writeData.confirmation,
            writeData,
          }])
        } else {
          // No editor open — create a new document and navigate to it
          // Use the h1 block content as the title, fall back to prompt text
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
              role: 'assistant',
              content: `Created note "${title}" — opening editor…`,
              writeData,
            }])
            onClose?.()
            navigate(`/editor/${docId}`, { state: { name: title } })
          } else {
            setMessages(prev => [...prev, {
              id: id + '-r',
              role: 'assistant',
              content: writeData.confirmation + '\n\n⚠ Could not create note — are you signed in?',
              writeData,
            }])
          }
        }
      } else {
        const graphData = parseGraphResponse(content)
        setMessages(prev => [...prev, {
          id: id + '-r',
          role: 'assistant',
          content,
          graphData,
        }])
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
  }, [input, loading])

  // ── Expand a graph node into subtasks ──────────────────────────────
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
  const queryNode: QueryFn = useCallback(async (item, question, ancestors) => {
    const userMessages = historyRef.current.filter(m => m.role === 'user')
    const topLevelPrompt = userMessages[0]?.content ?? ''
    let context = `Topic: ${topLevelPrompt}`
    if (ancestors.length > 0) {
      context += `\nPath: ${ancestors.map(a => a.name).join(' → ')}`
    }
    context += `\nNode: ${item.name} — ${item.text}`
    if (question) context += `\nQuestion: ${question}`

    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: rawSimplePrompt },
          { role: 'user', content: context },
        ],
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    return data.content?.trim() ?? 'No response.'
  }, [])

  const handleSuggestion = useCallback((s: string) => {
    setInput(s)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setAttachedFiles(prev => [
      ...prev,
      ...files.map(f => ({ name: f.name, size: f.size, type: f.type })),
    ])
    e.target.value = ''
  }, [])

  const removeFile = useCallback((name: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== name))
  }, [])

  const clearChat = useCallback(() => {
    if (clearing) return
    setClearing(true)
    setTimeout(() => {
      setMessages([])
      setAttachedFiles([])
      setExpanded(false)
      setClearing(false)
      historyRef.current = []
    }, 250)
  }, [clearing])

  // ── Drag ────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    // Don't drag when clicking interactive children
    if ((e.target as HTMLElement).closest('button, input, a')) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY
    const spx = pos.x, spy = pos.y
    const pw = panelWidth
    const onMove = (ev: MouseEvent) => {
      setPos({
        x: Math.max(16, Math.min(window.innerWidth - pw - 16, spx + ev.clientX - sx)),
        y: Math.max(16, Math.min(window.innerHeight - 60, spy + ev.clientY - sy)),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Resize ──────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const sw = panelWidth, sh = chatHeight
    const onMove = (ev: MouseEvent) => {
      setPanelWidth(Math.max(360, Math.min(window.innerWidth - 32, sw + ev.clientX - sx)))
      setChatHeight(Math.max(160, Math.min(600, sh + ev.clientY - sy)))
    }
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
  const handleBg    = isDark ? 'bg-white/[0.04]'   : 'bg-forest'
  const handleBorder = isDark ? 'border-sage/15'    : 'border-forest-deep/25'
  const handleGrip  = isDark ? 'text-sage/30'       : 'text-parchment/35'
  const handleLabel = isDark ? 'text-sage/50'        : 'text-parchment/70'
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
                    const text = msg.writeData!.blocks.map(b => {
                      if (b.type === 'h1') return `# ${b.content}`
                      if (b.type === 'h2') return `## ${b.content}`
                      if (b.type === 'h3') return `### ${b.content}`
                      if (b.type === 'latex') return `$$${b.content}$$`
                      if (b.type === 'code') return `\`\`\`${(b.meta as Record<string,string>)?.language ?? ''}\n${b.content}\n\`\`\``
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
            {[0,1,2].map(i => (
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
              <circle cx="3" cy="6"   r="1.1" /><circle cx="9" cy="6"   r="1.1" />
              <circle cx="3" cy="9.5" r="1.1" /><circle cx="9" cy="9.5" r="1.1" />
            </svg>
            <span className={`font-[family-name:var(--font-display)] text-[22px] leading-none ${handleLabel}`}>
              noot
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* History button */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) history.refresh() }}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${historyOpen ? (isDark ? 'bg-sage/20 text-sage/80' : 'bg-parchment/20 text-parchment') : handleClose}`}
              aria-label="History"
              title="Graph history"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
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
        {!expanded && !clearing && !historyOpen && (
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

        {/* ── History panel ── */}
        {historyOpen && (
          <div className={`border-t ${border} overflow-hidden`}>
            <div className={`px-4 py-2 flex items-center justify-between ${isDark ? 'bg-white/[0.02]' : 'bg-forest/[0.03]'}`}>
              <span className={`font-[family-name:var(--font-display)] text-[13px] ${handleLabel}`}>
                Saved Graphs
              </span>
              <button onClick={() => setHistoryOpen(false)} className={`text-[11px] ${subtleBtn} cursor-pointer`}>
                close
              </button>
            </div>
            <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: 280 }}>
              {history.loading ? (
                <div className={`text-center py-6 text-[12px] ${mutedText}`}>Loading…</div>
              ) : history.graphs.length === 0 ? (
                <div className={`text-center py-6 text-[12px] ${mutedText}`}>No saved graphs yet</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {history.graphs.map(g => (
                    <button
                      key={g.graphId}
                      onClick={() => {
                        const items = rawNodesToItems(g.rawNodes, g.rawEdges)
                        if (items.length === 0) return
                        const summary = g.title || items[0]?.name || 'Loaded graph'
                        setMessages(prev => [
                          ...prev,
                          { id: crypto.randomUUID(), role: 'assistant', content: summary, graphData: { items, summary } }
                        ])
                        setExpanded(true)
                        setHistoryOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'hover:bg-sage/10' : 'hover:bg-forest/[0.06]'}`}
                    >
                      <div className={`text-[12px] font-medium truncate ${isDark ? 'text-sage/80' : 'text-forest/85'}`}>
                        {g.title || 'Untitled graph'}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        {g.nodeCount} nodes · {new Date(g.updatedAt || g.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <circle cx="5"   cy="8.5" r="1" />
            <circle cx="8.5" cy="5"   r="1" />
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

export function SpotlightFAB({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false)
  const isDark = variant === 'dark'

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
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
