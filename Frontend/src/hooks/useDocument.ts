import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { blocksToJson, jsonToBlocks } from '../lib/markdown'
import { useAuth } from './useAuth'

// ─── Embed helper (fire-and-forget) ──────────────────────────────────────────

function _apiBase(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (!url || url.startsWith('http://localhost') || url.startsWith('http://127.')) return '/api'
  return url.replace(/\/[^/]+$/, '')
}

/** Lightweight fingerprint of a document's text content. */
function _contentFingerprint(blocks: Block[]): string {
  return blocks
    .map(b => (b.content ?? '').trimEnd())
    .join('\x00')
}

async function _embedAndStore(docId: string, blocks: Block[], title?: string) {
  try {
    const res = await fetch(`${_apiBase()}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, blocks, title: title ?? null }),
    })
    if (!res.ok) return
    const { embedding } = await res.json()
    if (!Array.isArray(embedding)) return
    await supabase.from('documents').update({ embedding }).eq('id', docId)
  } catch {
    // Non-blocking — embedding failure must not affect save UX
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'latex'
  | 'code'
  | 'chemistry'
  | 'callout'
  | 'divider'
  | 'table'
  | 'diagram'
  | 'bullet_list'
  | 'ordered_list'

export type Block = {
  id: string
  type: BlockType
  content: string
  meta?: Record<string, unknown>
}

export type Document = {
  id: string
  repoId: string
  userId: string
  owner_user_id: string | null
  title: string
  version?: string[] | null
  tags: string[]
  source_document_id?: string | null
  access_level: 'private' | 'public' | 'restricted'
  is_public_root: boolean
  merge_policy: 'no_merges' | 'invite_only' | 'anyone'
  blocks: Block[]
  updatedAt: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error' | 'offline'

// ─── Module-level document cache ─────────────────────────────────────────────
// Persists documents for the SPA session so re-navigation shows data instantly.
const documentCache = new Map<string, Document>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function newBlock(type: BlockType): Block {
  return {
    id: crypto.randomUUID(),
    type,
    content: '',
    meta: type === 'code' ? { language: 'python', filename: '' }
      : type === 'callout' ? { calloutType: 'info' }
      : type === 'chemistry' ? { caption: '' }
      : type === 'table' ? { caption: '' }
      : type === 'diagram' ? { caption: '' }
      : type === 'bullet_list' ? { items: [{ id: crypto.randomUUID(), text: '', indent: 0 }] }
      : undefined,
  }
}

const DEBOUNCE_MS = 1200
const SCRATCH_KEY = (uid: string) => `nootes-scratch-${uid}`
const BUCKET = 'documents'
const storagePath = (uid: string, rid: string) => `${uid}/${rid}.json`

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocument(repoId: string, userId: string, repoTitle?: string) {
  const { sessionReady } = useAuth()
  // ── Cache lookup ───────────────────────────────────────────────────────────
  const cacheKey = userId && repoId ? `${userId}:${repoId}` : ''
  const cachedDoc = cacheKey ? documentCache.get(cacheKey) : undefined

  const [doc, setDoc] = useState<Document | null>(cachedDoc ?? null)
  const [loading, setLoading] = useState(!cachedDoc)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const pendingRef = useRef<Block[] | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docRef = useRef<Document | null>(cachedDoc ?? null)
  // Tracks the fingerprint of blocks that were last successfully embedded.
  // Saves that don't change text content skip the embed API call entirely.
  const lastEmbedFingerprintRef = useRef<string>('')

  // Undo history — seeded from cache so undo works immediately on re-navigation
  const historyRef = useRef<Block[][]>(cachedDoc?.blocks ? [cachedDoc.blocks] : [])
  const historyIndexRef = useRef<number>(cachedDoc?.blocks ? 0 : -1)

  const isScratch = repoId === 'scratch'

  // Keep the module-level cache in sync whenever doc state changes
  useEffect(() => {
    if (doc && cacheKey) documentCache.set(cacheKey, doc)
  }, [doc, cacheKey])

  // Fetch on mount — Supabase Storage for both scratch and real repos
  // Scratch additionally falls back to localStorage when offline
  useEffect(() => {
    if (!userId || !sessionReady) return
    // Clear cache entry so tab-restore re-fetches fresh data
    if (cacheKey) documentCache.delete(cacheKey)

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        if (isScratch) {
          // Try Supabase Storage first so scratch syncs across devices
          const { data: fileData, error: downloadErr } = await supabase.storage
            .from(BUCKET)
            .download(storagePath(userId, 'scratch'))

          if (cancelled) return

          let json = ''
          if (!downloadErr && fileData) {
            json = await fileData.text()
            // Keep localStorage in sync for instant offline reads
            if (json) localStorage.setItem(SCRATCH_KEY(userId), json)
          } else {
            // File not found or network error — fall back to localStorage
            json = localStorage.getItem(SCRATCH_KEY(userId)) ?? ''
          }

          const blocks = json ? jsonToBlocks(json) : [newBlock('paragraph')]
          const loaded: Document = {
            id: 'scratch',
            repoId: 'scratch',
            userId,
            owner_user_id: userId,
            title: 'Quick Notes',
            tags: [],
            source_document_id: null,
            access_level: 'private',
            is_public_root: false,
            merge_policy: 'invite_only',
            blocks,
            updatedAt: new Date().toISOString(),
          }
          setDoc(loaded)
          docRef.current = loaded
          historyRef.current = [blocks]
          historyIndexRef.current = 0
          lastEmbedFingerprintRef.current = _contentFingerprint(blocks)
        } else {
          // Load everything from Supabase — blocks stored as jsonb
          const { data: docRow } = await supabase
            .from('documents')
            .select('title, version, tags, source_document_id, blocks, access_level, is_public_root, merge_policy, owner_user_id')
            .eq('id', repoId)
            .maybeSingle()

          if (cancelled) return

          const rawBlocks = docRow?.blocks
          const blocks: Block[] = Array.isArray(rawBlocks) && rawBlocks.length > 0
            ? (rawBlocks as Block[])
            : [newBlock('paragraph')]

          const loaded: Document = {
            id: repoId,
            repoId,
            userId,
            owner_user_id: docRow?.owner_user_id ?? null,
            title: docRow?.title || repoTitle || 'My Notes',
            version: docRow?.version ?? null,
            tags: Array.isArray(docRow?.tags) ? docRow.tags : [],
            source_document_id: docRow?.source_document_id ?? null,
            access_level: docRow?.access_level ?? 'private',
            is_public_root: docRow?.is_public_root ?? false,
            merge_policy: docRow?.merge_policy ?? 'invite_only',
            blocks,
            updatedAt: new Date().toISOString(),
          }
          setDoc(loaded)
          docRef.current = loaded
          historyRef.current = [loaded.blocks]
          historyIndexRef.current = 0
          lastEmbedFingerprintRef.current = _contentFingerprint(blocks)
        }
      } catch {
        if (cancelled) return
        if (isScratch) {
          // Network failure for scratch — use localStorage as full fallback
          const stored = localStorage.getItem(SCRATCH_KEY(userId))
          const blocks = stored ? jsonToBlocks(stored) : [newBlock('paragraph')]
          const fallback: Document = {
            id: 'scratch',
            repoId: 'scratch',
            userId,
            owner_user_id: userId,
            title: 'Quick Notes',
            tags: [],
            source_document_id: null,
            access_level: 'private',
            is_public_root: false,
            merge_policy: 'invite_only',
            blocks,
            updatedAt: new Date().toISOString(),
          }
          setDoc(fallback)
          docRef.current = fallback
          historyRef.current = [fallback.blocks]
          historyIndexRef.current = 0
          lastEmbedFingerprintRef.current = _contentFingerprint(blocks)
        } else {
          // Offline / network fallback for real repos
          const fallback: Document = {
            id: crypto.randomUUID(),
            repoId,
            userId,
            owner_user_id: null,
            title: repoTitle || 'My Notes',
            tags: [],
            source_document_id: null,
            access_level: 'private',
            is_public_root: false,
            merge_policy: 'invite_only',
            blocks: [newBlock('paragraph')],
            updatedAt: new Date().toISOString(),
          }
          setDoc(fallback)
          docRef.current = fallback
          historyRef.current = [fallback.blocks]
          historyIndexRef.current = 0
          // Don't set fingerprint for offline fallback — first online save should embed
          setSaveStatus('offline')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [repoId, userId, isScratch, sessionReady])

  // Persist — localStorage for scratch, Supabase for real repos
  const persist = useCallback(async (blocks: Block[]) => {
    if (!docRef.current || !userId) return
    setSaveStatus('saving')

    if (isScratch) {
      try {
        const json = blocksToJson(blocks)

        // 1. Persist to localStorage immediately (instant, works offline)
        localStorage.setItem(SCRATCH_KEY(userId), json)

        // 2. Upload to Supabase Storage for cross-device sync
        const blob = new Blob([json], { type: 'application/json' })
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath(userId, 'scratch'), blob, {
            contentType: 'application/json',
            upsert: true,
          })
        // Don't throw on upload error — localStorage save already succeeded
        if (uploadErr) console.warn('Scratch cloud sync failed:', uploadErr.message)

        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      } catch {
        // localStorage write failed (storage quota exceeded, etc.)
        setSaveStatus('error')
      }
      return
    }

    try {
      // Write blocks directly to the jsonb column — no Storage upload needed
      const { error: metaErr } = await supabase
        .from('documents')
        .update({
          title: docRef.current.title || repoTitle || 'My Notes',
          blocks,
        })
        .eq('id', repoId)
      if (metaErr) throw metaErr

      // Only re-embed when text content has actually changed
      const fingerprint = _contentFingerprint(blocks)
      if (fingerprint !== lastEmbedFingerprintRef.current) {
        lastEmbedFingerprintRef.current = fingerprint  // optimistic: skip duplicates even if embed fails
        _embedAndStore(repoId, blocks, docRef.current.title || repoTitle || undefined)
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('error')
    }
  }, [repoId, userId])

  // Shared debounce scheduler — clears any existing timer and schedules a new save
  const scheduleSave = useCallback((blocks: Block[]) => {
    pendingRef.current = blocks
    setSaveStatus('unsaved')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const toSave = pendingRef.current
      pendingRef.current = null          // clear before async call — prevents double-save on unmount
      if (toSave) persist(toSave)
    }, DEBOUNCE_MS)
  }, [persist])

  // Flush pending save immediately (no timer) — clears pending so unmount/visibility
  // handlers don't fire a redundant second upload after the debounce already ran
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const toSave = pendingRef.current
    pendingRef.current = null
    if (toSave) persist(toSave)
  }, [persist])

  // Flush on tab hide / window minimize — catches the case where the user switches
  // away from the tab before the 1200 ms debounce fires (browser close also fires this)
  useEffect(() => {
    if (!userId) return
    const handleVisibility = () => { if (document.hidden) saveNow() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId, saveNow])

  // Debounced update called by editor
  const updateBlocks = useCallback((blocks: Block[]) => {
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current = [...truncated, blocks].slice(-500)
    historyIndexRef.current = historyRef.current.length - 1
    scheduleSave(blocks)
  }, [scheduleSave])

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const blocks = historyRef.current[historyIndexRef.current]
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    scheduleSave(blocks)
  }, [scheduleSave])

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const blocks = historyRef.current[historyIndexRef.current]
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    scheduleSave(blocks)
  }, [scheduleSave])

  // Update title in local state and debounce-persist to Supabase
  const updateTitle = useCallback((title: string) => {
    setDoc(prev => {
      if (!prev) return prev
      const updated = { ...prev, title }
      docRef.current = updated
      return updated
    })

    if (isScratch) return // scratch has no documents row; promotion is handled via promoteScratch

    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(async () => {
      if (!docRef.current) return
      await supabase.from('documents').update({ title }).eq('id', repoId)
    }, 800)
  }, [repoId, isScratch])

  // Promote a scratch document to a real document in the `documents` table.
  // Returns the new document ID on success, null on failure or if conditions aren't met.
  const promoteScratch = useCallback(async (title: string): Promise<string | null> => {
    const trimmed = title.trim()
    if (!isScratch || !userId || !docRef.current || !trimmed || trimmed === 'Quick Notes') return null

    const blocks = docRef.current.blocks

    const { data, error } = await supabase
      .from('documents')
      .insert({
        owner_user_id: userId,
        title: trimmed,
        blocks,
        access_level: 'private',
        is_public_root: false,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      console.error('Failed to promote scratch:', error?.message)
      return null
    }

    // Clear scratch from localStorage and Storage so next visit gets a fresh pad
    localStorage.removeItem(SCRATCH_KEY(userId))
    supabase.storage.from(BUCKET).remove([storagePath(userId, 'scratch')]).catch(() => {})

    // Evict from in-memory cache
    if (cacheKey) documentCache.delete(cacheKey)

    // Fire-and-forget embedding
    _embedAndStore(data.id, blocks, trimmed)

    return data.id
  }, [isScratch, userId, cacheKey])

  // Update tags in local state and persist immediately to Supabase
  const updateTags = useCallback(async (tags: string[]) => {
    setDoc(prev => {
      if (!prev) return prev
      const updated = { ...prev, tags }
      docRef.current = updated
      return updated
    })

    if (isScratch) return // scratch has no documents row

    await supabase.from('documents').update({ tags }).eq('id', repoId)
  }, [repoId, isScratch])

  // Update access_level (and is_public_root) — persists immediately
  const updateVisibility = useCallback(async (access_level: Document['access_level']) => {
    const is_public_root = access_level !== 'private'
    setDoc(prev => {
      if (!prev) return prev
      const updated = { ...prev, access_level, is_public_root }
      docRef.current = updated
      return updated
    })

    if (isScratch) return

    await supabase
      .from('documents')
      .update({ access_level, is_public_root })
      .eq('id', repoId)
  }, [repoId, isScratch])

  // Update merge_policy — persists immediately
  const updateMergePolicy = useCallback(async (merge_policy: Document['merge_policy']) => {
    setDoc(prev => {
      if (!prev) return prev
      const updated = { ...prev, merge_policy }
      docRef.current = updated
      return updated
    })

    if (isScratch) return

    await supabase
      .from('documents')
      .update({ merge_policy })
      .eq('id', repoId)
  }, [repoId, isScratch])

  return { doc, loading, saveStatus, updateBlocks, saveNow, undo, redo, updateTitle, updateTags, updateVisibility, updateMergePolicy, promoteScratch, isScratch }
}
