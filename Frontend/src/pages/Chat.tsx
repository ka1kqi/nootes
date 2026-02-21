import { useState, useRef, useEffect, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { useChannels } from '../hooks/useChat'
import { useMessages } from '../hooks/useChat'
import { useSendMessage } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Message, Reaction } from '../lib/supabase'

/* ------------------------------------------------------------------ */
/* Chat Page                                                           */
/* Persistent chat organized by school / major / repository            */
/* Supports LaTeX in messages, threading, aura badges                  */
/* ------------------------------------------------------------------ */

type ChannelType = 'school' | 'major' | 'repo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function tierColor(tier: string): string {
  const map: Record<string, string> = {
    'seedling': 'bg-forest/20',
    'sprout': 'bg-sage/30',
    'sapling': 'bg-sage/50',
    'grove': 'bg-forest/60',
    'ancient-oak': 'bg-amber/50',
  }
  return map[tier] || map.seedling
}

const AVATAR_COLORS = [
  '#264635', '#A3B18A', '#8B6E4E', '#5C7A6B', '#D4A843',
  '#4A6741', '#8B4513', '#1a2f26',
]
function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function groupReactions(reactions: Reaction[]): { emoji: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const r of reactions) {
    map[r.emoji] = (map[r.emoji] ?? 0) + 1
  }
  return Object.entries(map).map(([emoji, count]) => ({ emoji, count }))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineLatexChat({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <KaTeX key={i} math={part.slice(1, -1)} className="text-sm inline" />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

function ChannelIcon({ type }: { type: ChannelType }) {
  if (type === 'school') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
  if (type === 'major') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

// Inline reaction toggle button (keeps design, talks to Supabase)
function ReactionButton({
  emoji,
  count,
  messageId,
  userId,
}: {
  emoji: string
  count: number
  messageId: string
  userId: string | undefined
}) {
  const [localCount, setLocalCount] = useState(count)

  const handleToggle = useCallback(async () => {
    if (!userId) return
    // Check if user already reacted
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
      setLocalCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji })
      setLocalCount(c => c + 1)
    }
  }, [messageId, userId, emoji])

  if (localCount === 0) return null
  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1 bg-forest/[0.04] hover:bg-forest/[0.08] border border-forest/[0.06] squircle-sm px-2 py-0.5 transition-colors"
    >
      <span className="text-xs">{emoji}</span>
      <span className="font-mono text-[10px] text-forest/40">{localCount}</span>
    </button>
  )
}

// Thread reply count — reads from Supabase once
function ThreadCount({ messageId }: { messageId: string }) {
  const [count, setCount] = useState<number | null>(null)
  const [lastReply, setLastReply] = useState<string>('')

  useEffect(() => {
    supabase
      .from('messages')
      .select('created_at')
      .eq('thread_id', messageId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCount(data?.length ?? 0)
        if (data?.[0]) setLastReply(formatTime(data[0].created_at))
      })
  }, [messageId])

  if (!count) return null
  return (
    <button className="flex items-center gap-2 mt-2 text-sage hover:text-forest transition-colors group/thread">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.28 48.28 0 005.557-.885c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
      <span className="font-mono text-[10px] group-hover/thread:underline">{count} replies</span>
      {lastReply && <span className="font-mono text-[9px] text-forest/20">last at {lastReply}</span>}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Chat() {
  const { user, profile } = useAuth()
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { channels, loading: channelsLoading } = useChannels()
  const { messages, loading: messagesLoading, bottomRef } = useMessages(activeChannel)
  const { sendMessage, sending } = useSendMessage()

  // Auto-select first channel once loaded
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      setActiveChannel(channels[0].id)
    }
  }, [channels, activeChannel])

  // Scroll to bottom when channel changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannel])

  const activeChannelData = channels.find(c => c.id === activeChannel)

  const groupedChannels = {
    school: channels.filter(c => c.type === 'school'),
    major: channels.filter(c => c.type === 'major'),
    repo: channels.filter(c => c.type === 'repo'),
  }

  async function handleSend() {
    if (!activeChannel || !messageText.trim()) return
    const isLatex = messageText.includes('$')
    await sendMessage(activeChannel, messageText, isLatex)
    setMessageText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Map a Supabase Message to render-ready shape
  function msgToView(msg: Message) {
    const p = msg.profile
    const displayName = p?.display_name ?? 'Student'
    const initials = getInitials(displayName)
    const color = colorForId(msg.user_id)
    const aura = p?.aura ?? 0
    const tier = p?.tier ?? 'seedling'
    const badges = p?.badges ?? []
    const reactions = groupReactions(msg.reactions ?? [])
    const time = formatTime(msg.created_at)
    return { displayName, initials, color, aura, tier, badges, reactions, time }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col animate-fade-up">
      <Navbar
        variant="light"
        breadcrumbs={[
          { label: 'Chat' },
          ...(activeChannelData ? [{ label: activeChannelData.name }] : []),
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Channel sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-14' : 'w-64'} border-r border-forest/[0.08] bg-cream flex flex-col shrink-0 transition-all duration-200`}>
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-forest/[0.06] flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase">Channels</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-7 h-7 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto py-2">
            {channelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border border-sage/30 border-t-sage rounded-full animate-spin" />
              </div>
            ) : !sidebarCollapsed ? (
              <>
                {(['school', 'major', 'repo'] as const).map(type => (
                  groupedChannels[type].length > 0 && (
                    <div key={type} className="mb-4">
                      <span className="font-mono text-[8px] text-forest/20 tracking-[0.3em] uppercase px-4 block mb-1.5">
                        {type === 'school' ? 'SCHOOL' : type === 'major' ? 'DEPARTMENTS' : 'NOOTBOOKS'}
                      </span>
                      {groupedChannels[type].map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => setActiveChannel(channel.id)}
                          className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition-all ${
                            activeChannel === channel.id
                              ? 'bg-forest/[0.06] text-forest'
                              : 'text-forest/40 hover:bg-forest/[0.03] hover:text-forest/70'
                          }`}
                        >
                          <span className={`shrink-0 ${activeChannel === channel.id ? 'text-sage' : 'text-forest/25'}`}>
                            <ChannelIcon type={channel.type as ChannelType} />
                          </span>
                          <span className="font-[family-name:var(--font-body)] text-xs truncate flex-1">{channel.name}</span>
                          {channel.unread > 0 && (
                            <span className="w-5 h-5 bg-sage text-parchment font-mono text-[9px] rounded-full flex items-center justify-center shrink-0">
                              {channel.unread}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 pt-1">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    title={channel.name}
                    className={`w-9 h-9 flex items-center justify-center squircle-sm transition-all relative ${
                      activeChannel === channel.id
                        ? 'bg-forest/[0.08] text-sage'
                        : 'text-forest/25 hover:bg-forest/[0.04] hover:text-forest/50'
                    }`}
                  >
                    <ChannelIcon type={channel.type as ChannelType} />
                    {channel.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-sage rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User status */}
          {!sidebarCollapsed && profile && (
            <div className="px-4 py-3 border-t border-forest/[0.06]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-parchment font-medium relative"
                  style={{ backgroundColor: colorForId(user?.id ?? '') }}
                >
                  {getInitials(profile.display_name)}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sage rounded-full border-2 border-cream" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 block truncate">{profile.display_name}</span>
                  <span className="font-mono text-[9px] text-sage/50">{profile.aura.toLocaleString()} ✦</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="border-b border-forest/[0.08] bg-cream px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sage/50">
                <ChannelIcon type={(activeChannelData?.type ?? 'repo') as ChannelType} />
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-forest">{activeChannelData?.name ?? '…'}</h2>
                <span className="font-mono text-[10px] text-forest/25">{activeChannelData?.members ?? 0} members</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all" title="Search">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all" title="Members">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-forest/30 hover:text-forest/60 hover:bg-forest/[0.04] squircle-sm transition-all" title="Pin">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Date divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-forest/[0.06]" />
              <span className="font-mono text-[10px] text-forest/20 tracking-wider">Today</span>
              <div className="flex-1 h-px bg-forest/[0.06]" />
            </div>

            {messagesLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
                  <span className="font-mono text-[10px] text-forest/25 tracking-[0.2em] uppercase">Loading messages</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-[family-name:var(--font-display)] text-2xl text-forest/20 mb-2">no messages yet</p>
                <p className="font-[family-name:var(--font-body)] text-sm text-forest/30">Be the first to say something!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, idx) => {
                  const prevMsg = idx > 0 ? messages[idx - 1] : null
                  const isGrouped = prevMsg?.user_id === msg.user_id &&
                    Math.abs(new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 5 * 60_000
                  const { displayName, initials, color, aura, tier, badges, reactions, time } = msgToView(msg)

                  return (
                    <div
                      key={msg.id}
                      className={`group hover:bg-forest/[0.02] rounded-lg px-3 py-1.5 transition-colors ${!isGrouped ? 'mt-3' : ''}`}
                    >
                      {!isGrouped ? (
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] text-parchment font-medium shrink-0 mt-0.5"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Author line */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-[family-name:var(--font-body)] text-sm text-forest font-medium">{displayName}</span>
                              {badges.map((b, bi) => (
                                <span key={bi} className="text-xs">{b}</span>
                              ))}
                              <span className={`w-2 h-2 rounded-full ${tierColor(tier)}`} title={`${tier} · ${aura} aura`} />
                              <span className="font-mono text-[9px] text-sage/40">{aura} ✦</span>
                              <span className="font-mono text-[10px] text-forest/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{time}</span>
                            </div>

                            {/* Message content */}
                            <div className="font-[family-name:var(--font-body)] text-[14px] text-forest/70 leading-relaxed whitespace-pre-wrap">
                              {msg.is_latex ? (
                                msg.content.split('\n').map((line, li) => (
                                  <span key={li}>
                                    {li > 0 && <br />}
                                    <InlineLatexChat text={line} />
                                  </span>
                                ))
                              ) : (
                                msg.content
                              )}
                            </div>

                            {/* Reactions */}
                            {reactions.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2">
                                {reactions.map((r, ri) => (
                                  <ReactionButton
                                    key={ri}
                                    emoji={r.emoji}
                                    count={r.count}
                                    messageId={msg.id}
                                    userId={user?.id}
                                  />
                                ))}
                                <button className="w-6 h-6 flex items-center justify-center text-forest/15 hover:text-forest/40 hover:bg-forest/[0.04] squircle-sm transition-all opacity-0 group-hover:opacity-100">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </button>
                              </div>
                            )}

                            {/* Thread indicator */}
                            <ThreadCount messageId={msg.id} />
                          </div>
                        </div>
                      ) : (
                        /* Grouped message — no avatar */
                        <div className="pl-12">
                          <div className="font-[family-name:var(--font-body)] text-[14px] text-forest/70 leading-relaxed whitespace-pre-wrap">
                            {msg.is_latex ? (
                              msg.content.split('\n').map((line, li) => (
                                <span key={li}>
                                  {li > 0 && <br />}
                                  <InlineLatexChat text={line} />
                                </span>
                              ))
                            ) : (
                              msg.content
                            )}
                          </div>
                          {reactions.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {reactions.map((r, ri) => (
                                <ReactionButton
                                  key={ri}
                                  emoji={r.emoji}
                                  count={r.count}
                                  messageId={msg.id}
                                  userId={user?.id}
                                />
                              ))}
                            </div>
                          )}
                          <ThreadCount messageId={msg.id} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div ref={bottomRef} />
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="border-t border-forest/[0.08] bg-cream px-6 py-4">
            <div className="bg-parchment border border-forest/10 squircle-xl overflow-hidden focus-within:border-sage/40 focus-within:ring-2 focus-within:ring-sage/10 transition-all">
              <div className="flex items-center gap-2 px-4 py-3">
                {/* Formatting buttons */}
                <button className="w-7 h-7 flex items-center justify-center text-forest/25 hover:text-forest/50 hover:bg-forest/[0.04] squircle-sm transition-all" title="LaTeX">
                  <span className="font-mono text-[10px]">Σ</span>
                </button>
                <button className="w-7 h-7 flex items-center justify-center text-forest/25 hover:text-forest/50 hover:bg-forest/[0.04] squircle-sm transition-all" title="Code">
                  <span className="font-mono text-[10px]">&lt;&gt;</span>
                </button>
                <button className="w-7 h-7 flex items-center justify-center text-forest/25 hover:text-forest/50 hover:bg-forest/[0.04] squircle-sm transition-all" title="Bold">
                  <span className="font-mono text-[10px] font-bold">B</span>
                </button>
                <div className="w-px h-4 bg-forest/10" />
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannelData?.name ?? 'channel'}… (use $…$ for LaTeX)`}
                  className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className={`w-8 h-8 flex items-center justify-center squircle-sm transition-all ${
                    messageText.trim() && !sending
                      ? 'bg-forest text-parchment hover:bg-forest-deep'
                      : 'text-forest/15'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 px-1">
              <span className="font-mono text-[9px] text-forest/15">
                <span className="bg-forest/[0.06] px-1.5 py-0.5 squircle-sm text-forest/30">$</span> for inline LaTeX
              </span>
              <span className="font-mono text-[9px] text-forest/15">
                <span className="bg-forest/[0.06] px-1.5 py-0.5 squircle-sm text-forest/30">```</span> for code
              </span>
              <span className="font-mono text-[9px] text-forest/15">
                <span className="bg-forest/[0.06] px-1.5 py-0.5 squircle-sm text-forest/30">**</span> for bold
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
