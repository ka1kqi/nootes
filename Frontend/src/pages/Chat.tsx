import { useState, useRef, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Chat Page                                                           */
/* Persistent chat organized by school / major / repository            */
/* Supports LaTeX in messages, threading, aura badges                  */
/* ------------------------------------------------------------------ */

type ChannelType = 'school' | 'major' | 'repo'

interface Channel {
  id: string
  name: string
  type: ChannelType
  unread: number
  lastMessage: string
  lastTime: string
  members: number
}

interface ChatMessage {
  id: string
  author: string
  initials: string
  color: string
  aura: number
  tier: 'seedling' | 'sprout' | 'sapling' | 'grove' | 'ancient-oak'
  badges: string[]
  content: string
  time: string
  reactions: { emoji: string; count: number }[]
  thread?: { count: number; lastReply: string }
  isLatex?: boolean
}

const channels: Channel[] = [
  { id: 'nyu-general', name: 'NYU General', type: 'school', unread: 3, lastMessage: 'Anyone have Prof. Chen\'s office hours?', lastTime: '2m', members: 1247 },
  { id: 'nyu-cs', name: 'Computer Science', type: 'major', unread: 1, lastMessage: 'The midterm is next Thursday!', lastTime: '15m', members: 342 },
  { id: 'nyu-math', name: 'Mathematics', type: 'major', unread: 0, lastMessage: 'Euler\'s identity proof in topology...', lastTime: '1h', members: 198 },
  { id: 'cs-ua-310', name: 'Intro to Algorithms', type: 'repo', unread: 5, lastMessage: 'Can someone explain the master theorem?', lastTime: '5m', members: 47 },
  { id: 'math-ua-140', name: 'Linear Algebra', type: 'repo', unread: 0, lastMessage: 'New eigenvalue examples added!', lastTime: '3h', members: 31 },
  { id: 'chem-ua-226', name: 'Organic Chemistry', type: 'repo', unread: 2, lastMessage: 'SN2 mechanism diagrams look great', lastTime: '20m', members: 15 },
  { id: 'nyu-physics', name: 'Physics', type: 'major', unread: 0, lastMessage: 'Quantum homework solutions posted', lastTime: '4h', members: 167 },
  { id: 'study-dsa', name: 'DSA Interview Prep', type: 'repo', unread: 0, lastMessage: 'Linked list problems batch done', lastTime: '1d', members: 4 },
]

const messages: ChatMessage[] = [
  {
    id: '1',
    author: 'Jake Torres',
    initials: 'JT',
    color: '#264635',
    aura: 892,
    tier: 'grove',
    badges: ['🎓', '⟐'],
    content: 'Hey everyone — I just pushed a really clean explanation of the Master Theorem to the master doc. Can someone review before the next merge window?',
    time: '4:23 PM',
    reactions: [{ emoji: '👍', count: 4 }, { emoji: '✦', count: 2 }],
    thread: { count: 3, lastReply: '4:45 PM' },
  },
  {
    id: '2',
    author: 'Priya Kapoor',
    initials: 'PK',
    color: '#A3B18A',
    aura: 1240,
    tier: 'ancient-oak',
    badges: ['✦', '🏆'],
    content: 'Nice work! Here\'s the recurrence relation for reference:',
    time: '4:28 PM',
    reactions: [],
  },
  {
    id: '2b',
    author: 'Priya Kapoor',
    initials: 'PK',
    color: '#A3B18A',
    aura: 1240,
    tier: 'ancient-oak',
    badges: ['✦', '🏆'],
    content: '$T(n) = aT\\left(\\frac{n}{b}\\right) + \\Theta(n^c)$, where the solution depends on $\\log_b a$ vs $c$.',
    time: '4:28 PM',
    reactions: [{ emoji: '🧠', count: 6 }],
    isLatex: true,
  },
  {
    id: '3',
    author: 'Aisha Malik',
    initials: 'AM',
    color: '#8B6E4E',
    aura: 1847,
    tier: 'ancient-oak',
    badges: ['✦', '⟐', '🎓'],
    content: 'The three cases are:\n\nCase 1: If $\\log_b a > c$, then $T(n) = \\Theta(n^{\\log_b a})$\n\nCase 2: If $\\log_b a = c$, then $T(n) = \\Theta(n^c \\log n)$\n\nCase 3: If $\\log_b a < c$, then $T(n) = \\Theta(n^c)$',
    time: '4:31 PM',
    reactions: [{ emoji: '🔥', count: 8 }, { emoji: '👍', count: 3 }],
    isLatex: true,
    thread: { count: 7, lastReply: '5:02 PM' },
  },
  {
    id: '4',
    author: 'Marcus Chen',
    initials: 'MC',
    color: '#5C7A6B',
    aura: 156,
    tier: 'sprout',
    badges: ['🎓'],
    content: 'Wait so for merge sort, $a = 2$, $b = 2$, $c = 1$, and $\\log_2 2 = 1 = c$, so it\'s Case 2 and we get $\\Theta(n \\log n)$?',
    time: '4:35 PM',
    reactions: [{ emoji: '✅', count: 3 }],
    isLatex: true,
  },
  {
    id: '5',
    author: 'Priya Kapoor',
    initials: 'PK',
    color: '#A3B18A',
    aura: 1240,
    tier: 'ancient-oak',
    badges: ['✦', '🏆'],
    content: 'Exactly right, Marcus! That\'s the classic example. Binary search is Case 2 as well but with $c = 0$: we get $T(n) = T(n/2) + \\Theta(1)$, and $\\log_2 1 = 0 = c$.',
    time: '4:38 PM',
    reactions: [{ emoji: '💡', count: 5 }],
    isLatex: true,
  },
  {
    id: '6',
    author: 'Jake Torres',
    initials: 'JT',
    color: '#264635',
    aura: 892,
    tier: 'grove',
    badges: ['🎓', '⟐'],
    content: 'I added a comparison table to the notes showing all these cases with real algorithms. Should be in the next merge — check the diff page!',
    time: '4:42 PM',
    reactions: [{ emoji: '🙌', count: 4 }],
  },
]

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

export default function Chat() {
  const [activeChannel, setActiveChannel] = useState('cs-ua-310')
  const [messageText, setMessageText] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannel])

  const activeChannelData = channels.find(c => c.id === activeChannel)

  const groupedChannels = {
    school: channels.filter(c => c.type === 'school'),
    major: channels.filter(c => c.type === 'major'),
    repo: channels.filter(c => c.type === 'repo'),
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
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
            {!sidebarCollapsed ? (
              <>
                {(['school', 'major', 'repo'] as const).map(type => (
                  <div key={type} className="mb-4">
                    <span className="font-mono text-[8px] text-forest/20 tracking-[0.3em] uppercase px-4 block mb-1.5">
                      {type === 'school' ? 'SCHOOL' : type === 'major' ? 'DEPARTMENTS' : 'REPOSITORIES'}
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
                          <ChannelIcon type={channel.type} />
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
                    <ChannelIcon type={channel.type} />
                    {channel.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-sage rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User status */}
          {!sidebarCollapsed && (
            <div className="px-4 py-3 border-t border-forest/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-[10px] text-parchment font-medium relative">
                  AM
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sage rounded-full border-2 border-cream" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 block truncate">Aisha Malik</span>
                  <span className="font-mono text-[9px] text-sage/50">1,847 ✦</span>
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
                <ChannelIcon type={activeChannelData?.type || 'repo'} />
              </span>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-forest">{activeChannelData?.name}</h2>
                <span className="font-mono text-[10px] text-forest/25">{activeChannelData?.members} members</span>
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

            <div className="space-y-1">
              {messages.map((msg, idx) => {
                // Group consecutive messages from same author
                const prevMsg = idx > 0 ? messages[idx - 1] : null
                const isGrouped = prevMsg?.author === msg.author && prevMsg?.time === msg.time

                return (
                  <div
                    key={msg.id}
                    className={`group hover:bg-forest/[0.02] rounded-lg px-3 py-1.5 transition-colors ${!isGrouped ? 'mt-3' : ''}`}
                  >
                    {!isGrouped ? (
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] text-parchment font-medium shrink-0 mt-0.5" style={{ backgroundColor: msg.color }}>
                          {msg.initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Author line */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-[family-name:var(--font-body)] text-sm text-forest font-medium">{msg.author}</span>
                            {msg.badges.map((b, bi) => (
                              <span key={bi} className="text-xs">{b}</span>
                            ))}
                            <span className={`w-2 h-2 rounded-full ${tierColor(msg.tier)}`} title={`${msg.tier} · ${msg.aura} aura`} />
                            <span className="font-mono text-[9px] text-sage/40">{msg.aura} ✦</span>
                            <span className="font-mono text-[10px] text-forest/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{msg.time}</span>
                          </div>

                          {/* Message content */}
                          <div className="font-[family-name:var(--font-body)] text-[14px] text-forest/70 leading-relaxed whitespace-pre-wrap">
                            {msg.isLatex ? (
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
                          {msg.reactions.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {msg.reactions.map((r, ri) => (
                                <button key={ri} className="flex items-center gap-1 bg-forest/[0.04] hover:bg-forest/[0.08] border border-forest/[0.06] squircle-sm px-2 py-0.5 transition-colors">
                                  <span className="text-xs">{r.emoji}</span>
                                  <span className="font-mono text-[10px] text-forest/40">{r.count}</span>
                                </button>
                              ))}
                              <button className="w-6 h-6 flex items-center justify-center text-forest/15 hover:text-forest/40 hover:bg-forest/[0.04] squircle-sm transition-all opacity-0 group-hover:opacity-100">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              </button>
                            </div>
                          )}

                          {/* Thread indicator */}
                          {msg.thread && (
                            <button className="flex items-center gap-2 mt-2 text-sage hover:text-forest transition-colors group/thread">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.28 48.28 0 005.557-.885c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                              <span className="font-mono text-[10px] group-hover/thread:underline">{msg.thread.count} replies</span>
                              <span className="font-mono text-[9px] text-forest/20">last at {msg.thread.lastReply}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Grouped message (same author, same time) — no avatar */
                      <div className="pl-12">
                        <div className="font-[family-name:var(--font-body)] text-[14px] text-forest/70 leading-relaxed whitespace-pre-wrap">
                          {msg.isLatex ? (
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
                        {msg.reactions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {msg.reactions.map((r, ri) => (
                              <button key={ri} className="flex items-center gap-1 bg-forest/[0.04] hover:bg-forest/[0.08] border border-forest/[0.06] squircle-sm px-2 py-0.5 transition-colors">
                                <span className="text-xs">{r.emoji}</span>
                                <span className="font-mono text-[10px] text-forest/40">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {msg.thread && (
                          <button className="flex items-center gap-2 mt-2 text-sage hover:text-forest transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.28 48.28 0 005.557-.885c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                            <span className="font-mono text-[10px]">{msg.thread.count} replies</span>
                            <span className="font-mono text-[9px] text-forest/20">last at {msg.thread.lastReply}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
                  placeholder={`Message #${activeChannelData?.name || 'channel'}... (use $...$ for LaTeX)`}
                  className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none"
                />
                <button
                  className={`w-8 h-8 flex items-center justify-center squircle-sm transition-all ${
                    messageText.trim()
                      ? 'bg-forest text-parchment hover:bg-forest-deep'
                      : 'text-forest/15'
                  }`}
                  disabled={!messageText.trim()}
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
