/**
 * @file Mermaid.tsx
 * React wrapper for the Mermaid diagram library.
 * Initialises Mermaid exactly once (module-level flag) with the Nootes
 * Botanical colour palette, then renders each chart into an SVG string
 * that is injected via `dangerouslySetInnerHTML`.
 */

import { useEffect, useState } from 'react'
import mermaid from 'mermaid'

/** Tracks whether `mermaid.initialize()` has been called yet (module singleton). */
let initialized = false

/**
 * Calls `mermaid.initialize()` with the Botanical theme variables the first
 * time it is invoked; subsequent calls are no-ops.
 */
function ensureInit() {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    themeVariables: {
      primaryColor: '#A3B18A',
      primaryTextColor: '#264635',
      primaryBorderColor: '#264635',
      lineColor: '#264635',
      secondaryColor: '#E9E4D4',
      tertiaryColor: '#f5f2ea',
      fontFamily: 'monospace',
      fontSize: '13px',
    },
  })
}

/** Monotonically increasing counter used to generate unique Mermaid render IDs. */
let uid = 0

/**
 * Renders a Mermaid diagram string to an SVG.
 *
 * Mermaid's async `render()` API appends a temporary sandbox element to
 * `<body>`; this component cleans it up after the SVG is obtained.
 * Displays a compact error badge if the diagram syntax is invalid.
 *
 * @param chart - Mermaid diagram source (e.g. `"graph TD; A-->B"`).
 */
export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chart.trim()) return
    ensureInit()
    setError(null)

    const id = `mermaid-render-${++uid}`

    const cleanup = () => {
      // Remove the hidden render sandbox mermaid appends to <body>
      document.getElementById(id)?.remove()
      // Remove any error elements mermaid may have injected into <body>
      document.querySelectorAll('[id^="dmermaid"], [id^="mermaid-"]').forEach(el => {
        if (el.id !== id && el.closest('#root') === null) el.remove()
      })
    }

    mermaid.render(id, chart)
      /** Store the rendered SVG string and remove the sandbox element. */
      .then(({ svg: rendered }) => { cleanup(); setSvg(rendered) })
      /** Show only the first line of the mermaid error (subsequent lines are verbose). */
      .catch((err: Error) => {
        cleanup()
        setError(err.message?.split('\n')[0] ?? 'Diagram error')
      })
  }, [chart])

  if (error) {
    return (
      <div className="font-mono text-[11px] text-sienna/70 bg-sienna/5 border border-sienna/20 squircle px-3 py-2">
        {error}
      </div>
    )
  }

  if (!svg) return <div className="h-8 flex items-center justify-center font-mono text-xs text-forest/25">Rendering…</div>

  return <div className="flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
