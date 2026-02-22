import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { blocksToMarkdown, markdownToBlocks } from '../lib/markdown'

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
  title: string
  version?: string[] | null
  blocks: Block[]
  updatedAt: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error' | 'offline'

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
      : undefined,
  }
}

const DEBOUNCE_MS = 1200
const SCRATCH_KEY = (uid: string) => `nootes-scratch-${uid}`
const BUCKET = 'documents'
const storagePath = (uid: string, rid: string) => `${uid}/${rid}.md`

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocument(repoId: string, userId: string, repoTitle?: string) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const pendingRef = useRef<Block[] | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docRef = useRef<Document | null>(null)

  // Undo history
  const historyRef = useRef<Block[][]>([])
  const historyIndexRef = useRef<number>(-1)

  const isScratch = repoId === 'scratch'

  // Fetch on mount — Supabase Storage for both scratch and real repos
  // Scratch additionally falls back to localStorage when offline
  useEffect(() => {
    if (!userId) return

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

          let markdown = ''
          if (!downloadErr && fileData) {
            markdown = await fileData.text()
            // Keep localStorage in sync for instant offline reads
            if (markdown) localStorage.setItem(SCRATCH_KEY(userId), markdown)
          } else {
            // File not found or network error — fall back to localStorage
            markdown = localStorage.getItem(SCRATCH_KEY(userId)) ?? ''
          }

          const blocks = markdown ? markdownToBlocks(markdown) : [newBlock('paragraph')]
          const loaded: Document = {
            id: 'scratch',
            repoId: 'scratch',
            userId,
            title: 'Quick Notes',
            blocks,
            updatedAt: new Date().toISOString(),
          }
          setDoc(loaded)
          docRef.current = loaded
          historyRef.current = [blocks]
          historyIndexRef.current = 0
        } else {
          // Load blocks from documents table by id
          const { data: docRow } = await supabase
            .from('documents')
            .select('id, title, version, blocks, created_at')
            .eq('id', repoId)
            .maybeSingle()

          if (cancelled) return

          const rawBlocks = docRow?.blocks
          const blocks: Block[] = Array.isArray(rawBlocks) && rawBlocks.length > 0
            ? (rawBlocks as Block[])
            : [newBlock('paragraph')]

          const loaded: Document = {
            id: docRow?.id ?? crypto.randomUUID(),
            repoId,
            userId,
            title: docRow?.title || repoTitle || 'My Notes',
            version: docRow?.version ?? null,
            blocks,
            updatedAt: docRow?.created_at ?? new Date().toISOString(),
          }
          setDoc(loaded)
          docRef.current = loaded
          historyRef.current = [loaded.blocks]
          historyIndexRef.current = 0
        }
      } catch {
        if (cancelled) return
        if (isScratch) {
          // Network failure for scratch — use localStorage as full fallback
          const stored = localStorage.getItem(SCRATCH_KEY(userId))
          const blocks = stored ? markdownToBlocks(stored) : [newBlock('paragraph')]
          const fallback: Document = {
            id: 'scratch',
            repoId: 'scratch',
            userId,
            title: 'Quick Notes',
            blocks,
            updatedAt: new Date().toISOString(),
          }
          setDoc(fallback)
          docRef.current = fallback
          historyRef.current = [fallback.blocks]
          historyIndexRef.current = 0
        } else {
          // Offline / network fallback for real repos
          const fallback: Document = {
            id: crypto.randomUUID(),
            repoId,
            userId,
            title: repoTitle || 'My Notes',
            blocks: [newBlock('paragraph')],
            updatedAt: new Date().toISOString(),
          }
          setDoc(fallback)
          docRef.current = fallback
          historyRef.current = [fallback.blocks]
          historyIndexRef.current = 0
          setSaveStatus('offline')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [repoId, userId, isScratch])

  // Persist — localStorage for scratch, Supabase for real repos
  const persist = useCallback(async (blocks: Block[]) => {
    if (!docRef.current || !userId) return
    setSaveStatus('saving')

    if (isScratch) {
      try {
        const markdown = blocksToMarkdown(blocks)

        // 1. Persist to localStorage immediately (instant, works offline)
        localStorage.setItem(SCRATCH_KEY(userId), markdown)

        // 2. Upload to Supabase Storage for cross-device sync
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath(userId, 'scratch'), blob, {
            contentType: 'text/markdown',
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
      // Update blocks by document id
      const { error: upsertErr } = await supabase
        .from('documents')
        .update({
          title: docRef.current.title || repoTitle || 'My Notes',
          blocks,
        })
        .eq('id', repoId)
      if (upsertErr) throw upsertErr

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

  return { doc, loading, saveStatus, updateBlocks, saveNow, undo, redo }
}
