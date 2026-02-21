import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const navLinks = [
  { path: '/repos', label: 'Nootbooks' },
  { path: '/my-repos', label: 'My Nootbooks' },
<<<<<<< HEAD
  { path: '/editor', label: 'Editor' },
=======
  { path: '/editor/scratch', label: 'Editor' },
>>>>>>> c26c2f9 (updates)
  { path: '/diff', label: 'Diff' },
  { path: '/chat', label: 'Chat' },
  { path: '/graph', label: 'Graph' },
]

const profileDropdownLinks = [
  { path: '/profile', label: 'Profile', icon: '◉' },
  { path: '/store', label: 'Store', icon: '✦' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export function Navbar({ variant = 'light', breadcrumbs }: { variant?: 'light' | 'dark'; breadcrumbs?: { label: string; href?: string }[] }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isDark = variant === 'dark'
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultBreadcrumbs = [
    { label: 'NYU' },
    { label: 'CS' },
    { label: 'Intro to Algorithms', href: '/editor/nyu-cs-algo' },
  ]
  const crumbs = breadcrumbs || defaultBreadcrumbs

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setDropdownOpen(true)
  }
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setDropdownOpen(false), 80)
  }

  const isProfileActive = ['/profile', '/my-repos', '/store', '/settings'].includes(location.pathname)

  return (
    <header className={`border-b ${isDark ? 'border-sage/15 bg-forest' : 'border-forest/10 bg-cream/80 backdrop-blur-sm'} sticky top-0 z-50`}>
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-4">
          <Link to="/home" className="logo-wave flex items-center gap-1 hover:opacity-80 transition-opacity">
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
                (location.pathname === link.path || (link.path === '/editor/scratch' && location.pathname.startsWith('/editor/')))
                  ? isDark ? 'bg-sage/20 text-parchment' : 'bg-forest text-parchment'
                  : isDark ? 'text-sage/40 hover:text-sage hover:bg-sage/10' : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className={`h-6 w-[2px] mx-2 ${isDark ? 'bg-sage/20' : 'bg-forest/15'}`} />

          {/* Profile button with hover dropdown */}
          <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button
                onClick={() => navigate('/profile')}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition-all cursor-pointer ${
                  isProfileActive
                    ? 'bg-sage text-forest border-sage ring-2 ring-sage/30'
                    : isDark ? 'bg-sage text-forest border-forest hover:ring-2 hover:ring-sage/20' : 'bg-forest text-parchment border-cream hover:ring-2 hover:ring-forest/20'
                }`}>
              AM
            </button>

            {/* Always mounted — CSS transitions drive open/close */}
            <div
              className={`absolute right-0 top-full mt-2 w-44 border squircle overflow-hidden
                transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right
                ${isDark ? 'bg-forest border-sage/15 shadow-[0_12px_40px_-8px_rgba(10,20,16,0.4)]' : 'bg-parchment border-forest/10 shadow-[0_12px_40px_-8px_rgba(26,47,38,0.14)]'}
                ${dropdownOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-[0.94] pointer-events-none'}`}
            >
              {profileDropdownLinks.map((link, i) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setDropdownOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 ${
                    i < profileDropdownLinks.length - 1 ? `border-b ${isDark ? 'border-sage/10' : 'border-forest/[0.06]'}` : ''
                  } ${
                    location.pathname === link.path
                      ? isDark ? 'bg-sage/15 text-parchment' : 'bg-forest/[0.06] text-forest'
                      : isDark ? 'text-sage/60 hover:bg-sage/10 hover:text-sage' : 'text-forest/50 hover:bg-forest/[0.04] hover:text-forest'
                  }`}
                >
                  <span className="text-[11px] opacity-50">{link.icon}</span>
                  <span className="font-[family-name:var(--font-body)] text-xs">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
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
