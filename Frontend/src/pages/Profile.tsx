import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

/* ------------------------------------------------------------------ */
/* Profile Page                                                        */
/* User profile: avatar, stats, activity, contributions, repos        */
/* ------------------------------------------------------------------ */

// TODO: populate contribution graph from real document update timestamps
const activityGrid = Array.from({ length: 52 * 7 }, () => {
  const rand = Math.random()
  return rand > 0.7 ? (rand > 0.9 ? 3 : rand > 0.8 ? 2 : 1) : 0
})

// TODO: fetch top noots by engagement (stars + comments) once the star/comment system is built
const pinnedNotes = [
  {
    title: 'The Chain Rule',
    repo: 'Intro to Algorithms',
    latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
    stars: 42,
    comments: 7,
  },
  {
    title: 'Eigenvalue Decomposition',
    repo: 'Linear Algebra',
    latex: 'A = Q \\Lambda Q^{-1}',
    stars: 38,
    comments: 4,
  },
  {
    title: 'Gradient Descent',
    repo: 'Machine Learning',
    latex: '\\theta_{n+1} = \\theta_n - \\alpha \\nabla J(\\theta_n)',
    stars: 56,
    comments: 11,
  },
]

interface CountStats {
  noots: number
  merges: number
  nootbooks: number
}

interface ActivityItem {
  id: string
  title: string
  repo_title: string
  updated_at: string
  created_at: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatJoinDate(iso)
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    merged: 'bg-sage/15 text-sage',
    pushed: 'bg-forest/10 text-forest/60',
    commented: 'bg-amber/10 text-amber',
    forked: 'bg-sienna/10 text-sienna/70',
    updated: 'bg-forest/10 text-forest/60',
    created: 'bg-sage/15 text-sage',
  }
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 squircle-sm ${styles[action] || 'bg-forest/10 text-forest/50'}`}>
      {action}
    </span>
  )
}

export default function Profile() {
  const { profile, user } = useAuth()
  const [counts, setCounts] = useState<CountStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[] | null>(null)

  useEffect(() => {
    if (!user) return

    async function loadData() {
      const [nootsRes, mergesRes, nootbooksRes, activityRes] = await Promise.all([
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('merge_requests')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('status', 'merged'),
        supabase
          .from('repository_contributors')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('documents')
          .select('id, title, updated_at, created_at, repositories(title)')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(10),
      ])

      setCounts({
        noots: nootsRes.count ?? 0,
        merges: mergesRes.count ?? 0,
        nootbooks: nootbooksRes.count ?? 0,
      })

      if (activityRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActivity(activityRes.data.map((d: any) => ({
          id: d.id,
          title: d.title ?? '',
          repo_title: d.repositories?.title ?? 'Unknown nootbook',
          updated_at: d.updated_at,
          created_at: d.created_at,
        })))
      } else {
        setActivity([])
      }
    }

    loadData()
  }, [user])

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        variant="light"
        breadcrumbs={[{ label: profile?.display_name ?? 'Profile' }]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">

          {/* Loading state */}
          {!profile ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-sage/30 border-t-sage animate-spin" />
                <span className="font-mono text-xs text-forest/30">Loading profile…</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 stagger">

              {/* Left column — profile card */}
              <div>
                <div className="bg-parchment border border-forest/10 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-cream shadow-lg mb-4"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-forest flex items-center justify-center text-3xl font-medium text-parchment border-4 border-cream shadow-lg mb-4">
                        {getInitials(profile.display_name)}
                      </div>
                    )}
                    <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest">{profile.display_name}</h1>
                    {profile.email && (
                      <span className="font-mono text-xs text-forest/35 mt-0.5">{profile.email}</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-2 mb-6">
                    {[
                      { label: 'Tier', value: profile.tier },
                      { label: 'Joined', value: formatJoinDate(profile.created_at) },
                    ].map(m => (
                      <div key={m.label} className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-forest/30 tracking-wider uppercase">{m.label}</span>
                        <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 capitalize">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Aura', value: profile.aura.toLocaleString(), icon: '✦' },
                      { label: 'Noots', value: counts ? String(counts.noots) : '—', icon: null },
                      { label: 'Merges', value: counts ? String(counts.merges) : '—', icon: null },
                      { label: 'Nootbooks', value: counts ? String(counts.nootbooks) : '—', icon: null },
                    ].map(s => (
                      <div key={s.label} className="bg-cream border border-forest/[0.06] squircle-sm p-3 text-center">
                        <span className="font-[family-name:var(--font-display)] text-xl text-forest block">
                          {s.icon && <span className="text-sage mr-0.5">{s.icon}</span>}{s.value}
                        </span>
                        <span className="font-mono text-[9px] text-forest/30 tracking-wider uppercase">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Badges */}
                  {profile.badges.length > 0 && (
                    <div className="mt-4">
                      <span className="font-mono text-[9px] text-forest/25 tracking-wider uppercase block mb-2">Badges</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.badges.map(badge => (
                          <span key={badge} className="font-mono text-[10px] text-sage/70 bg-sage/[0.08] border border-sage/15 px-2 py-0.5 squircle-sm">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column — activity & content */}
              <div className="space-y-10 stagger">

                {/* Contribution graph */}
                <div>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">ACTIVITY</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Contribution Graph</h2>
                  {/* TODO: populate from real document update timestamps */}
                  <div className="bg-parchment border border-forest/10 squircle-xl p-5 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.04)]">
                    <div className="flex gap-[3px] flex-wrap" style={{ maxWidth: '100%' }}>
                      {activityGrid.map((level, i) => (
                        <div
                          key={i}
                          className="w-[10px] h-[10px] rounded-[2px] transition-colors"
                          style={{
                            backgroundColor: level === 0 ? 'rgba(38,70,53,0.06)' : level === 1 ? 'rgba(163,177,138,0.3)' : level === 2 ? 'rgba(163,177,138,0.6)' : '#A3B18A',
                          }}
                          title={`${level} contributions`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3 justify-end">
                      <span className="font-mono text-[9px] text-forest/25">Less</span>
                      {[0, 1, 2, 3].map(l => (
                        <div
                          key={l}
                          className="w-[10px] h-[10px] rounded-[2px]"
                          style={{
                            backgroundColor: l === 0 ? 'rgba(38,70,53,0.06)' : l === 1 ? 'rgba(163,177,138,0.3)' : l === 2 ? 'rgba(163,177,138,0.6)' : '#A3B18A',
                          }}
                        />
                      ))}
                      <span className="font-mono text-[9px] text-forest/25">More</span>
                    </div>
                  </div>
                </div>

                {/* Top Noots — placeholder until star/comment system is built */}
                {/* TODO: fetch top noots by engagement (stars + comments) once the star/comment system is built */}
                <div>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">PINNED</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Top Noots</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pinnedNotes.map((note, i) => (
                      <Link
                        key={i}
                        to="/editor"
                        className="group bg-parchment border border-forest/10 squircle-xl p-5 hover:shadow-[0_4px_24px_-8px_rgba(38,70,53,0.08)] hover:border-forest/20 transition-all"
                      >
                        <span className="font-mono text-[9px] text-forest/25 tracking-wider block mb-2">{note.repo}</span>
                        <h3 className="font-[family-name:var(--font-display)] text-lg text-forest group-hover:text-sage transition-colors mb-3">{note.title}</h3>
                        <div className="bg-forest/[0.03] border-l-2 border-sage/30 p-3 mb-3 squircle-sm">
                          <KaTeX math={note.latex} className="text-xs" />
                        </div>
                        <div className="flex items-center gap-3 text-forest/25">
                          <span className="font-mono text-[10px] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                            {note.stars}
                          </span>
                          <span className="font-mono text-[10px] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.28 48.28 0 005.557-.885c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                            {note.comments}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Activity Feed */}
                <div>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">RECENT</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Activity Feed</h2>
                  {activity === null ? (
                    <div className="flex items-center gap-2 py-8">
                      <div className="w-4 h-4 rounded-full border-2 border-sage/30 border-t-sage animate-spin" />
                      <span className="font-mono text-xs text-forest/30">Loading…</span>
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="font-[family-name:var(--font-display)] text-xl text-forest/30">No activity yet</p>
                      <p className="font-mono text-[10px] text-forest/20 mt-1">Start writing your first noot!</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {activity.map((item) => {
                        const isNew = item.created_at === item.updated_at
                        return (
                          <div key={item.id} className="flex items-start gap-4 py-4 border-b border-forest/[0.06] last:border-0">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-sage/40 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ActionBadge action={isNew ? 'created' : 'updated'} />
                                <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 font-medium">{item.repo_title}</span>
                                <span className="font-mono text-[10px] text-forest/20 ml-auto shrink-0">{timeAgo(item.updated_at)}</span>
                              </div>
                              <p className="font-[family-name:var(--font-body)] text-sm text-forest/50">{item.title || 'Untitled noot'}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
