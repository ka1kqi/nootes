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
  course?: string
  professor?: string
  semester?: string
  version?: string
  blocks: Block[]
  tags?: string[]
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocument(repoId: string, userId: string) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const pendingRef = useRef<Block[] | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docRef = useRef<Document | null>(null)

  // Undo history
  const historyRef = useRef<Block[][]>([])
  const historyIndexRef = useRef<number>(-1)

  // Fetch from Supabase on mount
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('repo_id', repoId)
          .eq('user_id', userId)
          .maybeSingle()

        if (cancelled) return
        if (error) throw error

        let loaded: Document
        if (data) {
          const blocks = data.content ? markdownToBlocks(data.content) : [newBlock('paragraph')]
          loaded = {
            id: data.id,
            repoId: data.repo_id,
            userId: data.user_id,
            title: data.title || 'My Notes',
            version: data.version,
            tags: data.tags,
            blocks,
            updatedAt: data.updated_at,
          }
        } else {
          // First time — create an in-memory empty doc; it will be upserted on first save
          loaded = {
            id: crypto.randomUUID(),
            repoId,
            userId,
            title: 'My Notes',
            version: '1.0.0',
            tags: [],
            blocks: [newBlock('paragraph')],
            updatedAt: new Date().toISOString(),
          }
        }

        setDoc(loaded)
        docRef.current = loaded
        historyRef.current = [loaded.blocks]
        historyIndexRef.current = 0
      } catch {
        if (cancelled) return
        // Offline / network fallback
        const fallback: Document = {
          id: crypto.randomUUID(),
          repoId,
          userId,
          title: 'My Notes (offline)',
          blocks: [newBlock('paragraph')],
          updatedAt: new Date().toISOString(),
        }
        setDoc(fallback)
        docRef.current = fallback
        historyRef.current = [fallback.blocks]
        historyIndexRef.current = 0
        setSaveStatus('offline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [repoId, userId])

  // Persist to Supabase
  const persist = useCallback(async (blocks: Block[]) => {
    if (!docRef.current || !userId) return
    setSaveStatus('saving')
    try {
      const markdown = blocksToMarkdown(blocks)
      const { error } = await supabase
        .from('documents')
        .upsert(
          {
            repo_id: repoId,
            user_id: userId,
            title: docRef.current.title || 'My Notes',
            content: markdown,
            version: docRef.current.version ?? '1.0.0',
            tags: docRef.current.tags ?? [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'repo_id,user_id' },
        )
      if (error) throw error
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('error')
    }
  }, [repoId, userId])

  // Debounced update called by editor
  const updateBlocks = useCallback((blocks: Block[]) => {
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current = [...truncated, blocks].slice(-500)
    historyIndexRef.current = historyRef.current.length - 1
    pendingRef.current = blocks
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) persist(pendingRef.current)
    }, DEBOUNCE_MS)
  }, [persist])

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const blocks = historyRef.current[historyIndexRef.current]
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    pendingRef.current = blocks
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) persist(pendingRef.current)
    }, DEBOUNCE_MS)
  }, [persist])

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const blocks = historyRef.current[historyIndexRef.current]
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    pendingRef.current = blocks
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) persist(pendingRef.current)
    }, DEBOUNCE_MS)
  }, [persist])

  // Flush immediately (on unmount / tab switch)
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (pendingRef.current) {
      persist(pendingRef.current)
      pendingRef.current = null
    }
  }, [persist])

  return { doc, loading, saveStatus, updateBlocks, saveNow, undo, redo }
}
