import { useState, useEffect, useRef, useCallback } from 'react'

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

const API = 'http://localhost:3001/api'
const DEBOUNCE_MS = 1200

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocument(repoId: string, userId: string) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const pendingRef = useRef<Block[] | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docRef = useRef<Document | null>(null)

  // Undo history: stack of block snapshots, pointer at current position
  const historyRef = useRef<Block[][]>([])
  const historyIndexRef = useRef<number>(-1)

  // Fetch on mount
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/repos/${repoId}/personal/${userId}`)
      .then(r => r.json())
      .then(({ data }) => {
        setDoc(data)
        docRef.current = data
        // Seed history with the loaded state
        historyRef.current = [data.blocks]
        historyIndexRef.current = 0
      })
      .catch(() => {
        // Offline fallback — empty doc
        const fallback: Document = {
          id: crypto.randomUUID(),
          repoId,
          userId,
          title: 'My Notes (offline)',
          blocks: [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }],
          updatedAt: new Date().toISOString(),
        }
        setDoc(fallback)
        docRef.current = fallback
        historyRef.current = [fallback.blocks]
        historyIndexRef.current = 0
      })
      .finally(() => setLoading(false))
  }, [repoId, userId])

  // Persist blocks to backend
  const persist = useCallback(async (blocks: Block[]) => {
    if (!docRef.current) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`${API}/repos/${repoId}/personal/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      })
      if (!res.ok) throw new Error('Save failed')
      const { data } = await res.json()
      docRef.current = data
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('error')
    }
  }, [repoId, userId])

  // Debounced update called by editor
  const updateBlocks = useCallback((blocks: Block[]) => {
    setDoc(prev => prev ? { ...prev, blocks } : prev)
    // Push to history, discarding any redo states, cap at 500 entries
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current = [...truncated, blocks].slice(-500)
    historyIndexRef.current = historyRef.current.length - 1
    pendingRef.current = blocks
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) persist(pendingRef.current)
    }, DEBOUNCE_MS)
  }, [persist])

  // Step back one history entry
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

  // Step forward one history entry
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
