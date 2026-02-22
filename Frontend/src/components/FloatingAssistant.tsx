import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NootMarkdown } from './NootMarkdown'

/* ------------------------------------------------------------------ */
/* FloatingAssistant                                                    */
/* Circular FAB (bottom-left) that expands into a compact chat panel   */
/* Appears on all authenticated pages except /home                     */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const PAGE_GREETINGS: Record<string, string> = {
  '/editor': "Hey — working on some notes? Ask me anything about this document.",
  '/diff': "I can help you understand what changed between these versions.",
  '/repos': "Looking for something specific? I can find the right nootbook for you.",
  '/my-repos': "Looking for something specific? I can find the right nootbook for you.",
}

function getGreeting(pathname: string, firstName: string): string {
  // Check exact match first, then prefix match for dynamic routes
  if (PAGE_GREETINGS[pathname]) return PAGE_GREETINGS[pathname]
  if (pathname.startsWith('/editor/')) return PAGE_GREETINGS['/editor']
  return `Hi ${firstName} ✦ What can I help you with?`
}

export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const { profile } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const greetedForPath = useRef<string | null>(null)

  const firstName = (profile?.display_name ?? 'there').split(' ')[0]

  // Inject contextual greeting when panel opens on a new page
  useEffect(() => {
    if (open && greetedForPath.current !== location.pathname) {
      greetedForPath.current = location.pathname
      const greeting = getGreeting(location.pathname, firstName)
      setMessages([{ id: 'greeting', role: 'assistant', content: greeting }])
    }
  }, [open, location.pathname, firstName])

  // Reset on page navigation so next open greets fresh
  useEffect(() => {
    greetedForPath.current = null
    if (!open) setMessages([])
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll + focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const id = crypto.randomUUID()
    setMessages(prev => [...prev, { id, role: 'user', content: text }])
    setLoading(true)
    try {
      // Prepend NO GRAPH so the popup always gets readable markdown, not raw JSON
      const res = await fetch('/api/noot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `[NO GRAPH — respond in plain text with markdown] ${text}` }],
        }),
      })
      const data = await res.json()
      const reply = data.content ?? data.detail ?? 'No response.'
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Could not reach AI. Check your connection.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* ── Chat panel ───────────────────────────────────────── */}
      {open && (
        <div
          className="bg-cream border border-forest/10 squircle-xl shadow-[0_12px_48px_-8px_rgba(26,47,38,0.28)] flex flex-col animate-fade-up overflow-hidden"
          style={{ width: 320, height: 400 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-forest/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sage text-base animate-pulse-soft" style={{ animationDuration: '2s' }}>✦</span>
              <span className="font-[family-name:var(--font-display)] text-base text-forest">nootes AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-forest/25 hover:text-forest/60 transition-colors text-xl leading-none cursor-pointer"
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-forest text-parchment squircle-sm font-[family-name:var(--font-body)] whitespace-pre-wrap'
                      : 'bg-parchment border border-forest/10 squircle-sm font-[family-name:var(--font-body)] text-forest/80'
                  }`}
                >
                  {msg.role === 'user'
                    ? msg.content
                    : <NootMarkdown compact>{msg.content}</NootMarkdown>
                  }
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-parchment border border-forest/10 squircle-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-sage/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-3 py-3 border-t border-forest/10 shrink-0">
            <div className="flex items-center gap-2 bg-parchment border border-forest/10 squircle-sm px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !loading) sendMessage() }}
                placeholder="Ask about your nootes..."
                className="flex-1 bg-transparent text-xs text-forest placeholder:text-forest/30 outline-none font-[family-name:var(--font-body)]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-forest squircle-sm flex items-center justify-center text-parchment hover:bg-forest-deep transition-colors disabled:opacity-30 shrink-0 cursor-pointer"
                aria-label="Send"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB button ───────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-forest flex items-center justify-center
          shadow-[0_4px_24px_-4px_rgba(26,47,38,0.45)]
          hover:scale-110 hover:shadow-[0_8px_32px_-4px_rgba(26,47,38,0.55)]
          transition-all duration-200 cursor-pointer"
        aria-label="Open AI assistant"
      >
        <span
          className="text-parchment text-xl select-none animate-pulse-soft"
          style={{ animationDuration: '2s' }}
        >
          ✦
        </span>
      </button>
    </div>
  )
}
