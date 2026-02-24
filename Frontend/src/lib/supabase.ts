/**
 * supabase.ts — Supabase client singleton and shared database row types.
 *
 * The client is configured for browser-side usage with:
 * - `persistSession: true`  — stores the JWT in localStorage under 'nootes-auth'
 * - `detectSessionInUrl: true` — handles OAuth redirect tokens in the URL hash
 * - `flowType: 'implicit'`  — matches the Supabase project's OAuth flow setting
 * - Custom no-op `lock` — avoids Web Locks API issues in some environments
 */
import { createClient } from '@supabase/supabase-js'

/** Supabase project URL, injected at build time via `VITE_SUPABASE_URL`. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
/** Supabase anon (public) key, injected at build time via `VITE_SUPABASE_ANON_KEY`. */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
}

/** Singleton Supabase client used throughout the app. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'nootes-auth',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Bypasses the Web Locks API by immediately invoking the callback —
    // avoids lock-acquisition errors in environments where Web Locks is unavailable.
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return fn()
    },
  },
})

// ─── DB Row Types ─────────────────────────────────────────────────────────────

/** Row shape for the `profiles` table. Mirrors the schema definition exactly. */
export interface Profile {
  id: string
  display_name: string
  full_name: string | null
  organization: string | null
  avatar_url: string | null
  email: string | null
  aura: number
  tier: 'seedling' | 'sprout' | 'sapling' | 'grove' | 'ancient-oak'
  badges: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

/** Row shape for the `channels` table (school, major, or repo channel types). */
export interface Channel {
  id: string
  name: string
  type: 'school' | 'major' | 'repo'
  repo_id: string | null
  description: string | null
  created_by: string | null
  member_count: number
  created_at: string
}

/** Row shape for the `channel_members` join table. */
export interface ChannelMember {
  channel_id: string
  user_id: string
  joined_at: string
}

/** Row shape for the `messages` table, optionally joined with profile and reactions. */
export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  is_latex: boolean
  thread_id: string | null
  created_at: string
  updated_at: string
  // Joined from profiles
  profile?: Profile
  // Joined reactions
  reactions?: Reaction[]
}

/** Row shape for the `reactions` table (emoji reactions on messages). */
export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

/** Row shape for the `repositories` table (legacy — real docs now use `documents`). */
export interface Repository {
  id: string
  title: string
  description: string | null
  course: string | null
  professor: string | null
  semester: string | null
  university: string | null
  department: string | null
  is_class: boolean
  is_public: boolean
  tags: string[]
  star_count: number
  contributor_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Legacy document row shape (pre-jsonb blocks migration). Content lives in Storage. */
export interface SupabaseDocument {
  id: string
  repo_id: string
  user_id: string
  title: string
  // content is stored in Supabase Storage bucket "documents", path: {userId}/{repoId}.md
  version: string
  tags: string[]
  created_at: string
  updated_at: string
}

/** Row shape for the `repository_contributors` join table. */
export interface RepositoryContributor {
  repo_id: string
  user_id: string
  role: 'owner' | 'contributor' | 'forked'
  aura_earned: number
  joined_at: string
}
