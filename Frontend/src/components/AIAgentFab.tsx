import { useState, useEffect } from 'react'
import { SpotlightSearch } from './SpotlightSearch'

/* ------------------------------------------------------------------ */
/* AIAgentFab                                                          */
/* Bottom-left FAB. Click or ⌘K opens spotlight search overlay.       */
/* ------------------------------------------------------------------ */

export function AIAgentFab() {
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

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-forest flex items-center justify-center
          shadow-[0_4px_20px_-4px_rgba(26,47,38,0.45)]
          hover:scale-110 hover:shadow-[0_6px_28px_-4px_rgba(26,47,38,0.6)]
          transition-all duration-200 cursor-pointer"
        aria-label="Open AI assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21 C12 21 5 17 5 10 C5 6 8.5 3.5 12 3.5 C15.5 3.5 19 6 19 10 C19 17 12 21 12 21Z"
            stroke="#E9E4D4"
            strokeWidth="1.4"
            fill="rgba(233,228,212,0.08)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 21 L12 10" stroke="#E9E4D4" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M12 12 L9 9.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <path d="M12 15 L15 12.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <g opacity="0.85">
            <path d="M18.5 5 L18.5 7" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M17.5 6 L19.5 6" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>
      </button>
    </>
  )
}
