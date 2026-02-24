/**
 * @file NootMarkdown.tsx
 * Styled Markdown renderer built on `react-markdown` with remark-math
 * and rehype-katex plugins for inline and display LaTeX support.
 * All standard Markdown elements (paragraphs, headings, lists, code,
 * blockquotes, links, horizontalrules) are mapped to Nootes-themed
 * Tailwind classes. A `compact` prop tightens vertical rhythm for use
 * inside smaller panels such as the floating assistant.
 */

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

/** Props for the {@link NootMarkdown} component. */
interface Props {
  /** Markdown source string to render. */
  children: string
  /** Tighter spacing for compact panels (e.g. floating assistant). */
  compact?: boolean
}

/**
 * Renders a Markdown string with Nootes design-system styles and
 * inline/display LaTeX support via KaTeX.
 *
 * @param children - Raw Markdown source.
 * @param compact  - When `true`, uses `mb-1.5` instead of `mb-2` for
 *                   paragraph gaps, suitable for narrow chat UIs.
 */
export function NootMarkdown({ children, compact = false }: Props) {
  const gap = compact ? 'mb-1.5' : 'mb-2'
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        /** Paragraph with gap-dependent bottom margin; last child has no gap. */
        p({ children }) {
          return <p className={`${gap} last:mb-0 leading-relaxed`}>{children}</p>
        },
        /** Renders fenced code blocks as `<pre>` and inline backticks as styled `<code>`. */
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          // No language class + no newlines → treat as inline code
          const isInline = !match && !String(children).includes('\n')
          return isInline ? (
            <code
              className="font-mono text-[0.82em] bg-forest/[0.08] border border-forest/15 px-1.5 py-0.5 rounded"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="bg-forest/[0.05] border border-forest/10 rounded-lg p-3 overflow-x-auto my-2 text-left">
              <code className={`font-mono text-xs ${className ?? ''}`}>
                {String(children).replace(/\n$/, '')}
              </code>
            </pre>
          )
        },
        /** Unordered list with disc bullets and compact item spacing. */
        ul({ children }) {
          return <ul className={`list-disc pl-4 ${gap} space-y-0.5`}>{children}</ul>
        },
        /** Ordered list with decimal numbering and compact item spacing. */
        ol({ children }) {
          return <ol className={`list-decimal pl-5 ${gap} space-y-0.5`}>{children}</ol>
        },
        /** List item with relaxed line-height. */
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>
        },
        /** Bold text using semibold weight. */
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>
        },
        /** Italic text rendered at reduced opacity to soften the emphasis. */
        em({ children }) {
          return <em className="italic opacity-80">{children}</em>
        },
        /** H1 using the display font, sits flush with the top when first on the page. */
        h1({ children }) {
          return <h1 className="font-[family-name:var(--font-display)] text-lg font-medium mb-1 mt-2 first:mt-0">{children}</h1>
        },
        /** H2 using the display font, slightly smaller than h1. */
        h2({ children }) {
          return <h2 className="font-[family-name:var(--font-display)] text-base font-medium mb-1 mt-2 first:mt-0">{children}</h2>
        },
        /** H3 using the display font, tightest heading size. */
        h3({ children }) {
          return <h3 className="font-[family-name:var(--font-display)] text-sm font-medium mb-1 mt-1 first:mt-0">{children}</h3>
        },
        /** Blockquote with a sage left-border accent and italic style. */
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-sage/40 pl-3 italic opacity-70 my-2">{children}</blockquote>
        },
        /** External link that opens in a new tab; opacity changes on hover for feedback. */
        a({ href, children }) {
          return (
            <a href={href} className="underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity" target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        },
        /** Horizontal rule as a subtle forest-tinted separator. */
        hr() {
          return <hr className="border-forest/15 my-3" />
        },
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
