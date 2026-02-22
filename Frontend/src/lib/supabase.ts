import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'nootes-auth',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return fn()
    },
  },
})

// ─── DB Row Types ─────────────────────────────────────────────────────────────

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
  created_at: string
  updated_at: string
}

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

export interface ChannelMember {
  channel_id: string
  user_id: string
  joined_at: string
}

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

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

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

export interface RepositoryContributor {
  repo_id: string
  user_id: string
  role: 'owner' | 'contributor' | 'forked'
  aura_earned: number
  joined_at: string
}
