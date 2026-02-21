import { type Block, type BlockType, newBlock } from '../hooks/useDocument'

// ─── Serializer ────────────────────────────────────────────────────────────────

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map(b => {
      switch (b.type) {
        case 'h1':        return `# ${b.content}`
        case 'h2':        return `## ${b.content}`
        case 'h3':        return `### ${b.content}`
        case 'paragraph': return b.content || '<!-- empty -->'
        case 'quote':     return `> ${b.content}`
        case 'divider':   return `---`
        case 'latex':     return `$$\n${b.content}\n$$`
        case 'chemistry': return `\`\`\`chemistry\n${b.content}\n\`\`\``
        case 'diagram':   return `\`\`\`mermaid\n${b.content}\n\`\`\``
        case 'callout': {
          const calloutType = (b.meta?.calloutType as string) ?? 'info'
          return `\`\`\`callout ${calloutType}\n${b.content}\n\`\`\``
        }
        case 'table': {
          const caption = (b.meta?.caption as string) ?? ''
          return `\`\`\`table${caption ? ` ${caption}` : ''}\n${b.content}\n\`\`\``
        }
        case 'code': {
          const lang     = (b.meta?.language as string) ?? ''
          const filename = (b.meta?.filename as string) ?? ''
          const meta     = filename ? ` filename="${filename}"` : ''
          return `\`\`\`${lang}${meta}\n${b.content}\n\`\`\``
        }
        default:
          return b.content
      }
    })
    .join('\n\n')
}

// ─── Parser ────────────────────────────────────────────────────────────────────

export function markdownToBlocks(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.split('\n')
  let i = 0

  // Accumulate a plain paragraph being built up
  let paraLines: string[] = []

  function flushPara() {
    const text = paraLines.join('\n').trim()
    paraLines = []
    if (!text) return
    const b = newBlock('paragraph')
    b.content = text
    blocks.push(b)
  }

  while (i < lines.length) {
    const line = lines[i]

    // ── Empty paragraph marker ─────────────────────────────────────────────────
    if (line.trim() === '<!-- empty -->') {
      flushPara()
      const b = newBlock('paragraph')
      b.content = ''
      blocks.push(b)
      i++
      continue
    }

    // ── Fenced code block ──────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      flushPara()
      const info = line.slice(3).trim()       // e.g. "python filename="foo.py""
      const contentLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        contentLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      const content = contentLines.join('\n')

      // Determine block type from language tag
      const langMatch = info.match(/^(\S+)/)
      const lang = langMatch ? langMatch[1] : ''

      if (lang === 'chemistry') {
        const b = newBlock('chemistry')
        b.content = content
        blocks.push(b)
      } else if (lang === 'mermaid') {
        const b = newBlock('diagram')
        b.content = content
        blocks.push(b)
      } else if (lang === 'callout') {
        const calloutType = info.slice('callout'.length).trim() || 'info'
        const b = newBlock('callout')
        b.content = content
        b.meta = { calloutType }
        blocks.push(b)
      } else if (lang === 'table') {
        const caption = info.slice('table'.length).trim()
        const b = newBlock('table')
        b.content = content
        b.meta = { caption }
        blocks.push(b)
      } else {
        // Generic code block — extract optional filename="..." meta
        const filenameMatch = info.match(/filename="([^"]*)"/)
        const filename = filenameMatch ? filenameMatch[1] : ''
        const b = newBlock('code')
        b.content = content
        b.meta = { language: lang, filename }
        blocks.push(b)
      }
      continue
    }

    // ── Display math $$ ... $$ ─────────────────────────────────────────────────
    if (line.trim() === '$$') {
      flushPara()
      const contentLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '$$') {
        contentLines.push(lines[i])
        i++
      }
      i++ // skip closing $$
      const b = newBlock('latex')
      b.content = contentLines.join('\n')
      blocks.push(b)
      continue
    }

    // ── Headings ───────────────────────────────────────────────────────────────
    if (line.startsWith('### ')) {
      flushPara()
      const b = newBlock('h3')
      b.content = line.slice(4)
      blocks.push(b)
      i++
      continue
    }
    if (line.startsWith('## ')) {
      flushPara()
      const b = newBlock('h2')
      b.content = line.slice(3)
      blocks.push(b)
      i++
      continue
    }
    if (line.startsWith('# ')) {
      flushPara()
      const b = newBlock('h1')
      b.content = line.slice(2)
      blocks.push(b)
      i++
      continue
    }

    // ── Blockquote ─────────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      flushPara()
      const b = newBlock('quote')
      b.content = line.slice(2)
      blocks.push(b)
      i++
      continue
    }

    // ── Divider ────────────────────────────────────────────────────────────────
    if (line.trim() === '---') {
      flushPara()
      blocks.push(newBlock('divider'))
      i++
      continue
    }

    // ── Blank line — flush paragraph ──────────────────────────────────────────
    if (line.trim() === '') {
      flushPara()
      i++
      continue
    }

    // ── Regular paragraph text ─────────────────────────────────────────────────
    paraLines.push(line)
    i++
  }

  flushPara()

  // Always return at least one block so the editor isn't empty
  if (blocks.length === 0) {
    blocks.push(newBlock('paragraph'))
  }

  return blocks
}
