import { Link, useLocation } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const navLinks = [
  { path: '/repos', label: 'Repos' },
  { path: '/my-repos', label: 'My Repos' },
  { path: '/editor', label: 'Editor' },
  { path: '/diff', label: 'Diff' },
  { path: '/chat', label: 'Chat' },
  { path: '/store', label: 'Store' },
]

export function Navbar({ variant = 'light', breadcrumbs }: { variant?: 'light' | 'dark'; breadcrumbs?: { label: string; href?: string }[] }) {
  const location = useLocation()
  const isDark = variant === 'dark'

  const defaultBreadcrumbs = [
    { label: 'NYU' },
    { label: 'CS' },
    { label: 'Intro to Algorithms', href: '/editor' },
  ]
  const crumbs = breadcrumbs || defaultBreadcrumbs

  return (
    <header className={`border-b ${isDark ? 'border-sage/15 bg-forest' : 'border-forest/10 bg-cream/80 backdrop-blur-sm'} sticky top-0 z-50`}>
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-4">
          <Link to="/" className="logo-wave flex items-center gap-1 hover:opacity-80 transition-opacity">
            <img src={logoImg} alt="Nootes" style={{ width: 30, height: 30 }} />
            <span className={`font-[family-name:var(--font-display)] text-2xl ${isDark ? 'text-parchment' : 'text-forest'} flex`}>
              {'nootes'.split('').map((letter, i) => (
                <span key={i} className="wave-letter">{letter}</span>
              ))}
            </span>
          </Link>
          <div className={`h-6 w-[2px] ${isDark ? 'bg-sage/20' : 'bg-forest/15'}`} />
          <nav className="flex items-center gap-1 text-xs tracking-wider uppercase">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronSmall className={isDark ? 'text-sage/30' : 'text-forest/25'} />}
                {crumb.href ? (
                  <Link to={crumb.href} className={`hover:underline ${i === crumbs.length - 1 ? `font-medium ${isDark ? 'text-parchment' : 'text-forest'}` : isDark ? 'text-sage/50' : 'text-forest/45'}`}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={i === crumbs.length - 1 ? `font-medium ${isDark ? 'text-parchment' : 'text-forest'}` : isDark ? 'text-sage/50' : 'text-forest/45'}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-[family-name:var(--font-body)] text-xs px-3 py-1.5 squircle-sm transition-all ${
                location.pathname === link.path
                  ? isDark ? 'bg-sage/20 text-parchment' : 'bg-forest text-parchment'
                  : isDark ? 'text-sage/40 hover:text-sage hover:bg-sage/10' : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className={`h-6 w-[2px] mx-2 ${isDark ? 'bg-sage/20' : 'bg-forest/15'}`} />
          <Link to="/profile" className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition-all ${
            location.pathname === '/profile'
              ? 'bg-sage text-forest border-sage ring-2 ring-sage/30'
              : isDark ? 'bg-sage text-forest border-forest hover:ring-2 hover:ring-sage/20' : 'bg-forest text-parchment border-cream hover:ring-2 hover:ring-forest/20'
          }`}>
            AM
          </Link>
        </div>
      </div>
    </header>
  )
}

function ChevronSmall({ className }: { className?: string }) {
  return (
    <svg className={`w-3 h-3 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" d="M9 5l7 7-7 7" />
    </svg>
  )
}
