import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Profile Page                                                        */
/* User profile: avatar, stats, activity, contributions, repos        */
/* ------------------------------------------------------------------ */

const user = {
  name: 'Aisha Malik',
  handle: '@aisha.m',
  initials: 'AM',
  university: 'NYU',
  department: 'Computer Science',
  year: 'Junior',
  bio: 'Algorithms nerd. I take nootes so I don\'t have to think twice.',
  aura: 1847,
  joinedDate: 'Sep 2024',
  streak: 23,
}

const stats = [
  { label: 'Aura', value: '1,847', icon: '✦' },
  { label: 'Nootes', value: '34', icon: null },
  { label: 'Merges', value: '127', icon: null },
  { label: 'Nootbooks', value: '8', icon: null },
]

const contributions = [
  { repo: 'Intro to Algorithms', action: 'merged', detail: 'Added binary search complexity analysis', time: '2h ago', aura: '+12' },
  { repo: 'Linear Algebra', action: 'pushed', detail: 'SVD proof with geometric intuition', time: '5h ago', aura: '+8' },
  { repo: 'Intro to Algorithms', action: 'commented', detail: 'Suggested recursive vs iterative comparison', time: '1d ago', aura: '+3' },
  { repo: 'Machine Learning', action: 'forked', detail: 'Forked from MIT 6.036 main', time: '2d ago', aura: '+5' },
  { repo: 'Intro to Algorithms', action: 'merged', detail: 'Chain rule section with Jacobian matrix', time: '3d ago', aura: '+15' },
  { repo: 'Organic Chemistry', action: 'pushed', detail: 'Added reaction mechanism diagrams', time: '4d ago', aura: '+10' },
]

const pinnedNotes = [
  {
    title: 'The Chain Rule',
    repo: 'Intro to Algorithms',
    latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)',
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

const activityGrid = Array.from({ length: 52 * 7 }, (_, i) => {
  const rand = Math.random()
  return rand > 0.7 ? (rand > 0.9 ? 3 : rand > 0.8 ? 2 : 1) : 0
})

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    merged: 'bg-sage/15 text-sage',
    pushed: 'bg-forest/10 text-forest/60',
    commented: 'bg-amber/10 text-amber',
    forked: 'bg-sienna/10 text-sienna/70',
  }
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 squircle-sm ${styles[action] || 'bg-forest/10 text-forest/50'}`}>
      {action}
    </span>
  )
}

export default function Profile() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        variant="light"
        breadcrumbs={[{ label: user.university }, { label: user.name }]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 stagger">

            {/* Left column — profile card */}
            <div>
              <div className="bg-parchment border border-forest/10 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-forest flex items-center justify-center text-3xl font-medium text-parchment border-4 border-cream shadow-lg mb-4">
                    {user.initials}
                  </div>
                  <h1 className="font-[family-name:var(--font-display)] text-3xl text-forest">{user.name}</h1>
                  <span className="font-mono text-xs text-forest/35 mt-0.5">{user.handle}</span>
                </div>

                {/* Bio */}
                <p className="font-[family-name:var(--font-display)] text-lg text-forest/40 text-center mb-6 leading-relaxed">
                  "{user.bio}"
                </p>

                {/* Meta */}
                <div className="space-y-2 mb-6">
                  {[
                    { label: 'University', value: user.university },
                    { label: 'Department', value: user.department },
                    { label: 'Year', value: user.year },
                    { label: 'Joined', value: user.joinedDate },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-forest/30 tracking-wider uppercase">{m.label}</span>
                      <span className="font-[family-name:var(--font-body)] text-xs text-forest/70">{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {stats.map(s => (
                    <div key={s.label} className="bg-cream border border-forest/[0.06] squircle-sm p-3 text-center">
                      <span className="font-[family-name:var(--font-display)] text-xl text-forest block">
                        {s.icon && <span className="text-sage mr-0.5">{s.icon}</span>}{s.value}
                      </span>
                      <span className="font-mono text-[9px] text-forest/30 tracking-wider uppercase">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Streak */}
                <div className="mt-4 bg-sage/[0.06] border border-sage/15 squircle-sm p-3 text-center">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-sage">{user.streak}</span>
                  <span className="font-mono text-[10px] text-sage/50 block">day streak</span>
                </div>
              </div>
            </div>

            {/* Right column — activity & content */}
            <div className="space-y-10 stagger">

              {/* Contribution graph */}
              <div>
                <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">ACTIVITY</span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Contribution Graph</h2>
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

              {/* Pinned Notes */}
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

              {/* Recent Activity */}
              <div>
                <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">RECENT</span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-4">Activity Feed</h2>
                <div className="space-y-0">
                  {contributions.map((c, i) => (
                    <div key={i} className="flex items-start gap-4 py-4 border-b border-forest/[0.06] last:border-0">
                      {/* Timeline dot */}
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-sage/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ActionBadge action={c.action} />
                          <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 font-medium">{c.repo}</span>
                          <span className="font-mono text-[10px] text-forest/20 ml-auto shrink-0">{c.time}</span>
                        </div>
                        <p className="font-[family-name:var(--font-body)] text-sm text-forest/50">{c.detail}</p>
                      </div>
                      <span className="font-mono text-[10px] text-sage/60 bg-sage/[0.06] px-2 py-0.5 squircle-sm shrink-0">{c.aura}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
