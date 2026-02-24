/**
 * @file CodeBlock.tsx
 * Syntax-highlighted, copy-enabled code block component.
 * Performs a simple single-pass Python tokeniser for inline highlighting;
 * non-Python languages are rendered without colour but still respect
 * line numbers, filename labels, and the light/dark theme prop.
 */

import { useState, useCallback } from 'react'

/** Semantic category assigned to each token during Python tokenisation. */
type TokenType = 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'operator' | 'decorator' | 'builtin' | 'plain'

/** A single syntactic token produced by the Python tokeniser. */
interface Token { text: string; type: TokenType }

/**
 * Tokenises a single line of Python source into {@link Token} objects.
 * The tokeniser works left-to-right with a greedy priority:
 * comment → decorator → string → number → word (keyword/builtin/function/plain) → operator → fallback.
 *
 * @param line - One line of source code (no trailing newline).
 * @returns Ordered array of tokens covering the entire input string.
 */
function tokenizePython(line: string): Token[] {
  const tokens: Token[] = []
  const keywords = ['def', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'import', 'from', 'class', 'with', 'as', 'try', 'except', 'finally', 'raise', 'yield', 'lambda', 'and', 'or', 'not', 'is', 'True', 'False', 'None', 'pass', 'break', 'continue']
  const builtins = ['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'round']

  let remaining = line
  while (remaining.length > 0) {
    if (remaining.startsWith('#')) { tokens.push({ text: remaining, type: 'comment' }); break }
    if (remaining.startsWith('@') && tokens.length === 0) { tokens.push({ text: remaining, type: 'decorator' }); break }
    const strMatch = remaining.match(/^(f?"""[\s\S]*?"""|f?'''[\s\S]*?'''|f?"[^"]*"|f?'[^']*')/)
    if (strMatch) { tokens.push({ text: strMatch[0], type: 'string' }); remaining = remaining.slice(strMatch[0].length); continue }
    const numMatch = remaining.match(/^\b\d+(\.\d+)?\b/)
    if (numMatch) { tokens.push({ text: numMatch[0], type: 'number' }); remaining = remaining.slice(numMatch[0].length); continue }
    const wordMatch = remaining.match(/^\b[a-zA-Z_]\w*\b/)
    if (wordMatch) {
      const w = wordMatch[0]
      if (keywords.includes(w)) tokens.push({ text: w, type: 'keyword' })
      else if (builtins.includes(w)) tokens.push({ text: w, type: 'builtin' })
      else if (remaining.slice(w.length).trimStart().startsWith('(')) tokens.push({ text: w, type: 'function' })
      else tokens.push({ text: w, type: 'plain' })
      remaining = remaining.slice(w.length); continue
    }
    const opMatch = remaining.match(/^(==|!=|<=|>=|<|>|\+|-|\*|\/|%|=|\(|\)|:|\[|\]|\{|\}|,|\.)/)
    if (opMatch) { tokens.push({ text: opMatch[0], type: 'operator' }); remaining = remaining.slice(opMatch[0].length); continue }
    tokens.push({ text: remaining[0], type: 'plain' }); remaining = remaining.slice(1)
  }
  return tokens
}

/** Maps each token type to its hex/rgba colour used in dark-theme renders. */
const colorMap: Record<TokenType, string> = {
  comment: '#5C7A6B',
  keyword: '#A3B18A',
  string: '#D4A843',
  number: '#D4A843',
  function: '#E9E4D4',
  builtin: '#8FB58A',
  decorator: '#A3B18A',
  operator: 'rgba(233,228,212,0.5)',
  plain: 'rgba(233,228,212,0.9)',
}

/**
 * Renders a syntax-highlighted code block with line numbers and a copy button.
 *
 * @param code     - Raw source code string (newline-separated lines).
 * @param language - Language identifier shown in the header (e.g. `"python"`).
 * @param filename - Optional filename label shown instead of the language.
 * @param theme    - Visual theme; `"dark"` uses the forest palette,
 *                   `"light"` uses cream/parchment tones.
 */
export function CodeBlock({
  code,
  language,
  filename,
  theme = 'dark',
}: {
  /** Raw source code to display. */
  code: string
  /** Language identifier for the header label. */
  language: string
  /** Optional filename shown in place of the language label. */
  filename?: string
  /** Light or dark colour theme. Defaults to `"dark"`. */
  theme?: 'dark' | 'light'
}) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')

  /** Copies the full source code to the clipboard and shows a brief "copied!" confirmation. */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const bgHeader = theme === 'dark' ? 'bg-forest' : 'bg-forest/10'
  const bgBody = theme === 'dark' ? 'bg-forest-deep' : 'bg-cream'
  const lineNumColor = theme === 'dark' ? 'text-sage/30' : 'text-forest/20'

  return (
    <div className="my-2 squircle overflow-hidden">
      <div className={`flex items-center justify-between ${bgHeader} px-4 py-2.5`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-parchment/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-parchment/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-parchment/20" />
          </div>
          <span className={`font-mono text-xs ${theme === 'dark' ? 'text-sage' : 'text-forest/60'}`}>{filename || language}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); handleCopy() }} className="font-mono text-xs text-parchment/50 hover:text-parchment transition-colors">
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <div className={`${bgBody} p-4 font-mono text-sm leading-relaxed overflow-x-auto`}>
        {lines.map((line, i) => (
          <div key={i} className="flex min-h-[1.5rem]">
            <span className={`${lineNumColor} w-10 shrink-0 select-none text-right pr-4 text-xs leading-relaxed`}>{i + 1}</span>
            <span className="flex-1" style={{ whiteSpace: 'pre' }}>
              {(() => {
                // Preserve leading whitespace as a raw span so indentation renders correctly
                const leading = line.match(/^(\s*)/)?.[0] || ''
                const trimmed = line.slice(leading.length)
                // Tokenise only the non-whitespace portion to avoid mangling indentation
                const tokens = tokenizePython(trimmed)
                return (
                  <>
                    {leading && <span>{leading}</span>}
                    {/* Render each token with its language-aware colour */}
                    {tokens.map((tok, j) => (
                      <span key={j} style={{ color: theme === 'dark' ? colorMap[tok.type] : undefined }} className={theme === 'light' ? (tok.type === 'keyword' ? 'text-forest font-semibold' : tok.type === 'comment' ? 'text-sage' : tok.type === 'string' || tok.type === 'number' ? 'text-amber' : tok.type === 'function' ? 'text-forest' : 'text-forest/80') : undefined}>
                        {tok.text}
                      </span>
                    ))}
                  </>
                )
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
