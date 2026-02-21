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

  return { repos, loading, error, createRepo, refetch: fetchRepos }
}
