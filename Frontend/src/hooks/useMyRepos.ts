/**
 * useMyRepos — hooks and helpers for managing a user's personal documents.
 *
 * Exports:
 * - {@link createDocument}    — inserts a new document row for the current user
 * - {@link useUserDocuments}  — fetches all documents owned by the current user
 * - {@link deleteDocument}    — deletes a document by ID
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { newBlock, type Block } from './useDocument'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Input required to create a new document. */
export interface CreateDocumentInput {
  title: string
  tags?: string[]
}

/** A document row as returned by the `documents` select query (includes embedding). */
export interface UserDocument {
  id: string
  title: string
  blocks: Block[]
  version: string[] | null
  tags: string[]
  access_level: 'private' | 'public' | 'restricted'
  required_user_tags: string[]
  created_at: string
  updated_at: string
  embedding: number[] | null
}

// ─── createDocument ───────────────────────────────────────────────────────────

/**
 * Inserts a new document row owned by `user` with a single blank paragraph block.
 * @returns `{ docId, error }` — `docId` is null on failure.
 */
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

/**
 * Fetches all documents owned by the current user, ordered newest-first.
 * Waits for `sessionReady` before querying to avoid stale token errors.
 *
 * @returns `{ docs, loading, refetch }`
 */
export function useUserDocuments() {
  const { user, sessionReady } = useAuth()
  const [docs, setDocs] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = useCallback(async () => {
    // Wait for a valid session before querying to avoid stale-token 401 errors
    if (!user || !sessionReady) { setDocs([]); setLoading(true); return }
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('id, title, blocks, version, tags, access_level, required_user_tags, created_at, updated_at, embedding')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    setDocs((data as unknown as UserDocument[]) ?? [])
    setLoading(false)
  }, [user, sessionReady])

  // Fetch documents on mount and whenever user/session state changes
  useEffect(() => { fetchDocs() }, [fetchDocs])

  return { docs, loading, refetch: fetchDocs }
}

// ─── deleteDocument ───────────────────────────────────────────────────────────

/**
 * Permanently deletes a document by its UUID.
 * RLS ensures only the document owner can delete their own rows.
 * @returns `{ error }` — null on success.
 */
export async function deleteDocument(docId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('documents').delete().eq('id', docId)
  return { error: error?.message ?? null }
}

// ─── updateDocumentFolder ─────────────────────────────────────────────────────

/**
 * Moves a document into a folder (or out of all folders) by manipulating
 * the `folder:<name>` tag stored in the document's `tags` array.
 *
 * Algorithm:
 *  1. Fetch the current `tags` array for the document.
 *  2. Strip any existing `folder:` prefixed tag.
 *  3. If `folderName` is non-null, append `folder:<folderName>`.
 *  4. Write the updated tags back via a Supabase update.
 *
 * @param docId      - UUID of the document to update.
 * @param folderName - Destination folder name, or null to remove from all folders.
 * @returns `{ error }` — null on success.
 */
export async function updateDocumentFolder(
  docId: string,
  folderName: string | null,
): Promise<{ error: string | null }> {
  // Fetch current tags so we preserve all non-folder tags
  const { data, error: fetchErr } = await supabase
    .from('documents')
    .select('tags')
    .eq('id', docId)
    .single()

  if (fetchErr) return { error: fetchErr.message }

  // Remove any existing `folder:` tags, then optionally append the new folder tag
  const nonFolderTags: string[] = ((data?.tags as string[]) ?? []).filter(
    (t: string) => !t.startsWith('folder:'),
  )
  const updatedTags = folderName
    ? [...nonFolderTags, `folder:${folderName}`]
    : nonFolderTags

  const { error } = await supabase
    .from('documents')
    .update({ tags: updatedTags })
    .eq('id', docId)

  return { error: error?.message ?? null }
}
