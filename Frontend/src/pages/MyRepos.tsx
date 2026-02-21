import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Your Repositories — Personal Dashboard                              */
/* Shows repos you own, contribute to, and have forked                 */
/* Clean card grid with status indicators and quick actions            */
/* ------------------------------------------------------------------ */

type RepoStatus = 'active' | 'archived' | 'draft'
type RepoRole = 'owner' | 'contributor' | 'forked'

interface UserRepo {
  id: string
  name: string
  code: string
  university: string
  dept: string
  role: RepoRole
  status: RepoStatus
  lastEdited: string
  personalBranch: string
  masterVersion: string
  personalVersion: string
  pendingMerges: number
  conflicts: number
  contributors: number
  description: string
  previewLatex?: string
  progress: number // 0-100
  color: string
}

const myRepos: UserRepo[] = [
  {
    id: 'nyu-cs-algo',
    name: 'Intro to Algorithms',
    code: 'CS-UA 310',
    university: 'NYU',
    dept: 'CS',
    role: 'contributor',
    status: 'active',
    lastEdited: '15 min ago',
    personalBranch: 'aisha/chain-rule',
    masterVersion: 'v3.2.1',
    personalVersion: 'v3.2.1+2',
    pendingMerges: 2,
    conflicts: 0,
    contributors: 47,
    description: 'Binary search, graph algorithms, dynamic programming.',
    previewLatex: 'O(\\log n)',
    progress: 78,
    color: '#264635',
  },
  {
    id: 'nyu-math-linalg',
    name: 'Linear Algebra',
    code: 'MATH-UA 140',
    university: 'NYU',
    dept: 'Math',
    role: 'owner',
    status: 'active',
    lastEdited: '2h ago',
    personalBranch: 'main',
    masterVersion: 'v2.8.0',
    personalVersion: 'v2.8.0',
    pendingMerges: 5,
    conflicts: 1,
    contributors: 31,
    description: 'Vector spaces, eigenvalues, SVD, matrix decompositions.',
    previewLatex: 'A = Q\\Lambda Q^{-1}',
    progress: 65,
    color: '#A3B18A',
  },
  {
    id: 'mit-cs-ml',
    name: 'Machine Learning',
    code: '6.036',
    university: 'MIT',
    dept: 'CS',
    role: 'forked',
    status: 'active',
    lastEdited: '1d ago',
    personalBranch: 'aisha/backprop-notes',
    masterVersion: 'v5.1.0',
    personalVersion: 'v5.0.2+4',
    pendingMerges: 0,
    conflicts: 0,
    contributors: 82,
    description: 'Supervised learning, neural networks, optimization.',
    previewLatex: '\\theta_{n+1} = \\theta_n - \\alpha \\nabla J(\\theta)',
    progress: 42,
    color: '#8B6E4E',
  },
  {
    id: 'nyu-chem-orgo',
    name: 'Organic Chemistry',
    code: 'CHEM-UA 226',
    university: 'NYU',
    dept: 'Chem',
    role: 'contributor',
    status: 'active',
    lastEdited: '3d ago',
    personalBranch: 'aisha/mechanisms',
    masterVersion: 'v1.4.0',
    personalVersion: 'v1.3.2+1',
    pendingMerges: 1,
    conflicts: 0,
    contributors: 15,
    description: 'Reaction mechanisms, stereochemistry, spectroscopy.',
    progress: 34,
    color: '#5C7A6B',
  },
  {
    id: 'study-group-dsa',
    name: 'DSA Interview Prep',
    code: 'STUDY',
    university: 'NYU',
    dept: 'General',
    role: 'owner',
    status: 'draft',
    lastEdited: '1w ago',
    personalBranch: 'main',
    masterVersion: 'v0.3.0',
    personalVersion: 'v0.3.0',
    pendingMerges: 0,
    conflicts: 0,
    contributors: 4,
    description: 'Collaborative prep notes for coding interviews.',
    previewLatex: '\\text{BFS} \\in O(V + E)',
    progress: 12,
    color: '#D4A843',
  },
  {
    id: 'berkeley-math-analysis',
    name: 'Real Analysis',
    code: 'MATH 104',
    university: 'Berkeley',
    dept: 'Math',
    role: 'forked',
    status: 'archived',
    lastEdited: '2mo ago',
    personalBranch: 'aisha/continuity',
    masterVersion: 'v4.0.0',
    personalVersion: 'v3.8.1+6',
    pendingMerges: 0,
    conflicts: 0,
    contributors: 24,
    description: 'Sequences, series, continuity, differentiability.',
    previewLatex: '\\lim_{n\\to\\infty} a_n = L',
    progress: 91,
    color: '#264635',
  },
]

const quickStats = [
  { label: 'Active Repos', value: '5', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg> },
  { label: 'Pending Merges', value: '8', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg> },
  { label: 'Conflicts', value: '1', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg> },
  { label: 'This Week', value: '+12', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg> },
]

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

type FilterTab = 'all' | 'active' | 'owned' | 'forked' | 'archived'

export default function MyRepos() {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = myRepos.filter(r => {
    if (filter === 'active') return r.status === 'active'
    if (filter === 'owned') return r.role === 'owner'
    if (filter === 'forked') return r.role === 'forked'
    if (filter === 'archived') return r.status === 'archived'
    return true
  }).filter(r =>
    search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())
  )

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: myRepos.length },
    { key: 'active', label: 'Active', count: myRepos.filter(r => r.status === 'active').length },
    { key: 'owned', label: 'Owned', count: myRepos.filter(r => r.role === 'owner').length },
    { key: 'forked', label: 'Forked', count: myRepos.filter(r => r.role === 'forked').length },
    { key: 'archived', label: 'Archived', count: myRepos.filter(r => r.status === 'archived').length },
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        variant="light"
        breadcrumbs={[{ label: 'My Repositories' }]}
      />

      <div className="flex-1 overflow-y-auto stagger">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">DASHBOARD</span>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-3">Your Repos</h1>
              <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/45">
                All the repositories you own, contribute to, or have forked.
              </p>
            </div>
            <button className="bg-forest text-parchment px-5 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Repo
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickStats.map(s => (
              <div key={s.label} className="bg-parchment border border-forest/10 squircle-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-sage/[0.08] squircle-sm flex items-center justify-center text-sage/60">
                  {s.icon}
                </div>
                <div>
                  <span className="font-[family-name:var(--font-display)] text-2xl text-forest block leading-none">{s.value}</span>
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
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your repos..."
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
                  <span className={`text-[9px] px-1.5 py-0.5 squircle-sm ${
                    filter === tab.key ? 'bg-parchment/20' : 'bg-forest/[0.06]'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repo list */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <div className="space-y-3 stagger-fast">
            {filtered.map(repo => (
              <Link
                key={repo.id}
                to="/editor"
                className="group bg-parchment border border-forest/10 squircle-xl p-5 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all hover:border-forest/20 block"
              >
                <div className="flex items-start gap-5">
                  {/* Left: status + color bar */}
                  <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: repo.color, opacity: 0.5 }} />
                    <StatusDot status={repo.status} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-forest/30 tracking-wider">{repo.code}</span>
                      <RoleBadge role={repo.role} />
                      <span className="font-mono text-[9px] text-forest/20 bg-forest/[0.04] px-1.5 py-0.5 squircle-sm">{repo.university}</span>
                      {repo.conflicts > 0 && (
                        <span className="font-mono text-[9px] text-amber bg-amber/10 px-2 py-0.5 squircle-sm flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                          {repo.conflicts} conflict{repo.conflicts !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-1">
                      {repo.name}
                    </h3>
                    <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 mb-3">{repo.description}</p>

                    {/* Branch + version info */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[10px] text-sage/60 bg-sage/[0.06] px-2 py-0.5 squircle-sm flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3H15a3 3 0 100-3H9a3 3 0 01-3-3zm0 0a3 3 0 103-3 3 3 0 00-3 3z" /></svg>
                        {repo.personalBranch}
                      </span>
                      <span className="font-mono text-[10px] text-forest/25">master {repo.masterVersion}</span>
                      {repo.personalVersion !== repo.masterVersion && (
                        <span className="font-mono text-[10px] text-amber/60">yours {repo.personalVersion}</span>
                      )}
                      {repo.pendingMerges > 0 && (
                        <span className="font-mono text-[10px] text-sage flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                          {repo.pendingMerges} pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: preview + metadata */}
                  <div className="shrink-0 text-right hidden md:flex flex-col items-end gap-3">
                    {repo.previewLatex && (
                      <div className="bg-forest/[0.03] border-l-2 border-sage/20 px-3 py-2 squircle-sm">
                        <KaTeX math={repo.previewLatex} className="text-[11px]" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-forest/25">
                      <span className="font-mono text-[10px] flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                        {repo.contributors}
                      </span>
                      <span className="font-mono text-[10px]">{repo.lastEdited}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-24">
                      <div className="h-1 bg-forest/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-sage/60 rounded-full transition-all" style={{ width: `${repo.progress}%` }} />
                      </div>
                      <span className="font-mono text-[9px] text-forest/20 mt-1 block">{repo.progress}% complete</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="font-[family-name:var(--font-display)] text-3xl text-forest/20 mb-2">nothing here yet</p>
                <p className="font-[family-name:var(--font-body)] text-sm text-forest/30">
                  {search ? 'Try a different search term.' : 'Create or fork a repository to get started.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
