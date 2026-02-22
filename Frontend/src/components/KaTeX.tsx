import { useEffect, useRef } from 'react'
import katex from 'katex'

export function KaTeX({
  math,
  display = false,
  className = '',
}: {
  math: string
  display?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      // Strip $ / $$ delimiters — katex.render() expects bare LaTeX, not
      // markdown-style delimiters. The model sometimes emits $...$ anyway.
      let src = math.trim()
      if (src.startsWith("$$") && src.endsWith("$$") && src.length > 4) {
        src = src.slice(2, -2).trim()
      } else if (src.startsWith("$") && src.endsWith("$") && src.length > 2) {
        src = src.slice(1, -1).trim()
      } else if (src.includes("$")) {
        src = src.replace(/\$\$/g, "").replace(/\$/g, "")
      }
      try {
        katex.render(src, ref.current, {
          displayMode: display,
          throwOnError: false,
          trust: true,
          strict: false,
        })
      } catch {
        if (ref.current) ref.current.textContent = src
      }
    }
  }, [math, display])

  return <span ref={ref} className={className} />
}
