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
const SCRATCH_KEY = (uid: string) => `nootes-scratch-${uid}`
const BUCKET = 'documents'
const storagePath = (uid: string, rid: string) => `${uid}/${rid}.md`

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

  const isScratch = repoId === 'scratch'

  // Fetch on mount — localStorage for scratch, Supabase for real repos
  useEffect(() => {
    if (!userId) return

    if (isScratch) {
      const stored = localStorage.getItem(SCRATCH_KEY(userId))
      const blocks = stored ? markdownToBlocks(stored) : [newBlock('paragraph')]
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
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        // 1. Download the .md file from Storage (404 = first visit, not an error)
        const { data: fileData, error: downloadErr } = await supabase.storage
          .from(BUCKET)
          .download(storagePath(userId, repoId))

        if (cancelled) return

        // Treat 404 / object-not-found as empty doc
        if (downloadErr && !downloadErr.message.includes('Object not found') && !downloadErr.message.includes('404')) {
          throw downloadErr
        }

        const markdown = fileData ? await fileData.text() : ''
        const blocks = markdown ? markdownToBlocks(markdown) : [newBlock('paragraph')]

        // 2. Fetch metadata row (title, version, tags) — may not exist on first visit
        const { data: meta, error: metaErr } = await supabase
          .from('documents')
          .select('id, title, version, tags, updated_at')
          .eq('repo_id', repoId)
          .eq('user_id', userId)
          .maybeSingle()

        if (cancelled) return
        if (metaErr) throw metaErr

        const loaded: Document = {
          id: meta?.id ?? crypto.randomUUID(),
          repoId,
          userId,
          title: meta?.title || 'My Notes',
          version: meta?.version ?? '1.0.0',
          tags: meta?.tags ?? [],
          blocks,
          updatedAt: meta?.updated_at ?? new Date().toISOString(),
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

  // Persist — localStorage for scratch, Supabase for real repos
  const persist = useCallback(async (blocks: Block[]) => {
    if (!docRef.current || !userId) return
    setSaveStatus('saving')

    if (isScratch) {
      try {
        const markdown = blocksToMarkdown(blocks)
        localStorage.setItem(SCRATCH_KEY(userId), markdown)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      } catch {
        setSaveStatus('error')
      }
      return
    }

    try {
      const markdown = blocksToMarkdown(blocks)
      const blob = new Blob([markdown], { type: 'text/markdown' })

      // 1. Upload .md file to Storage (upsert: true overwrites existing)
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath(userId, repoId), blob, {
          contentType: 'text/markdown',
          upsert: true,
        })
      if (uploadErr) throw uploadErr

      // 2. Upsert metadata row (no content column)
      const { error: metaErr } = await supabase
        .from('documents')
        .upsert(
          {
            repo_id: repoId,
            user_id: userId,
            title: docRef.current.title || 'My Notes',
            version: docRef.current.version ?? '1.0.0',
            tags: docRef.current.tags ?? [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'repo_id,user_id' },
        )
      if (metaErr) throw metaErr

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
