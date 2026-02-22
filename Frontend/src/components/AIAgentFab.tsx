import { useState } from 'react'

/* ------------------------------------------------------------------ */
/* AIAgentFab                                                          */
/* Reusable fixed bottom-left circular button with botanical AI icon  */
/* Hover: scale up + glow. Click: "AI Agent coming soon" tooltip.     */
/* ------------------------------------------------------------------ */

export function AIAgentFab() {
  const [tipVisible, setTipVisible] = useState(false)

  const handleClick = () => {
    console.log('AI Agent FAB clicked — coming soon')
    setTipVisible(t => !t)
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      {/* Tooltip */}
      {tipVisible && (
        <div className="animate-fade-up bg-forest text-parchment font-mono text-[10px] tracking-wider px-3 py-1.5 squircle-sm shadow-[0_4px_16px_-4px_rgba(26,47,38,0.4)] whitespace-nowrap">
          AI Agent coming soon ✦
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={handleClick}
        className="w-12 h-12 rounded-full bg-forest flex items-center justify-center
          shadow-[0_4px_20px_-4px_rgba(26,47,38,0.45)]
          hover:scale-110 hover:shadow-[0_6px_28px_-4px_rgba(26,47,38,0.6)]
          transition-all duration-200 cursor-pointer"
        aria-label="AI Agent (coming soon)"
      >
        {/* Botanical leaf + sparkle icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          {/* Leaf shape */}
          <path
            d="M12 21 C12 21 5 17 5 10 C5 6 8.5 3.5 12 3.5 C15.5 3.5 19 6 19 10 C19 17 12 21 12 21Z"
            stroke="#E9E4D4"
            strokeWidth="1.4"
            fill="rgba(233,228,212,0.08)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Centre vein */}
          <path d="M12 21 L12 10" stroke="#E9E4D4" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          {/* Side veins */}
          <path d="M12 12 L9 9.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <path d="M12 15 L15 12.5" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          {/* Sparkle — top-right */}
          <g opacity="0.85">
            <path d="M18.5 5 L18.5 7" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M17.5 6 L19.5 6" stroke="#8a9b75" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>
      </button>
    </div>
  )
}
