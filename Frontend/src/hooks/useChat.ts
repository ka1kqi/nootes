import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Channel, Message, Reaction } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelWithMeta extends Channel {
  unread: number
  lastMessage: string
  lastTime: string
  members: number
}

// ─── Module-level caches ──────────────────────────────────────────────────────
// Persist across SPA navigations so re-entering chat/editor shows data instantly.
let _channelsCache: ChannelWithMeta[] | null = null
const messagesCache = new Map<string, Message[]>()

export function getFirstCachedChannelId(): string | null {
  return _channelsCache?.[0]?.id ?? null
}

// ─── useChannels ─────────────────────────────────────────────────────────────

export function useChannels() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<ChannelWithMeta[]>(_channelsCache ?? [])
  const [loading, setLoading] = useState(_channelsCache === null)

  const fetchChannels = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Fetch all channels the user is a member of (or all channels if none)
      const { data: memberRows } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id)

      const memberChannelIds = memberRows?.map(r => r.channel_id) ?? []

      // Fetch all channels — show public ones even if not a member yet
      const { data: channelRows, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error || !channelRows) { setLoading(false); return }

      // Build enriched channel list without per-channel message queries
      const enriched: ChannelWithMeta[] = channelRows.map(ch => ({
        ...ch,
        unread: 0,
        lastMessage: '',
        lastTime: '',
        members: ch.member_count,
      }))

      setChannels(enriched)
      _channelsCache = enriched
      setLoading(false)

      // Auto-join user to all channels if not already a member
      for (const id of channelRows.map(c => c.id)) {
        if (!memberChannelIds.includes(id)) {
          await supabase
            .from('channel_members')
            .upsert({ channel_id: id, user_id: user.id })
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Only show loading spinner on first load, not when cache exists
    if (_channelsCache === null) setLoading(true)
    fetchChannels()
  }, [fetchChannels])

  // Realtime: refresh when channel list changes
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('channels-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' },
        () => fetchChannels()
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [user, fetchChannels])

  return { channels, loading, refetch: fetchChannels }
}

// ─── useMessages ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>(() =>
    channelId ? (messagesCache.get(channelId) ?? []) : []
  )
  const [loading, setLoading] = useState(!(channelId && messagesCache.has(channelId)))
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!channelId) { setLoading(false); return }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles(*),
        reactions(*)
      `)
      .eq('channel_id', channelId)
      .is('thread_id', null)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE)

    if (!error && data) {
      setMessages(data as Message[])
      messagesCache.set(channelId, data as Message[])
    }
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    // Only show loading/clear if we have no cached data for this channel
    if (channelId && !messagesCache.has(channelId)) {
      setLoading(true)
      setMessages([])
    }
    fetchMessages()
  }, [fetchMessages, channelId])

  // Realtime subscription for new messages in this channel
  useEffect(() => {
    if (!channelId) return

    const sub = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch full message with profile join
          const { data } = await supabase
            .from('messages')
            .select(`*, profile:profiles(*), reactions(*)`)
            .eq('id', payload.new.id)
            .maybeSingle()
          if (data) {
            setMessages(prev => {
              // Deduplicate by id
              if (prev.some(m => m.id === data.id)) return prev
              const updated = [...prev, data as Message]
              if (channelId) messagesCache.set(channelId, updated)
              return updated
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [channelId])

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return { messages, loading, bottomRef, refetch: fetchMessages }
}

// ─── useSendMessage ───────────────────────────────────────────────────────────

const _API_BASE = (() => {
  const url = import.meta.env.VITE_API_URL as string | undefined
  if (!url) return '/api'
  return url.replace(/\/[^/]+$/, '') // strip last path segment → base /api
})()

const MODERATE_URL = `${_API_BASE}/moderate`

async function moderateMessage(content: string): Promise<'allowed' | 'blocked' | 'error'> {
  try {
    const res = await fetch(MODERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
    })
    if (!res.ok) return 'error'
    const data = await res.json()
    return data.allowed ? 'allowed' : 'blocked'
  } catch {
    return 'error'
  }
}

export function useSendMessage() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)

  const sendMessage = useCallback(async (
    channelId: string,
    content: string,
    isLatex = false,
    threadId: string | null = null
  ) => {
    if (!user || !content.trim()) return { error: 'Not authenticated or empty message' }

    setSending(true)

    const verdict = await moderateMessage(content.trim())

    if (verdict === 'blocked') {
      setSending(false)
      return { error: 'Your message was flagged as inappropriate and was not sent.' }
    }

    if (verdict === 'error') {
      setSending(false)
      return { error: 'Message could not be sent — moderation check unavailable. Please try again.' }
    }

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      user_id: user.id,
      content: content.trim(),
      is_latex: isLatex,
      thread_id: threadId,
    })
    setSending(false)

    return { error: error?.message ?? null }
  }, [user])

  return { sendMessage, sending }
}

// ─── useReactions ─────────────────────────────────────────────────────────────

export function useReactions(messageId: string) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<Reaction[]>([])

  useEffect(() => {
    supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId)
      .then(({ data }) => setReactions(data ?? []))
  }, [messageId])

  const toggleReaction = useCallback(async (emoji: string) => {
    if (!user) return

    const existing = reactions.find(
      r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
    )

    if (existing) {
      const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
      if (!error) setReactions(prev => prev.filter(r => r.id !== existing.id))
    } else {
      const { data, error } = await supabase
        .from('reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single()
      if (!error && data) setReactions(prev => [...prev, data])
    }
  }, [user, messageId, reactions])

  // Group reactions: emoji → { count, userReacted }
  const grouped = reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false }
    acc[r.emoji].count++
    if (r.user_id === user?.id) acc[r.emoji].userReacted = true
    return acc
  }, {})

  return { grouped, toggleReaction }
}

// ─── useThreadMessages ────────────────────────────────────────────────────────

export function useThreadMessages(threadId: string | null) {
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReplies = useCallback(async () => {
    if (!threadId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select(`*, profile:profiles(*), reactions(*)`)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    setReplies((data as Message[]) ?? [])
    setLoading(false)
  }, [threadId])

  useEffect(() => { fetchReplies() }, [fetchReplies])

  // Realtime replies
  useEffect(() => {
    if (!threadId) return
    const sub = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`*, profile:profiles(*), reactions(*)`)
            .eq('id', payload.new.id)
            .maybeSingle()
          if (data) setReplies(prev => [...prev, data as Message])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [threadId])

  return { replies, loading, replyCount: replies.length }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}
