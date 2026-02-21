import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Repository } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RepoWithRole extends Repository {
  role: 'owner' | 'contributor' | 'forked'
  aura_earned: number
}

export interface CreateRepoInput {
  title: string
  description?: string
  course?: string
  professor?: string
  semester?: string
  university?: string
  department?: string
  is_class: boolean
  is_public: boolean
  tags?: string[]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMyRepos() {
  const { user } = useAuth()
  const [repos, setRepos] = useState<RepoWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepos = useCallback(async () => {
    if (!user) {
      setRepos([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('repository_contributors')
      .select('role, aura_earned, repositories(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: RepoWithRole[] = (data || []).flatMap((row: any) => {
      if (!row.repositories) return []
      return [{ ...row.repositories, role: row.role, aura_earned: row.aura_earned }]
    })

    setRepos(mapped)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchRepos()
  }, [fetchRepos])

  const createRepo = useCallback(
    async (input: CreateRepoInput): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' }

      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const id = `${slug}-${Date.now().toString(36)}`

      const { error: repoErr } = await supabase.from('repositories').insert({
        id,
        title: input.title,
        description: input.description || null,
        course: input.course || null,
        professor: input.professor || null,
        semester: input.semester || null,
        university: input.university || null,
        department: input.department || null,
        is_class: input.is_class,
        is_public: input.is_public,
        tags: input.tags || [],
        created_by: user.id,
      })

      if (repoErr) return { error: repoErr.message }

      const { error: contribErr } = await supabase.from('repository_contributors').insert({
        repo_id: id,
        user_id: user.id,
        role: 'owner',
        aura_earned: 0,
      })

      if (contribErr) return { error: contribErr.message }

      await fetchRepos()
      return { error: null }
    },
    [user, fetchRepos],
  )

  const deleteRepo = useCallback(
    async (repoId: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' }

      const repo = repos.find(r => r.id === repoId)
      if (!repo) return { error: 'Nootbook not found' }

      // Optimistically remove from UI
      setRepos(prev => prev.filter(r => r.id !== repoId))

      try {
        if (repo.role === 'owner') {
          // Delete the repo row — cascades to contributors, documents, etc.
          const { error: repoErr } = await supabase
            .from('repositories')
            .delete()
            .eq('id', repoId)
          if (repoErr) throw repoErr
        } else {
          // Just remove myself as a contributor/forker
          const { error: contribErr } = await supabase
            .from('repository_contributors')
            .delete()
            .eq('repo_id', repoId)
            .eq('user_id', user.id)
          if (contribErr) throw contribErr
        }

        // Best-effort: remove the user's .md file from Storage
        await supabase.storage
          .from('documents')
          .remove([`${user.id}/${repoId}.md`])

        return { error: null }
      } catch (e: unknown) {
        // Revert optimistic update on failure
        await fetchRepos()
        return { error: e instanceof Error ? e.message : 'Failed to delete' }
      }
    },
    [user, repos, fetchRepos],
  )

  return { repos, loading, error, createRepo, deleteRepo, refetch: fetchRepos }
}
