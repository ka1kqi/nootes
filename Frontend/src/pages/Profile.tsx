import { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

/* ------------------------------------------------------------------ */
/* Profile Page                                                        */
/* ------------------------------------------------------------------ */

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

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ full_name: '', display_name: '', organization: '' })

  // Animate in when editing opens, animate out before closing
  function openEdit() {
    setEditing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setEditVisible(true)))
  }
  function closeEdit() {
    setEditVisible(false)
    setSaveError(null)
    setTimeout(() => setEditing(false), 220)
  }

  // Sync draft when profile loads or edit opens
  useEffect(() => {
    if (profile && editing && editVisible) {
      setDraft({
        full_name:    profile.full_name    ?? '',
        display_name: profile.display_name ?? '',
        organization: profile.organization ?? '',
      })
    }
  }, [editing, profile])

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
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('owner_user_id', user!.id),
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

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:    draft.full_name.trim()    || profile?.full_name,
        display_name: draft.display_name.trim() || profile?.display_name,
        organization: draft.organization.trim() || null,
      })
      .eq('id', user.id)

    if (error) {
      setSaving(false)
      setSaveError(error.message)
      return
    }

    setSaving(false)
    closeEdit()
    setTimeout(() => window.location.reload(), 230)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

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

                  {editing ? (
                    /* ── Edit mode ── */
                    <div
                      className="flex flex-col gap-4 transition-all duration-200 ease-out"
                      style={{ opacity: editVisible ? 1 : 0, transform: editVisible ? 'translateY(0)' : 'translateY(6px)' }}
                    >
                      <h2 className="font-[family-name:var(--font-display)] text-lg text-forest">Edit Profile</h2>

                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] text-forest/40 tracking-wider uppercase">Full Name</label>
                        <input
                          type="text"
                          value={draft.full_name}
                          onChange={e => setDraft(d => ({ ...d, full_name: e.target.value }))}
                          placeholder="Your full name"
                          className="bg-cream border border-forest/15 squircle-sm px-3 py-2 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-forest/35 transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] text-forest/40 tracking-wider uppercase">Username</label>
                        <input
                          type="text"
                          value={draft.display_name}
                          onChange={e => setDraft(d => ({ ...d, display_name: e.target.value }))}
                          placeholder="@handle"
                          className="bg-cream border border-forest/15 squircle-sm px-3 py-2 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-forest/35 transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] text-forest/40 tracking-wider uppercase">School / University</label>
                        <input
                          type="text"
                          value={draft.organization}
                          onChange={e => setDraft(d => ({ ...d, organization: e.target.value }))}
                          placeholder="e.g. NYU"
                          className="bg-cream border border-forest/15 squircle-sm px-3 py-2 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-forest/35 transition-colors"
                        />
                      </div>

                      {saveError && (
                        <p className="font-mono text-[10px] text-rust/70">{saveError}</p>
                      )}

                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 bg-forest text-parchment font-[family-name:var(--font-body)] text-xs py-2 squircle-sm hover:bg-forest/85 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={closeEdit}
                          className="flex-1 border border-forest/15 text-forest/60 font-[family-name:var(--font-body)] text-xs py-2 squircle-sm hover:bg-forest/[0.04] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div className="transition-all duration-200 ease-out" style={{ opacity: editing ? 0 : 1 }}>
                      {/* Avatar */}
                      <div className="flex flex-col items-center mb-6">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name ?? profile.display_name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-cream shadow-lg mb-4"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-forest flex items-center justify-center text-3xl font-medium text-parchment border-4 border-cream shadow-lg mb-4">
                            {getInitials(profile.full_name ?? profile.display_name)}
                          </div>
                        )}
                        <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest">{profile.full_name ?? profile.display_name}</h1>
                        <span className="font-mono text-xs text-forest/35 mt-0.5">@{profile.display_name}</span>
                        {profile.email && (
                          <span className="font-mono text-xs text-forest/25 mt-0.5">{profile.email}</span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-2 mb-6">
                        {[
                          profile.organization ? { label: 'School', value: profile.organization } : null,
                          { label: 'Tier', value: profile.tier },
                          { label: 'Joined', value: formatJoinDate(profile.created_at) },
                        ].filter(Boolean).map(m => (
                          <div key={m!.label} className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-forest/30 tracking-wider uppercase">{m!.label}</span>
                            <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 capitalize">{m!.value}</span>
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

                      {/* Edit button */}
                      <button
                        onClick={openEdit}
                        className="w-full mt-5 border border-forest/15 text-forest/50 font-[family-name:var(--font-body)] text-xs py-2 squircle-sm hover:bg-forest/[0.04] hover:text-forest/70 transition-all cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column — activity */}
              <div className="space-y-10 stagger">

                {/* Contribution Graph */}
                <div>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">ACTIVITY</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Contribution Graph</h2>
                  <div className="bg-parchment border border-forest/10 squircle-xl p-5 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.04)]">
                    <div className="flex gap-[3px] flex-wrap" style={{ maxWidth: '100%' }}>
                      {Array.from({ length: 52 * 7 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[10px] h-[10px] rounded-[2px]"
                          style={{ backgroundColor: 'rgba(38,70,53,0.06)' }}
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

                {/* Top Noots */}
                <div>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">PINNED</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Top Noots</h2>
                  <div className="bg-parchment border border-forest/10 squircle-xl p-8 text-center shadow-[0_2px_24px_-8px_rgba(38,70,53,0.04)]">
                    <p className="font-[family-name:var(--font-display)] text-xl text-forest/25">No top noots yet</p>
                    <p className="font-mono text-[10px] text-forest/20 mt-1">Your most-starred noots will appear here</p>
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
