import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { KaTeX } from '../components/KaTeX'

/* ------------------------------------------------------------------ */
/* Home — Authenticated dashboard                                       */
/* Quick actions, trending nootbooks, recent activity, featured nootes */
/* ------------------------------------------------------------------ */

const user = {
  name: 'Aisha Malik',
  initials: 'AM',
  university: 'NYU',
  aura: 1847,
  streak: 23,
}

const greetings = {
  earlyMorning: [
    "You're up early, {name} ✦",
    "Birds aren't even up yet ✦",
    "Early bird behavior ✦",
  ],
  morning: [
    "Hey {name} ✦",
    "Mornin' {name} ✦",
    "Coffee first, nootes second ✦",
  ],
  afternoon: [
    "Still here, {name}? ✦",
    "Post-lunch brain unlocked ✦",
    "Hey, {name} ✦",
  ],
  evening: [
    "Closing shift, {name} ✦",
    "One more noote ✦",
    "Good evening, {name} ✦",
  ],
  night: [
    "Time for bed, {name} ✦",
    "Late night {name}? ✦",
    "Past your bedtime {name} ✦",
  ],
}

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  let pool: string[]
  if (hour >= 5 && hour < 7)       pool = greetings.earlyMorning
  else if (hour >= 7 && hour < 12) pool = greetings.morning
  else if (hour >= 12 && hour < 18) pool = greetings.afternoon
  else if (hour >= 18 && hour < 22) pool = greetings.evening
  else                              pool = greetings.night
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return pick.replace('{name}', firstName)
}

const quickActions = [
  {
<<<<<<< HEAD
=======
    label: 'New Noot',
>>>>>>> c26c2f9 (updates)
    desc: 'Open the editor',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      </svg>
    ),
    to: '/editor/scratch',
    accent: 'bg-forest text-parchment',
  },
  {
    label: 'Browse Nootbooks',
<<<<<<< HEAD
    desc: 'Find class nootes',
=======
    desc: 'Find class noots',
>>>>>>> c26c2f9 (updates)
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    to: '/repos',
    accent: 'bg-sage/15 text-sage border border-sage/30',
  },
  {
    label: 'My Nootbooks',
<<<<<<< HEAD
    desc: 'Manage your nootes',
=======
    desc: 'Manage your noots',
>>>>>>> c26c2f9 (updates)
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 3L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
    to: '/my-repos',
    accent: 'bg-parchment border border-forest/10 text-forest/60',
  },
  {
    label: 'AI Chat',
<<<<<<< HEAD
    desc: 'Ask about your nootes',
=======
    desc: 'Ask about your noots',
>>>>>>> c26c2f9 (updates)
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    to: '/chat',
    accent: 'bg-parchment border border-forest/10 text-forest/60',
  },
]

const trendingRepos = [
  {
    name: 'Intro to Algorithms',
    university: 'NYU',
    dept: 'CS · CS-UA 310',
    notes: 23,
    contributors: 47,
    stars: 234,
    lastUpdated: '2h ago',
    color: '#264635',
  },
  {
    name: 'Linear Algebra',
    university: 'NYU',
    dept: 'Math · MATH-UA 140',
    notes: 18,
    contributors: 31,
    stars: 189,
    lastUpdated: '5h ago',
    color: '#A3B18A',
  },
  {
    name: 'Machine Learning',
    university: 'MIT',
    dept: 'CS · 6.036',
    notes: 41,
    contributors: 82,
    stars: 312,
    lastUpdated: '1h ago',
    color: '#5C7A6B',
  },
]

const recentActivity = [
  { action: 'merged', repo: 'Intro to Algorithms', detail: 'Added binary search complexity analysis', time: '2h ago', aura: '+12' },
  { action: 'pushed', repo: 'Linear Algebra', detail: 'SVD proof with geometric intuition', time: '5h ago', aura: '+8' },
  { action: 'commented', repo: 'Intro to Algorithms', detail: 'Suggested recursive vs iterative comparison', time: '1d ago', aura: '+3' },
]

const featuredNote = {
  title: 'The Bellman Equation',
  repo: 'Machine Learning · MIT 6.036',
  author: 'Aisha Malik',
  latex: "V^*(s) = \\max_{a} \\left[ R(s,a) + \\gamma \\sum_{s'} P(s'|s,a)\\,V^*(s') \\right]",
  stars: 56,
  comments: 11,
  desc: 'The foundation of dynamic programming and reinforcement learning — derived with geometric intuition.',
}

const activityMini = Array.from({ length: 7 * 15 }, () => {
  const r = Math.random()
  return r > 0.65 ? (r > 0.9 ? 3 : r > 0.8 ? 2 : 1) : 0
})

function ActionBadge({ action }: { action: string }) {
  const s: Record<string, string> = {
    merged: 'bg-sage/15 text-sage',
    pushed: 'bg-forest/10 text-forest/60',
    commented: 'bg-amber/10 text-amber',
  }
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 squircle-sm ${s[action] || 'bg-forest/10 text-forest/50'}`}>
      {action}
    </span>
  )
}

export default function Home() {
  const greeting = getGreeting(user.name.split(' ')[0])
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" breadcrumbs={[{ label: user.university }, { label: 'Home' }]} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10 stagger">

          {/* Welcome header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-1">DASHBOARD</span>
              <h1 className="font-[family-name:var(--font-display)] text-4xl text-forest leading-tight">
                {greeting}
              </h1>
              <p className="font-[family-name:var(--font-body)] text-sm text-forest/45 mt-1">
                {user.streak}-day streak · {user.aura.toLocaleString()} aura
              </p>
            </div>
            {/* Mini activity grid */}
            <div className="hidden md:block">
              <span className="font-mono text-[9px] text-forest/25 tracking-wider uppercase block mb-2 text-right">Last 15 weeks</span>
              <div className="flex gap-[3px]">
                {Array.from({ length: 15 }, (_, week) => (
                  <div key={week} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }, (_, day) => {
                      const level = activityMini[week * 7 + day]
                      return (
                        <div
                          key={day}
                          className="w-[9px] h-[9px] rounded-[2px]"
                          style={{
                            backgroundColor:
                              level === 0 ? 'rgba(38,70,53,0.06)' :
                              level === 1 ? 'rgba(163,177,138,0.3)' :
                              level === 2 ? 'rgba(163,177,138,0.6)' : '#A3B18A',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {quickActions.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className={`group flex flex-col gap-3 p-5 squircle-xl transition-all hover:shadow-[0_4px_24px_-8px_rgba(38,70,53,0.12)] hover:-translate-y-0.5 ${a.accent}`}
              >
                <span className="opacity-70">{a.icon}</span>
                <div>
                  <span className="font-[family-name:var(--font-body)] text-sm font-medium block">{a.label}</span>
                  <span className="font-mono text-[10px] opacity-50 block mt-0.5">{a.desc}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

            {/* Left column */}
            <div className="space-y-8">

              {/* Featured note */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-0.5">FEATURED</span>
<<<<<<< HEAD
                    <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest">Top Noote Today</h2>
=======
                    <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest">Top Noot Today</h2>
>>>>>>> c26c2f9 (updates)
                  </div>
                  <Link to="/repos" className="font-mono text-[10px] text-forest/30 hover:text-forest transition-colors">
                    browse all →
                  </Link>
                </div>
                <Link
                  to="/editor/scratch"
                  className="group block bg-parchment border border-forest/10 squircle-xl p-7 hover:shadow-[0_6px_32px_-8px_rgba(38,70,53,0.1)] hover:border-forest/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-mono text-[10px] text-forest/25 tracking-wider block mb-1">{featuredNote.repo}</span>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors">
                        {featuredNote.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <svg className="w-3.5 h-3.5 text-amber/60" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                      <span className="font-mono text-[11px] text-forest/40">{featuredNote.stars}</span>
                    </div>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-sm text-forest/50 mb-5 leading-relaxed">{featuredNote.desc}</p>
                  <div className="bg-forest/[0.03] border-l-4 border-sage/40 p-5 squircle-sm">
                    <KaTeX math={featuredNote.latex} display />
                  </div>
                  <div className="flex items-center gap-4 mt-5 text-forest/30">
                    <span className="font-mono text-[10px]">by {featuredNote.author}</span>
                    <span className="font-mono text-[10px] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.28 48.28 0 005.557-.885c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                      {featuredNote.comments}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Trending repos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-0.5">TRENDING</span>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest">Active Nootbooks</h2>
                  </div>
                  <Link to="/repos" className="font-mono text-[10px] text-forest/30 hover:text-forest transition-colors">
                    see all →
                  </Link>
                </div>
                <div className="space-y-2">
                  {trendingRepos.map((repo, i) => (
                    <Link
                      key={i}
                      to="/repos"
                      className="group flex items-center gap-5 bg-parchment border border-forest/10 squircle-xl px-6 py-4 hover:shadow-[0_4px_20px_-8px_rgba(38,70,53,0.08)] hover:border-forest/20 transition-all"
                    >
                      {/* Color swatch */}
                      <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-parchment text-xs font-mono" style={{ backgroundColor: repo.color }}>
                        {repo.university.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block truncate group-hover:text-forest transition-colors">
                          {repo.name}
                        </span>
                        <span className="font-mono text-[10px] text-forest/30">{repo.university} · {repo.dept}</span>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-center hidden sm:block">
                          <span className="font-[family-name:var(--font-display)] text-lg text-forest/70 block">{repo.notes}</span>
<<<<<<< HEAD
                          <span className="font-mono text-[9px] text-forest/25 uppercase">nootes</span>
=======
                          <span className="font-mono text-[9px] text-forest/25 uppercase">noots</span>
>>>>>>> c26c2f9 (updates)
                        </div>
                        <div className="text-center hidden sm:block">
                          <span className="font-[family-name:var(--font-display)] text-lg text-forest/70 block">{repo.contributors}</span>
                          <span className="font-mono text-[9px] text-forest/25 uppercase">contrib.</span>
                        </div>
                        <div className="flex items-center gap-1 text-forest/25">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                          <span className="font-mono text-[11px]">{repo.stars}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">

              {/* Aura card */}
              <div className="bg-forest squircle-xl p-6 text-parchment shadow-[0_4px_32px_-8px_rgba(26,47,38,0.3)]">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <span className="font-mono text-[9px] text-sage/40 tracking-[0.3em] uppercase block mb-1">YOUR AURA</span>
                    <span className="font-[family-name:var(--font-display)] text-5xl text-parchment">
                      <span className="text-sage mr-1">✦</span>{user.aura.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center text-sm font-medium text-parchment">
                    {user.initials}
                  </div>
                </div>
                {/* Progress bar to next tier (Grove = 500, Ancient Oak = 1000) */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-sage/40">Ancient Oak</span>
                    <span className="font-mono text-[10px] text-sage/40">2,000 aura</span>
                  </div>
                  <div className="h-1.5 bg-sage/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full transition-all"
                      style={{ width: `${Math.min((user.aura / 2000) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-sage/30 mt-1 block">{2000 - user.aura} until next tier</span>
                </div>
                <Link to="/store" className="block text-center font-mono text-[10px] text-sage/50 hover:text-sage transition-colors mt-4 border border-sage/15 squircle-sm py-2">
                  visit store →
                </Link>
              </div>

              {/* Recent activity */}
              <div className="bg-parchment border border-forest/10 squircle-xl p-6">
                <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-1">RECENT</span>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-forest mb-4">Your Activity</h2>
                <div className="space-y-0">
                  {recentActivity.map((a, i) => (
                    <div key={i} className={`flex items-start gap-3 py-3.5 ${i < recentActivity.length - 1 ? 'border-b border-forest/[0.06]' : ''}`}>
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <ActionBadge action={a.action} />
                          <span className="font-[family-name:var(--font-body)] text-xs text-forest/70 font-medium truncate">{a.repo}</span>
                        </div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 leading-relaxed">{a.detail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono text-[10px] text-sage/60 bg-sage/[0.06] px-2 py-0.5 squircle-sm">{a.aura}</span>
                        <span className="font-mono text-[9px] text-forest/20">{a.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/profile" className="block text-center font-mono text-[10px] text-forest/25 hover:text-forest transition-colors mt-4">
                  view full profile →
                </Link>
              </div>

              {/* Streak */}
              <div className="bg-sage/[0.07] border border-sage/20 squircle-xl p-5 text-center">
                <span className="font-[family-name:var(--font-display)] text-5xl text-sage block mb-1">{user.streak}</span>
                <span className="font-mono text-[10px] text-sage/50 tracking-widest uppercase">day streak</span>
                <p className="font-[family-name:var(--font-display)] text-base text-sage/40 mt-2">keep writing ✦</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
