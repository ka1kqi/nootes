import { useState, useEffect } from 'react'
import { SpotlightSearch } from './SpotlightSearch'

/* ------------------------------------------------------------------ */
/* AIAgentFab                                                          */
/* Bottom-left FAB. Click or ⌘K opens spotlight search overlay.       */
/* ------------------------------------------------------------------ */

export function AIAgentFab({ bottomClass = 'bottom-6' }: { bottomClass?: string }) {
  const [open, setOpen] = useState(false)

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Spotlight overlay */}
      <SpotlightSearch
        mode="overlay"
        open={open}
        onClose={() => setOpen(false)}
        placeholder="Ask noot anything…"
        variant="light"
      />

      {/* FAB button + tooltip wrapper */}
      <div className={`fixed ${bottomClass} left-6 z-50 group`}>
        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 pointer-events-none
          opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
          transition-all duration-150">
          <span className="font-mono text-[9px] text-parchment/80 bg-forest-deep/90 backdrop-blur-sm px-2.5 py-1 squircle-sm whitespace-nowrap shadow-sm">
            ⌘K
          </span>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="w-12 h-12 rounded-full bg-forest flex items-center justify-center
            shadow-[0_4px_20px_-4px_rgba(26,47,38,0.45)]
            hover:scale-110 hover:shadow-[0_6px_28px_-4px_rgba(26,47,38,0.6)]
            transition-all duration-200 cursor-pointer"
          aria-label="Open noot (⌘K)"
        >
          <svg width="26" height="18.5" viewBox="0 0 28 20" fill="none" aria-hidden>
            {/* Body */}
            <ellipse cx="14" cy="11.5" rx="6.5" ry="3.5"
              fill="rgba(233,228,212,0.08)"
              stroke="#E9E4D4" strokeWidth="1.15" strokeLinejoin="round" />
            {/* Head */}
            <path d="M 19 9.5 Q 23.5 7.8 25.5 11 Q 24.5 14.2 21.5 13 L 19 12 Z"
              fill="rgba(233,228,212,0.08)"
              stroke="#E9E4D4" strokeWidth="1.05" strokeLinejoin="round" />
            {/* Eye */}
            <circle cx="24" cy="10" r="0.7" fill="#E9E4D4" />
            {/* Nostril */}
            <circle cx="25.8" cy="11.2" r="0.38" fill="#E9E4D4" opacity="0.55" />
            {/* Front legs */}
            <path d="M 17.5 14.5 L 16.5 18.5" stroke="#E9E4D4" strokeWidth="1" strokeLinecap="round" />
            <path d="M 19 14.5 L 20.2 18" stroke="#E9E4D4" strokeWidth="1" strokeLinecap="round" />
            {/* Back legs */}
            <path d="M 10.5 14.5 L 9.5 18.5" stroke="#E9E4D4" strokeWidth="1" strokeLinecap="round" />
            <path d="M 12 14.5 L 13.5 18" stroke="#E9E4D4" strokeWidth="1" strokeLinecap="round" />
            {/* Tail — animated sway */}
            <path className="noot-tail"
              d="M 7.8 12.5 Q 3.5 12.5 1.5 9.5 Q 0.2 7.2 1.2 5"
              stroke="#8a9b75" strokeWidth="1.15" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </>
  )
}
