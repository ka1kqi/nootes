import { useEffect, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false

function ensureInit() {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    suppressErrors: true,
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

let uid = 0

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
      .then(({ svg: rendered }) => { cleanup(); setSvg(rendered) })
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
