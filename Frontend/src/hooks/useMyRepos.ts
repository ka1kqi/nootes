import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { newBlock, type Block } from './useDocument'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateDocumentInput {
  title: string
  tags?: string[]
}

export interface UserDocument {
  id: string
  title: string
  blocks: Block[]
  version: string[] | null
  access_level: 'private' | 'public' | 'restricted'
  required_user_tags: string[]
  created_at: string
}

// ─── createDocument ───────────────────────────────────────────────────────────

export async function createDocument(
  user: import('@supabase/supabase-js').User,
  input: CreateDocumentInput,
): Promise<{ docId: string | null; error: string | null }> {
  const { data, error: docErr } = await supabase
    .from('documents')
    .insert({
      owner_user_id: user.id,
      title: input.title.trim(),
      blocks: [newBlock('paragraph')],
      required_user_tags: input.tags ?? [],
    })
    .select('id')
    .single()

  if (docErr) return { docId: null, error: docErr.message }
  return { docId: data.id, error: null }
}

// ─── useUserDocuments ─────────────────────────────────────────────────────────

export function useUserDocuments() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = useCallback(async () => {
    if (!user) { setDocs([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('id, title, blocks, version, access_level, required_user_tags, created_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    setDocs((data as unknown as UserDocument[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  return { docs, loading, refetch: fetchDocs }
}

// ─── deleteDocument ───────────────────────────────────────────────────────────

export async function deleteDocument(docId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('documents').delete().eq('id', docId)
  return { error: error?.message ?? null }
}
