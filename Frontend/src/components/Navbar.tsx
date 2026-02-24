/**
 * @file Navbar.tsx
 * Top-level sticky navigation bar used on all authenticated pages.
 * Renders the Nootes logo, primary nav links, and a profile avatar
 * that opens a hover-triggered dropdown for profile, store, settings,
 * and sign-out actions. Supports both `"light"` and `"dark"` variants
 * to match the underlying page background.
 */

import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'

/**
 * Derives up to two uppercase initials from a display name.
 *
 * @param name - Full display name (e.g. `"Jane Doe"`).
 * @returns Up to two uppercase initials (e.g. `"JD"`).
 */
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

/** Primary navigation links displayed in the centre of the navbar. */
const navLinks = [
  { path: '/repos', label: 'Public Nootbooks' },
  { path: '/my-repos', label: 'My Nootbooks' },
  { path: '/editor/scratch', label: 'Editor' },
  { path: '/chat', label: 'Chat' },
]

/** Links rendered inside the profile hover-dropdown menu. */
const profileDropdownLinks = [
  { path: '/profile', label: 'Profile', icon: '◉' },
  { path: '/store', label: 'Store', icon: '✦' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

/**
 * Sticky top navigation bar for authenticated views.
 *
 * @param variant - Colour scheme. `"light"` uses cream/forest tones;
 *                  `"dark"` uses forest/sage tones for pages with dark
 *                  backgrounds (e.g. the Editor page).
 */
export function Navbar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const { themeId } = useTheme()
  const isDark = variant === 'dark'

  const logoFilter = (() => {
    switch (themeId) {
      case 'dark-navy':
        // Tint to #c8d8e8 — light blue-grey
        return 'brightness(0) invert(1) sepia(1) hue-rotate(165deg) saturate(0.45) brightness(0.90)'
      case 'dark-void':
        // Tint to #dddae8 — light lavender-grey
        return 'brightness(0) invert(1) sepia(1) hue-rotate(205deg) saturate(0.22) brightness(0.93)'
      case 'dark-dusk':
        // Tint to #e8dfc8 — warm cream
        return 'brightness(0) invert(1) sepia(0.5) saturate(0.55) brightness(0.95)'
      default:
        return undefined
    }
  })()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Opens the profile dropdown immediately, cancelling any pending close timer. */
  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setDropdownOpen(true)
  }
  /** Closes the profile dropdown after a short delay, giving the cursor
   *  time to move into the dropdown before it disappears. */
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setDropdownOpen(false), 80)
  }


  return (
    <header className={`border-b ${isDark ? 'border-sage/15 bg-forest' : 'border-forest/10 bg-cream/80 backdrop-blur-sm'} sticky top-0 z-50`}>
      <div className="flex items-center justify-between px-6 h-14">
        <Link
          to="/home"
          onClick={e => { if (location.pathname === '/home') e.preventDefault() }}
          className="logo-wave flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <img src={logoImg} alt="Nootes" style={{ width: 30, height: 30, filter: logoFilter, transition: 'filter 0.3s ease' }} />
          <span className={`font-[family-name:var(--font-display)] text-2xl ${isDark ? 'text-parchment' : 'text-forest'} flex`}>
            {'nootes'.split('').map((letter, i) => (
              <span key={i} className="wave-letter">{letter}</span>
            ))}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-[family-name:var(--font-body)] text-xs px-3 py-1.5 squircle-sm transition-all ${(location.pathname === link.path || (link.path === '/editor/scratch' && location.pathname.startsWith('/editor/')))
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
              className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-medium border-2 transition-all cursor-pointer ${isDark
                  ? 'bg-sage text-forest border-forest hover:ring-2 hover:ring-sage/20'
                  : 'bg-forest text-parchment border-cream hover:ring-2 hover:ring-forest/20'
                }`}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                profile ? getInitials(profile.display_name) : '…'
              )}
            </button>

            {/* Always mounted — CSS transitions drive open/close */}
            <div
              className={`absolute right-0 top-full mt-2 w-44 border squircle overflow-hidden
                transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right
                ${isDark ? 'bg-forest border-sage/15 shadow-[0_12px_40px_-8px_rgba(10,20,16,0.4)]' : 'bg-parchment border-forest/10 shadow-[0_12px_40px_-8px_rgba(26,47,38,0.14)]'}
                ${dropdownOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-[0.94] pointer-events-none'}`}
            >
              {profileDropdownLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setDropdownOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 border-b ${isDark ? 'border-sage/10' : 'border-forest/[0.06]'
                    } ${location.pathname === link.path
                      ? isDark ? 'bg-sage/15 text-parchment' : 'bg-forest/[0.06] text-forest'
                      : isDark ? 'text-sage/60 hover:bg-sage/10 hover:text-sage' : 'text-forest/50 hover:bg-forest/[0.04] hover:text-forest'
                    }`}
                >
                  <span className="text-[11px] opacity-50">{link.icon}</span>
                  <span className="font-[family-name:var(--font-body)] text-xs">{link.label}</span>
                </Link>
              ))}
              <button
                onClick={async () => {
                  // Close the dropdown before signing out so there is no dangling open menu
                  setDropdownOpen(false)
                  await signOut()
                  navigate('/login')
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 cursor-pointer ${isDark ? 'text-rust/60 hover:bg-rust/10 hover:text-rust' : 'text-rust/50 hover:bg-rust/[0.05] hover:text-rust'}`}
              >
                <span className="text-[11px] opacity-50">⎋</span>
                <span className="font-[family-name:var(--font-body)] text-xs">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

