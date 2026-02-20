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
      try {
        katex.render(math, ref.current, {
          displayMode: display,
          throwOnError: false,
          trust: true,
          strict: false,
        })
      } catch {
        if (ref.current) ref.current.textContent = math
      }
    }
  }, [math, display])

  return <span ref={ref} className={className} />
}
