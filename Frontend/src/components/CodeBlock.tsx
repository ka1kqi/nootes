import { useState, useCallback } from 'react'

type TokenType = 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'operator' | 'decorator' | 'builtin' | 'plain'

interface Token { text: string; type: TokenType }

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

export function CodeBlock({
  code,
  language,
  filename,
  theme = 'dark',
}: {
  code: string
  language: string
  filename?: string
  theme?: 'dark' | 'light'
}) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')

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
                const leading = line.match(/^(\s*)/)?.[0] || ''
                const trimmed = line.slice(leading.length)
                const tokens = tokenizePython(trimmed)
                return (
                  <>
                    {leading && <span>{leading}</span>}
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
