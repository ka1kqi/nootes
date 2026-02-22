import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import GraphView, { type TaskItem, type ExpandFn, type QueryFn } from './GraphView'
import type { Node, Edge } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import 'katex/dist/katex.min.css'
import { motion, AnimatePresence } from 'framer-motion'
import rawPrompt from '../../../gpt_prompts/gpt_prompt.txt?raw'
import rawSimplePrompt from '../../../gpt_prompts/gpt_prompt_simple.txt?raw'
import { useAuth } from '../hooks/useAuth'
import { useGraphPersistence } from '../hooks/useGraphPersistence'
import { useGraphHistory, rawNodesToItems } from '../hooks/useGraphHistory'
import { supabase } from '../lib/supabase'

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/prompt'

const SYSTEM_PROMPT        = rawPrompt
const SYSTEM_PROMPT_SIMPLE = rawSimplePrompt

// ─── TYPES ─────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: Date
}

// ─── SYNTAX THEME (GMK Botanical) ──────────────────────────────────────────
const botanicalTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#264635',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85rem',
    background: 'transparent',
    lineHeight: '1.6',
  },
  'comment': { color: '#A3B18A', fontStyle: 'italic' },
  'keyword': { color: '#264635', fontWeight: '600' },
  'string': { color: '#5C4A32' },
  'number': { color: '#3D6B4F' },
  'function': { color: '#1A1A18', fontWeight: '500' },
  'operator': { color: '#264635' },
  'punctuation': { color: '#7A8C7E' },
  'class-name': { color: '#264635', fontWeight: '600' },
  'builtin': { color: '#3D6B4F' },
  'variable': { color: '#1A1A18' },
  'parameter': { color: '#5C4A32' },
}

// ─── DOODLE DECORATIONS ─────────────────────────────────────────────────────
const Doodle = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="animate-float opacity-20">
    <circle cx="60" cy="60" r="28" stroke="#264635" strokeWidth="1.5" strokeDasharray="4 3"/>
    <path d="M40 60 Q60 35 80 60 Q60 85 40 60Z" stroke="#A3B18A" strokeWidth="1.5" fill="none"/>
    <circle cx="60" cy="60" r="5" fill="#264635" opacity="0.4"/>
    <path d="M30 30 Q45 20 50 35" stroke="#A3B18A" strokeWidth="1" strokeLinecap="round"/>
    <path d="M75 85 Q90 80 88 95" stroke="#A3B18A" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

const LeafDoodle = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="animate-float-delayed opacity-15">
    <path d="M40 10 C60 10 70 25 70 40 C70 60 55 70 40 70 C25 70 10 60 10 40 C10 25 20 10 40 10Z" 
      stroke="#264635" strokeWidth="1.5" fill="none" strokeDasharray="3 2"/>
    <path d="M40 10 L40 70" stroke="#A3B18A" strokeWidth="1" opacity="0.6"/>
    <path d="M40 30 L55 25" stroke="#A3B18A" strokeWidth="1" opacity="0.6"/>
    <path d="M40 40 L20 38" stroke="#A3B18A" strokeWidth="1" opacity="0.6"/>
    <path d="M40 50 L58 52" stroke="#A3B18A" strokeWidth="1" opacity="0.6"/>
  </svg>
)

const GridDoodle = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="animate-spin-slow opacity-10">
    <rect x="10" y="10" width="40" height="40" stroke="#264635" strokeWidth="1.5"/>
    <rect x="20" y="20" width="20" height="20" stroke="#A3B18A" strokeWidth="1.5" transform="rotate(45 30 30)"/>
    <circle cx="30" cy="30" r="4" fill="#264635" opacity="0.3"/>
  </svg>
)

// ─── CODE BLOCK ─────────────────────────────────────────────────────────────
interface CodeBlockProps {
  language: string
  children: string
}

const CodeBlock = ({ language, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-4 squircle-xl border border-forest/15 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-forest">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sage"/>
          <div className="w-2 h-2 bg-sage opacity-60"/>
          <div className="w-2 h-2" style={{width:8,height:8,clipPath:'polygon(50% 0%,100% 100%,0% 100%)',background:'#8a9b75',opacity:0.4}}/>
        </div>
        <span className="font-mono text-[11px] text-sage uppercase tracking-widest">{language || 'code'}</span>
        <button
          onClick={copy}
          className="font-mono text-[11px] text-sage hover:text-parchment transition-colors cursor-pointer"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <div className="bg-cream overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={botanicalTheme}
          customStyle={{ margin: 0, padding: '1rem 1.25rem', background: 'transparent', fontSize: '0.83rem' }}
          showLineNumbers
          lineNumberStyle={{ color: '#A3B18A', marginRight: '1rem', userSelect: 'none', fontSize: '0.75rem' }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

// ─── MESSAGE BUBBLE ─────────────────────────────────────────────────────────
export const MessageBubble = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user'
  const isError = msg.role === 'error'

  // For assistant messages that contain a graph JSON, show only the summary
  const displayContent = (!isUser && !isError)
    ? (parseGraphResponse(msg.content)?.summary || msg.content)
    : msg.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
    >
      {!isUser && (
        <div className="w-8 h-8 mr-3 mt-1 flex-shrink-0 flex items-center justify-center border-2 border-forest bg-forest squircle-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#8a9b75" strokeWidth="1.2"/>
            <path d="M4 7 Q7 4 10 7 Q7 10 4 7Z" fill="#8a9b75" opacity="0.7"/>
          </svg>
        </div>
      )}
      <div className="max-w-[76%]">
        {isUser ? (
          <div className="bg-forest text-parchment px-5 py-3 border-0 squircle-xl">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        ) : isError ? (
          <div className="bg-parchment border border-sienna/20 squircle-xl px-5 py-3">
            <p className="text-sm text-sienna font-mono">{msg.content}</p>
          </div>
        ) : (
          <div className="bg-parchment border border-forest/10 squircle-xl px-5 py-4">
            <div className="prose-nootes text-sm text-forest leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !String(children).includes('\n')
                    return isInline ? (
                      <code className="font-mono text-[0.82em] bg-forest/8 border border-forest/15 px-1.5 py-0.5 rounded-md" {...props}>
                        {children}
                      </code>
                    ) : (
                      <CodeBlock language={match?.[1] ?? ''}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    )
                  },
                  p({ children }) { return <p className="mb-3 last:mb-0">{children}</p> },
                  h1({ children }) { return <h1 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-2">{children}</h1> },
                  h2({ children }) { return <h2 className="font-[family-name:var(--font-display)] text-xl text-forest mb-2">{children}</h2> },
                  h3({ children }) { return <h3 className="font-[family-name:var(--font-display)] text-lg text-forest mb-1">{children}</h3> },
                  ul({ children }) { return <ul className="list-none pl-4 mb-3 space-y-1">{children}</ul> },
                  ol({ children }) { return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol> },
                  li({ children, node, ...props }) {
                    const isOrdered = (node as any)?.parent?.tagName === 'ol'
                    return (
                      <li className="flex gap-2 items-start" {...props}>
                        {!isOrdered && <span className="text-sage mt-1 flex-shrink-0">◆</span>}
                        <span>{children}</span>
                      </li>
                    )
                  },
                  blockquote({ children }) { return (
                    <blockquote className="border-l-4 border-sage pl-4 italic text-sienna my-3 bg-forest/4 py-2">{children}</blockquote>
                  )},
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
        <div className="mt-1 px-1">
          <span className="font-mono text-[10px] text-sage/40">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── TYPING INDICATOR ────────────────────────────────────────────────────────
export const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    className="flex items-center gap-3 mb-6"
  >
    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-forest bg-forest squircle-sm">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#8a9b75" strokeWidth="1.2"/>
        <path d="M4 7 Q7 4 10 7 Q7 10 4 7Z" fill="#8a9b75" opacity="0.7"/>
      </svg>
    </div>
    <div className="bg-parchment border border-forest/10 squircle-xl px-5 py-3 flex items-center gap-1.5">
      {[0,1,2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-forest rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  </motion.div>
)

// ─── PARSE GRAPH RESPONSE ────────────────────────────────────────────────────
// Extracts the JSON array and any plain-text summary that follows it.
// Falls back to a text-format parser if the AI doesn't emit valid JSON.

function dedupeItems(parsed: TaskItem[]): TaskItem[] {
  const seen = new Set<string>()
  return parsed.filter(it => {
    if (typeof it.name !== 'string' || seen.has(it.name)) return false
    seen.add(it.name)
    return true
  })
}

// Fallback: parses the text format the AI sometimes emits instead of JSON:
//   Node Name text: "description" depends_on: ["Dep1", "Dep2"]
function parseTextFormat(content: string): { items: TaskItem[]; summary: string } | null {
  // Regex: capture name / text / depends_on from each line
  const re = /^(.+?)\s+text:\s+"((?:[^"\\]|\\.)*)"\s+depends_on:\s+(\[[^\]]*\])/gm
  const items: TaskItem[] = []
  const summaryLines: string[] = []
  let match: RegExpExecArray | null
  const matched = new Set<number>()

  while ((match = re.exec(content)) !== null) {
    matched.add(match.index)
    try {
      const deps = JSON.parse(match[3]) as string[]
      items.push({ name: match[1].trim(), text: match[2], depends_on: deps })
    } catch { /* skip malformed line */ }
  }

  if (items.length === 0) return null

  // Any line not matched by the regex is treated as the summary
  content.split(/\n+/).forEach(line => {
    const t = line.trim()
    if (t && !re.test(t)) summaryLines.push(t)
  })

  return { items: dedupeItems(items), summary: summaryLines.join(' ').trim() }
}

// Normalise AI output before any parsing attempt:
//   1. Strip leading [TAG_LABEL] prefixes (e.g. [BURGER_RECIPE], [GRAPH])
//   2. If the content is bare comma-separated objects (no outer [ ]), wrap them
function normaliseContent(raw: string): { body: string; suffix: string } {
  // Remove any leading [ALL_CAPS_TAG] or [Mixed Tag] prefix
  const stripped = raw.replace(/^\s*\[[A-Z_a-z\s]+\]\s*/g, '').trim()

  // If it starts with '{' the AI forgot the outer array brackets — wrap it
  if (stripped.startsWith('{')) {
    // Find the last '}' that closes the final object
    const lastBrace = stripped.lastIndexOf('}')
    if (lastBrace !== -1) {
      const arrayStr = '[' + stripped.slice(0, lastBrace + 1) + ']'
      const suffix   = stripped.slice(lastBrace + 1).trim()
      return { body: arrayStr, suffix }
    }
  }

  return { body: stripped, suffix: '' }
}

export function parseGraphResponse(content: string): { items: TaskItem[]; summary: string } | null {
  const { body, suffix } = normaliseContent(content)

  // ── Try JSON path first ──────────────────────────────────────────────────
  try {
    const rawStart = body.indexOf('[')
    if (rawStart !== -1) {
      const afterBracket = body.slice(rawStart + 1).trimStart()
      const start = afterBracket.startsWith('{') ? rawStart : body.indexOf('[{')
      const end   = body.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end >= start) {
        const jsonStr = body.slice(start, end + 1).replace(/\/\/[^\n\r]*/g, '')
        const parsed = JSON.parse(jsonStr)
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          typeof parsed[0].name === 'string' &&
          typeof parsed[0].text === 'string'
        ) {
          const items = dedupeItems(parsed as TaskItem[])
          if (items.length > 0) {
            const summary = (suffix || body.slice(end + 1)).trim()
            return { items, summary }
          }
        }
      }
    }
  } catch { /* fall through to text parser */ }

  // ── Fallback: plain-text node format ────────────────────────────────────
  return parseTextFormat(content)
}

// ─── EXPAND TASK ─────────────────────────────────────────────────────────────
// Defined inside App (see below) so it can close over historyRef.

// ─── QUERY NODE ──────────────────────────────────────────────────────────────
// Defined inside App (see below) so it can close over historyRef.

// ─── GRAPH MESSAGE ───────────────────────────────────────────────────────────
export const GraphMessage = ({ msg, items, summary, onExpand, onQuery }: { msg: Message; items: TaskItem[]; summary: string; onExpand: ExpandFn; onQuery: QueryFn }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className="mb-6"
  >
    {/* Minimal label row */}
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 border-forest bg-forest squircle-sm">
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="#8a9b75" strokeWidth="1.2"/>
          <path d="M4 7 Q7 4 10 7 Q7 10 4 7Z" fill="#8a9b75" opacity="0.7"/>
        </svg>
      </div>
      <span className="font-mono text-[10px] text-sage uppercase tracking-widest">
        {items.length} tasks · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className="flex-1 h-px bg-sage/30"/>
    </div>
    {/* Graph container */}
    <div
      className="border border-forest/10 squircle-xl overflow-hidden"
      style={{ height: 420 }}
    >
      <GraphView key={msg.id} items={items} onExpand={onExpand} onQuery={onQuery} />
    </div>
    {/* Summary */}
    {summary && (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        className="mt-3 border-l-4 border-sage bg-parchment squircle-sm px-4 py-3"
      >
        <p className="font-mono text-[10px] text-sage uppercase tracking-widest mb-1.5">summary</p>
        <p className="text-sm text-forest leading-relaxed">{summary}</p>
      </motion.div>
    )}
  </motion.div>
)



/** Produce a compact, varied blurb for an assistant message in the conversation drawer.
 *  Falls back gracefully when the message isn't a graph response. */
function assistantBlurb(content: string): string {
  const parsed = parseGraphResponse(content)
  if (!parsed) {
    // Plain text response — truncate cleanly at a sentence boundary
    const trimmed = content.trim()
    if (trimmed.length <= 120) return trimmed
    const cut = trimmed.slice(0, 120)
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    return lastStop > 40 ? cut.slice(0, lastStop + 1) : cut + '…'
  }

  const { items, summary } = parsed
  const count = items.length

  // Node-count prefix — varies the personality
  const prefix =
    count <= 3  ? `${count} steps mapped.` :
    count <= 6  ? `Broken into ${count} tasks.` :
    count <= 12 ? `${count}-node plan ready.` :
                  `${count} nodes across the graph.`

  if (!summary) return prefix

  // Vary summary display by length
  if (summary.length <= 90) return `${prefix} ${summary}`

  // Extract first sentence for longer summaries
  const stop = summary.search(/[.!?](\s|$)/)
  const firstSentence = stop > 0 ? summary.slice(0, stop + 1) : summary.slice(0, 90) + '…'
  return `${prefix} ${firstSentence}`
}

const EXAMPLES = [
  { label: 'Build a todo app', icon: '◈', prompt: 'Build a full-stack todo app with React frontend, Node.js API, and PostgreSQL database.' },
  { label: 'Launch a SaaS product', icon: '◉', prompt: 'Plan the launch of a SaaS product for project management targeting small teams.' },
  { label: 'Design a REST API', icon: '⟨⟩', prompt: 'Design a REST API for a social media platform with users, posts, comments, and likes.' },
  { label: 'Set up CI/CD pipeline', icon: '∿', prompt: 'Set up a CI/CD pipeline for a monorepo with frontend and backend services using GitHub Actions.' },
]

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const persistence = useGraphPersistence()
  const history = useGraphHistory()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pendingCenter, setPendingCenter] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  // Track latest prompt + summary so onGraphChanged can use them for the first save
  const latestPromptRef  = useRef('')
  const latestSummaryRef = useRef('')

  // ── expandTask: closed over historyRef so it can include top-level prompt
  //    and follow-up user prompts as context for the expansion call.
  const expandTask = useCallback(async (
    item: TaskItem,
    context: string,
    ancestors: TaskItem[],
  ): Promise<{ items: TaskItem[]; summary: string }> => {
    const allMessages = historyRef.current
    const userMessages = allMessages.filter(m => m.role === 'user')
    const topLevelPrompt = userMessages[0]?.content ?? ''
    const followUpPrompts = userMessages.slice(1).map(m => m.content)

    let prompt = `other context: Top-level goal: ${topLevelPrompt}`

    if (followUpPrompts.length > 0) {
      prompt += `\n\nother context: Follow-up context from user:\n${followUpPrompts.map(p => `- ${p}`).join('\n')}`
    }

    if (ancestors.length > 0) {
      prompt += `\n\nother context: Ancestor task chain (root → parent):\n${ancestors.map((a, i) => `${i + 1}. ${a.name}: ${a.text}`).join('\n')}`
    }

    prompt += `\n\ncurrent node title: ${item.name}: ${item.text}`

    if (context) {
      prompt += `\n\nother context: ${context}`
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    const content: string = data.content ?? ''
    const parsed = parseGraphResponse(content)
    if (!parsed) throw new Error('Could not parse expansion response')
    return parsed
  }, [])

  // ── queryNode: closed over historyRef so explanations have full graph context
  const queryNode = useCallback(async (
    item: TaskItem,
    question: string,
    ancestors: TaskItem[],
  ): Promise<string> => {
    const userMessages = historyRef.current.filter(m => m.role === 'user')
    const topLevelPrompt = userMessages[0]?.content ?? ''

    let context = `Topic: ${topLevelPrompt}`
    if (ancestors.length > 0) {
      context += `\nPath: ${ancestors.map(a => a.name).join(' → ')}`
    }
    context += `\nNode: ${item.name} — ${item.text}`
    if (question) context += `\nQuestion: ${question}`

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_SIMPLE },
          { role: 'user', content: context },
        ],
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    return data.content?.trim() ?? 'No response.'
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages, loading])

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [])

  useEffect(() => { autoResize() }, [input, autoResize])

  const sendPrompt = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Show the center node immediately in the graph canvas
    const blurb = text.trim().split(/\s+/).slice(0, 8).join(' ') + (text.trim().split(/\s+/).length > 8 ? '…' : '')
    setPendingCenter(blurb)

    // Capture prompt for persistence metadata
    latestPromptRef.current = text.trim()

    historyRef.current = [...historyRef.current, { role: 'user', content: text.trim() }]

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyRef.current,
          ],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      const content: string = data.content ?? JSON.stringify(data, null, 2)
      historyRef.current = [...historyRef.current, { role: 'assistant', content }]

      // Capture summary for persistence metadata
      const parsed = parseGraphResponse(content)
      if (parsed) {
        latestSummaryRef.current = parsed.summary
        // Save immediately — don't wait for GraphView's useEffect
        persistence.saveItems(parsed.items, {
          title:   text.trim().slice(0, 60),
          summary: parsed.summary,
          prompt:  text.trim(),
        })
        // Refresh history list so it shows the new graph
        history.refresh()
      }

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content, timestamp: new Date() }])
    } catch (err) {
      // Keep user message in historyRef so UI and conversation context stay in sync
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'error',
        content: `⚠ ${err instanceof Error ? err.message : 'Failed to reach API'}`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
      setPendingCenter(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendPrompt(input)
    }
  }

  const isEmpty = messages.length === 0

  // Persist graph whenever GraphView reports a change (expand, manual node)
  const handleGraphChanged = useCallback((nodes: Node[], edges: Edge[]) => {
    if (!user) return
    persistence.upsert(nodes, edges, {
      title:   latestPromptRef.current.slice(0, 60) || 'Untitled Graph',
      summary: latestSummaryRef.current,
      prompt:  latestPromptRef.current,
    })
  }, [user, persistence.upsert])

  // Load a graph from history by injecting a synthetic assistant message
  const handleLoadFromHistory = useCallback((item: ReturnType<typeof useGraphHistory>['graphs'][number]) => {
    const items = rawNodesToItems(item.rawNodes, item.rawEdges)
    const fakeContent = JSON.stringify(items) + '\n\n' + (item.summary ?? '')
    latestPromptRef.current  = item.title
    latestSummaryRef.current = item.summary
    historyRef.current = []
    setMessages([{
      id:        item.graphId,
      role:      'assistant',
      content:   fakeContent,
      timestamp: new Date(item.updatedAt),
    }])
    persistence.loadGraph(item.graphId, item.versionNum)
    setActiveTab('new')
  }, [persistence.loadGraph])

  // Most recent graph response in the conversation
  const latestGraph = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const parsed = parseGraphResponse(messages[i].content)
        if (parsed) return { id: messages[i].id, ...parsed }
      }
    }
    return null
  }, [messages])

  // ── Export graph as a new personal note ────────────────────────────────────
  const exportToNote = useCallback(async () => {
    if (!user) return
    setExporting(true)
    try {
      const userPrompt = messages.find(m => m.role === 'user')?.content ?? 'Graph Notes'
      const firstGraph = messages.find(m => m.role === 'assistant' && parseGraphResponse(m.content) !== null)
      const title = (firstGraph ? parseGraphResponse(firstGraph.content)?.summary : null) || userPrompt
      const blocks: { id: string; type: string; content: string; meta?: Record<string, unknown> }[] = []

      for (const msg of messages) {
        if (msg.role !== 'assistant') continue
        const parsed = parseGraphResponse(msg.content)
        if (!parsed) continue

        if (parsed.summary) {
          blocks.push({ id: crypto.randomUUID(), type: 'callout', content: parsed.summary, meta: { calloutType: 'info' } })
        }
        for (const item of parsed.items) {
          blocks.push({ id: crypto.randomUUID(), type: 'h2', content: item.name })
          if (item.text) {
            blocks.push({ id: crypto.randomUUID(), type: 'paragraph', content: item.text })
          }
        }
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({ owner_user_id: user.id, title, blocks, access_level: 'private', is_public_root: false })
        .select('id')
        .single()

      if (error) throw error
      navigate(`/editor/${data.id}`, { state: { name: title } })
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }, [messages, user, navigate])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-cream">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <Navbar variant="light" />

      {/* ── Control bar ────────────────────────────────────────────────────── */}
      <div className="border-b border-forest/[0.08] bg-cream px-6 py-2.5 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
          <span className="font-mono text-[10px] text-forest/30 tracking-wider">gpt-4o</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToNote} disabled={isEmpty || exporting}
            className="font-mono text-[10px] px-3 py-1.5 squircle-sm border border-forest/15 text-forest/40 hover:text-forest hover:border-forest/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5">
            {exporting ? '…' : '↓'} export as note
          </button>
          <button onClick={() => { setMessages([]); historyRef.current = []; persistence.reset(); history.refresh(); setActiveTab('history') }} disabled={isEmpty}
            className="font-mono text-[10px] px-3 py-1.5 squircle-sm border border-forest/15 text-forest/40 hover:text-forest hover:border-forest/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
            clear
          </button>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className={`flex-1 min-h-0 flex flex-col relative ${isEmpty ? 'overflow-y-auto' : 'overflow-hidden'}`}>

        {isEmpty ? (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-10 right-16"><Doodle /></div>
              <div className="absolute bottom-32 left-10"><LeafDoodle /></div>
              <div className="absolute top-1/2 right-8 -translate-y-1/2"><GridDoodle /></div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-4 relative z-10"
            >
              {/* ── Tab bar ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex items-center gap-0 mb-10 border border-forest/15 bg-parchment squircle overflow-hidden"
              >
                {(['new', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 font-mono text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-forest text-parchment'
                        : 'text-forest/40 hover:text-forest hover:bg-forest/5'
                    }`}
                  >
                    {tab === 'new' ? '◈ new' : '◉ history'}
                  </button>
                ))}
              </motion.div>

              <AnimatePresence mode="wait">
                {activeTab === 'new' ? (
                  /* ── New graph panel ── */
                  <motion.div
                    key="new"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center w-full"
                  >
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-10">
                      <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest mb-2">what are you building?</h2>
                      <p className="text-sienna text-sm max-w-sm mx-auto leading-relaxed">
                        Describe your idea or project — get an instant actionable breakdown rendered as an interactive graph.
                      </p>
                    </motion.div>
                    <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                      {EXAMPLES.map((ex, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                          onClick={() => sendPrompt(ex.prompt)}
                          className="text-left p-4 border border-sage/30 bg-parchment hover:bg-forest hover:border-forest squircle group transition-all duration-200 cursor-pointer"
                        >
                          <span className="text-xs text-forest group-hover:text-parchment leading-snug">{ex.label}</span>
                        </motion.button>
                      ))}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                      className="mt-10 border border-sage/30 bg-parchment/60 squircle-xl px-6 py-4 max-w-sm text-center"
                    >
                      <p className="font-mono text-[11px] text-sage uppercase tracking-widest mb-2">renders as interactive graph</p>
                      <div className="text-forest text-xs leading-relaxed">
                        Each subtask becomes a <span className="font-mono bg-forest/8 border border-forest/15 px-1.5 py-0.5">clickable node</span> — click any node to read its full description.
                      </div>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* ── History panel ── */
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-lg"
                  >
                    {history.loading ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-forest/30">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-6 h-6 border-2 border-forest/15 border-t-sage rounded-full"
                        />
                        <span className="font-mono text-[10px] uppercase tracking-widest">loading history…</span>
                      </div>
                    ) : history.graphs.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="font-[family-name:var(--font-display)] text-2xl text-forest/30 mb-2">no graphs yet</div>
                        <p className="font-mono text-[11px] text-forest/25 uppercase tracking-widest">generate your first graph to see it here</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {history.graphs.map((g, i) => (
                          <motion.button
                            key={g.graphId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleLoadFromHistory(g)}
                            className="w-full text-left border border-forest/10 bg-parchment hover:border-sage/50 hover:bg-parchment squircle px-4 py-3 group transition-all duration-150 cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <span className="font-[family-name:var(--font-display)] text-sm text-forest leading-snug line-clamp-1 group-hover:text-forest">
                                {g.title}
                              </span>
                              <span className="font-mono text-[9px] text-sage/50 uppercase tracking-widest flex-shrink-0 mt-0.5 border border-sage/20 px-1.5 py-0.5 squircle-sm">
                                v{g.versionNum}
                              </span>
                            </div>
                            {g.summary && (
                              <p className="text-xs text-forest/50 leading-relaxed line-clamp-2 mb-2">{g.summary}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[9px] text-sage/60">◆ {g.nodeCount} nodes</span>
                              <span className="font-mono text-[9px] text-forest/25">·</span>
                              <span className="font-mono text-[9px] text-forest/30">
                                {new Date(g.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        ) : (
          /* ── Graph fills the page ────────────────────────────────────────── */
          <>
            {/* Full-height graph canvas */}
            <div className="flex-1 relative overflow-hidden min-h-0">
              <AnimatePresence mode="wait">
                {latestGraph ? (
                  <motion.div
                    key={latestGraph.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                  >
                    <GraphView items={latestGraph.items} onExpand={expandTask} onQuery={queryNode} onGraphChanged={handleGraphChanged} />
                  </motion.div>
                ) : (
                  /* Waiting for first graph response — show animated center node */
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'transparent' }}
                  >
                    {/* Dot-grid background */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
                      <defs>
                        <pattern id="dotgrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                          <circle cx="1.2" cy="1.2" r="1.2" fill="#264635"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#dotgrid)"/>
                    </svg>

                    <div className="flex flex-col items-center gap-6 relative z-10">
                      {/* Centre node */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                        style={{ position: 'relative' }}
                      >
                        {/* Outer pulse ring */}
                        <motion.div
                          animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', inset: -12, borderRadius: '50%',
                            border: '1.5px solid #A3B18A',
                          }}
                        />
                        {/* Main circle */}
                        <div style={{
                          width: 120, height: 120, borderRadius: '50%',
                          background: '#E9E4D4',
                          border: '3px solid #264635',
                          boxShadow: '0 0 0 8px rgba(163,177,138,0.18), 4px 4px 0 rgba(38,70,53,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          <div style={{
                            position: 'absolute', inset: 10, borderRadius: '50%',
                            border: '1px dashed #264635', opacity: 0.2,
                          }} />
                          <div style={{
                            fontFamily: "'Gamja Flower', cursive",
                            fontSize: 12, color: '#264635', textAlign: 'center',
                            padding: '0 12px', lineHeight: 1.3,
                          }}>
                            {pendingCenter ?? '…'}
                          </div>
                        </div>
                      </motion.div>

                      {/* Spoke stubs radiating out */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                          <motion.div
                            key={deg}
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 0.2, scaleX: 1 }}
                            transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                            style={{
                              position: 'absolute',
                              width: 90, height: 1.5,
                              background: '#A3B18A',
                              transformOrigin: 'left center',
                              transform: `rotate(${deg}deg)`,
                              left: '50%', top: '50%',
                              marginTop: -0.75,
                            }}
                          />
                        ))}
                      </div>

                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="font-mono text-[10px] text-forest/30 uppercase tracking-widest"
                      >
                        building graph…
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History toggle button */}
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="absolute top-3 left-3 z-20 flex items-center gap-1.5 font-mono text-[10px] text-forest/40 uppercase tracking-widest border border-forest/15 bg-cream/90 backdrop-blur-sm squircle-sm px-2.5 py-1.5 hover:text-forest hover:border-forest/30 transition-all cursor-pointer"
                aria-label="Toggle conversation history"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="1" width="8" height="2" rx="0.5" fill="currentColor"/>
                  <rect x="1" y="4.5" width="5" height="2" rx="0.5" fill="currentColor"/>
                  <rect x="1" y="8" width="7" height="1.5" rx="0.5" fill="currentColor"/>
                </svg>
                history ({messages.length})
              </button>

              {/* History drawer */}
              <AnimatePresence>
                {historyOpen && (
                  <motion.div
                    initial={{ x: -320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -320, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-0 left-0 bottom-0 z-10 w-80 bg-cream/96 backdrop-blur-sm border-r border-forest/10 flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-forest/20 flex-shrink-0 bg-forest">
                      <span className="font-mono text-[10px] text-sage/60 uppercase tracking-widest">conversation</span>
                      <button onClick={() => setHistoryOpen(false)} aria-label="Close history" className="text-sage/60 hover:text-parchment transition-colors cursor-pointer text-sm">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map(msg => (
                        <div key={msg.id} className={`text-xs px-3 py-2 ${
                          msg.role === 'user' ? 'bg-forest text-parchment ml-4 squircle-sm' :
                          msg.role === 'error' ? 'bg-parchment border border-sienna/30 text-sienna squircle-sm' :
                          'bg-parchment border border-forest/10 text-forest mr-4 squircle-sm'
                        }`}>
                          <div className="font-mono text-[9px] opacity-60 mb-1 uppercase tracking-widest">
                            {msg.role} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {msg.role === 'assistant' ? (() => {
                            const blurb = assistantBlurb(msg.content)
                            const sizeClass =
                              blurb.length <= 40  ? 'text-sm font-[family-name:var(--font-display)] leading-snug' :
                              blurb.length <= 80  ? 'text-xs leading-relaxed' :
                                                    'text-[10px] leading-relaxed opacity-80'
                            return <p className={`${sizeClass} line-clamp-3`}>{blurb}</p>
                          })() : (
                            <p className="text-xs leading-relaxed line-clamp-3">
                              {msg.content.slice(0, 200) + (msg.content.length > 200 ? '…' : '')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Summary bar — pinned above input */}
            <AnimatePresence>
              {latestGraph?.summary && (
                <motion.div
                  key={latestGraph.id + '-summary'}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-shrink-0 border-t border-forest/[0.08] bg-parchment/90 backdrop-blur-sm px-6 py-3 flex items-start gap-4 relative z-10"
                >
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sage"/>
                    <span className="font-mono text-[9px] text-sage/50 uppercase tracking-[0.14em]">summary</span>
                  </div>
                  <p className="text-xs text-forest/60 leading-relaxed flex-1 line-clamp-2">
                    {latestGraph.summary}
                  </p>
                  {/* Node count badge */}
                  <span className="font-mono text-[9px] text-forest/30 border border-forest/15 squircle-sm px-2 py-0.5 flex-shrink-0 mt-0.5">
                    {latestGraph.items.length} nodes
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

      </main>

      {/* ── Input bar — always visible, outside main ────────────────────────── */}
      <div className="border-t border-forest/[0.08] bg-cream/90 backdrop-blur-sm px-4 py-4 flex-shrink-0 relative z-20">
        <div className="max-w-3xl mx-auto">
          <div className="border border-forest/15 bg-parchment squircle-xl flex items-end gap-0 focus-within:border-sage/40 focus-within:ring-2 focus-within:ring-sage/10 transition-colors overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={2000}
              placeholder={isEmpty ? "Describe your project or idea…" : "Ask a follow-up or drill deeper…"}
              className="flex-1 bg-transparent px-4 py-3.5 text-sm text-forest/80 placeholder:text-forest/25 resize-none outline-none leading-relaxed disabled:opacity-60"
              style={{ fontFamily: 'inherit', minHeight: 52, maxHeight: 200 }}
            />
            <div className="flex flex-col items-center justify-end pb-2.5 pr-3 gap-2 flex-shrink-0">
              <button
                onClick={() => sendPrompt(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-forest hover:bg-forest/80 disabled:opacity-30 disabled:cursor-not-allowed squircle-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-forest/20 border-t-sage rounded-full"
                  />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 12 L12 7 L2 2 L4 7 L2 12Z" fill="#E9E4D4"/>
                    <path d="M4 7 L12 7" stroke="#E9E4D4" strokeWidth="1.2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="font-mono text-[10px] text-forest/20">shift+enter for newline · enter to send</span>
            <span className={`font-mono text-[10px] transition-colors ${input.length > 1800 ? 'text-sienna' : 'text-forest/25'}`}>
              {input.length}/2000
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

