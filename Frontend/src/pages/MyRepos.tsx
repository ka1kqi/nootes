import { Link } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { useMyRepos } from '../hooks/useMyRepos'
import type { CreateRepoInput, RepoWithRole } from '../hooks/useMyRepos'

/* ------------------------------------------------------------------ */
/* Your Nootbooks — Personal Dashboard                                 */
/* Shows nootbooks you own, contribute to, and have forked             */
/* ------------------------------------------------------------------ */

type RepoStatus = 'active' | 'archived' | 'draft'
type RepoRole = 'owner' | 'contributor' | 'forked'

const FIELD_COLORS: Record<string, string> = {
  CS: '#264635',
  Math: '#A3B18A',
  Chem: '#5C7A6B',
  Physics: '#8B6E4E',
  General: '#D4A843',
}

function colorForRepo(repo: RepoWithRole): string {
  return FIELD_COLORS[repo.department || ''] ?? '#264635'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function RoleBadge({ role }: { role: RepoRole }) {
  const styles: Record<RepoRole, string> = {
    owner: 'bg-forest/10 text-forest/60 border-forest/15',
    contributor: 'bg-sage/10 text-sage border-sage/20',
    forked: 'bg-sienna/10 text-sienna/70 border-sienna/20',
  }
  return (
    <span className={`font-mono text-[9px] px-2 py-0.5 squircle-sm border ${styles[role]}`}>
      {role}
    </span>
  )
}

function StatusDot({ status }: { status: RepoStatus }) {
  const colors: Record<RepoStatus, string> = {
    active: 'bg-sage',
    draft: 'bg-amber',
    archived: 'bg-forest/30',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} title={status} />
}

/* ------------------------------------------------------------------ */
/* New Nootbook Modal                                                   */
/* ------------------------------------------------------------------ */

interface NewRepoModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: CreateRepoInput) => Promise<{ error: string | null }>
}

function NewRepoModal({ open, onClose, onCreate }: NewRepoModalProps) {
  const [form, setForm] = useState<CreateRepoInput>({
    title: '',
    description: '',
    course: '',
    professor: '',
    semester: '',
    university: '',
    department: '',
    is_class: true,
    is_public: true,
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof CreateRepoInput>(key: K, val: CreateRepoInput[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.tags?.includes(t)) {
      setForm(f => ({ ...f, tags: [...(f.tags || []), t] }))
    }
    setTagInput('')
  }

  const removeTag = (tag: string) =>
    setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await onCreate(form)
    setSubmitting(false)
    if (err) {
      setError(err)
    } else {
      setForm({ title: '', description: '', course: '', professor: '', semester: '', university: '', department: '', is_class: true, is_public: true, tags: [] })
      setTagInput('')
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-forest/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-cream border border-forest/15 squircle-xl shadow-[0_32px_80px_-16px_rgba(38,70,53,0.25)] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-forest/[0.08]">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-2">NEW NOOTBOOK</span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest leading-tight">
            Create a nootbook
          </h2>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-forest/40 mt-1">
            You'll be set as the owner automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Title */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
              Title <span className="text-sage">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Intro to Algorithms"
              className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="A short description of the nootbook..."
              className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all resize-none"
            />
          </div>

          {/* Row: Course + Organization */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
                Course / Topic Code
              </label>
              <input
                type="text"
                value={form.course}
                onChange={e => set('course', e.target.value)}
                placeholder="CS-UA 310"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
                University
              </label>
              <input
                type="text"
                value={form.university}
                onChange={e => set('university', e.target.value)}
                placeholder="NYU, MIT, Open Source…"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
          </div>

          {/* Row: Field + Semester / Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="CS, Design, Biology…"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
                Semester
              </label>
              <input
                type="text"
                value={form.semester}
                onChange={e => set('semester', e.target.value)}
                placeholder="Spring 2026"
                className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
          </div>

          {/* Professor */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
              Professor
            </label>
            <input
              type="text"
              value={form.professor}
              onChange={e => set('professor', e.target.value)}
              placeholder="Prof. Smith"
              className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="algorithms, graphs..."
                className="flex-1 bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2.5 bg-sage/10 border border-sage/20 squircle font-mono text-[10px] text-sage hover:bg-sage/20 transition-colors"
              >
                Add
              </button>
            </div>
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tags || []).map(tag => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] bg-forest/[0.06] text-forest/50 px-2 py-0.5 squircle-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-forest/30 hover:text-forest/60 ml-0.5 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_class}
                onClick={() => set('is_class', !form.is_class)}
                className={`w-9 h-5 rounded-full transition-colors relative ${form.is_class ? 'bg-sage' : 'bg-forest/15'}`}
              >
                <span className={`block w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform shadow-sm ${form.is_class ? 'translate-x-4.5' : 'translate-x-0.75'}`} />
              </button>
              <span className="font-mono text-[11px] text-forest/50 group-hover:text-forest/70 transition-colors">Class nootbook</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_public}
                onClick={() => set('is_public', !form.is_public)}
                className={`w-9 h-5 rounded-full transition-colors relative ${form.is_public ? 'bg-sage' : 'bg-forest/15'}`}
              >
                <span className={`block w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform shadow-sm ${form.is_public ? 'translate-x-4.5' : 'translate-x-0.75'}`} />
              </button>
              <span className="font-mono text-[11px] text-forest/50 group-hover:text-forest/70 transition-colors">Public</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="font-mono text-[11px] text-red-500 bg-red-50 border border-red-200 squircle px-4 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] text-forest/40 hover:text-forest/60 px-4 py-2.5 squircle transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="bg-forest text-parchment px-6 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)]"
            >
              {submitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Nootbook
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

type FilterTab = 'all' | 'active' | 'owned' | 'forked' | 'archived'

export default function MyRepos() {
  const { repos, loading, createRepo, deleteRepo } = useMyRepos()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenId) return
    const close = () => { setMenuOpenId(null); setConfirmingDeleteId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpenId])

  const handleCreate = useCallback(
    async (input: CreateRepoInput) => {
      return createRepo(input)
    },
    [createRepo],
  )

  const filtered = repos
    .filter(r => {
      if (filter === 'owned') return r.role === 'owner'
      if (filter === 'forked') return r.role === 'forked'
      // 'active' / 'archived' / 'all' — no status column yet, show all
      return true
    })
    .filter(
      r =>
        search === '' ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.course || '').toLowerCase().includes(search.toLowerCase()),
    )

  const ownedCount = repos.filter(r => r.role === 'owner').length
  const forkedCount = repos.filter(r => r.role === 'forked').length

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: repos.length },
    { key: 'owned', label: 'Owned', count: ownedCount },
    { key: 'forked', label: 'Forked', count: forkedCount },
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" breadcrumbs={[{ label: 'My Nootbooks' }]} />

      <div className="flex-1 overflow-y-auto stagger">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">DASHBOARD</span>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-3">
                Your Nootbooks
              </h1>
              <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/45">
                All the nootbooks you own, contribute to, or have forked.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Nootbook
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                label: 'Total Nootbooks',
                value: String(repos.length),
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                ),
              },
              {
                label: 'Owned',
                value: String(ownedCount),
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                  </svg>
                ),
              },
              {
                label: 'Forked',
                value: String(forkedCount),
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                ),
              },
            ].map(s => (
              <div key={s.label} className="bg-parchment border border-forest/10 squircle-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-sage/[0.08] squircle-sm flex items-center justify-center text-sage/60">
                  {s.icon}
                </div>
                <div>
                  <span className="font-[family-name:var(--font-display)] text-2xl text-forest block leading-none">
                    {s.value}
                  </span>
                  <span className="font-mono text-[9px] text-forest/30 tracking-[0.15em] uppercase">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="max-w-5xl mx-auto px-6 pb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px] relative">
              <svg
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your nootbooks..."
                className="w-full bg-parchment border border-forest/10 squircle pl-10 pr-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/30 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`font-mono text-[11px] px-3 py-2 squircle-sm transition-all flex items-center gap-1.5 ${
                    filter === tab.key
                      ? 'bg-forest text-parchment'
                      : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05] border border-forest/10'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[9px] px-1.5 py-0.5 squircle-sm ${
                      filter === tab.key ? 'bg-parchment/20' : 'bg-forest/[0.06]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nootbook list */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-parchment border border-forest/10 squircle-xl p-5 animate-pulse">
                  <div className="flex gap-5">
                    <div className="w-1 h-10 rounded-full bg-forest/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-forest/[0.06] rounded" />
                      <div className="h-6 w-48 bg-forest/[0.06] rounded" />
                      <div className="h-3 w-64 bg-forest/[0.06] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 stagger-fast">
              {filtered.map(repo => {
                const color = colorForRepo(repo)
                return (
                  <div key={repo.id} className="relative group">
                    <Link
                      to={`/editor/${repo.id}`}
                      state={{ name: repo.title, code: repo.course, org: repo.university, field: repo.department, description: repo.description }}
                      className="bg-parchment border border-forest/10 squircle-xl p-5 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all hover:border-forest/20 block"
                    >
                      <div className="flex items-start gap-5">
                        {/* Left: color bar */}
                        <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
                          <StatusDot status="active" />
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {repo.course && (
                              <span className="font-mono text-[10px] text-forest/30 tracking-wider">{repo.course}</span>
                            )}
                            <RoleBadge role={repo.role} />
                            {repo.university && (
                              <span className="font-mono text-[9px] text-forest/20 bg-forest/[0.04] px-1.5 py-0.5 squircle-sm">
                                {repo.university}
                              </span>
                            )}
                            {!repo.is_public && (
                              <span className="font-mono text-[9px] text-forest/30 bg-forest/[0.04] border border-forest/10 px-1.5 py-0.5 squircle-sm flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                private
                              </span>
                            )}
                          </div>

                          <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-1">
                            {repo.title}
                          </h3>

                          {repo.description && (
                            <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 mb-3">
                              {repo.description}
                            </p>
                          )}

                          {/* Tags */}
                          {repo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {repo.tags.slice(0, 4).map(tag => (
                                <span
                                  key={tag}
                                  className="font-mono text-[9px] bg-forest/[0.04] text-forest/30 px-1.5 py-0.5 squircle-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {repo.professor && (
                              <span className="font-mono text-[10px] text-forest/25">
                                {repo.professor}
                              </span>
                            )}
                            {repo.semester && (
                              <span className="font-mono text-[10px] text-forest/25">{repo.semester}</span>
                            )}
                          </div>
                        </div>

                        {/* Right: metadata — leave extra padding for the three-dot button */}
                        <div className="shrink-0 text-right hidden md:flex flex-col items-end gap-3 pr-8">
                          <div className="flex items-center gap-3 text-forest/25">
                            <span className="font-mono text-[10px] flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                              </svg>
                              {repo.contributor_count}
                            </span>
                            <span className="font-mono text-[10px]">{timeAgo(repo.updated_at)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-forest/20">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                            <span className="font-mono text-[10px]">{repo.star_count}</span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Three-dot menu — positioned outside Link so it doesn't trigger navigation */}
                    <div
                      className="absolute top-3.5 right-3.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === repo.id ? null : repo.id)
                          setConfirmingDeleteId(null)
                        }}
                        className="w-7 h-7 flex items-center justify-center squircle-sm text-forest/25 hover:text-forest hover:bg-forest/[0.07] opacity-0 group-hover:opacity-100 transition-all"
                        title="More options"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                        </svg>
                      </button>

                      {menuOpenId === repo.id && (
                        <div
                          className="absolute right-0 top-full mt-1 bg-cream border border-forest/10 squircle shadow-[0_8px_32px_-8px_rgba(38,70,53,0.15)] w-48 overflow-hidden z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {confirmingDeleteId === repo.id ? (
                            <div className="p-3">
                              <p className="font-mono text-[10px] text-forest/50 mb-3 leading-relaxed">
                                {repo.role === 'owner'
                                  ? 'Permanently delete for everyone?'
                                  : 'Remove from your nootbooks?'}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setConfirmingDeleteId(null); setMenuOpenId(null) }}
                                  className="flex-1 font-mono text-[10px] px-2 py-1.5 squircle-sm border border-forest/15 text-forest/50 hover:text-forest transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={async () => {
                                    setDeletingId(repo.id)
                                    await deleteRepo(repo.id)
                                    setDeletingId(null)
                                    setMenuOpenId(null)
                                    setConfirmingDeleteId(null)
                                  }}
                                  disabled={deletingId === repo.id}
                                  className="flex-1 font-mono text-[10px] px-2 py-1.5 squircle-sm bg-rust/70 text-parchment hover:bg-rust transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                  {deletingId === repo.id ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingDeleteId(repo.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 font-mono text-[11px] text-rust/60 hover:bg-rust/[0.05] hover:text-rust transition-colors text-left"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete nootbook
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {!loading && filtered.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-[family-name:var(--font-display)] text-3xl text-forest/20 mb-2">
                    {repos.length === 0 ? 'no nootbooks yet' : 'nothing here'}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-forest/30">
                    {repos.length === 0
                      ? 'Create your first nootbook to get started.'
                      : search
                      ? 'Try a different search term.'
                      : 'Switch tabs or create a new nootbook.'}
                  </p>
                  {repos.length === 0 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="mt-4 bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Create your first nootbook
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NewRepoModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </div>
  )
}
