// ─── Shared write-to-editor parsing & normalisation ──────────────────────────
// Used by Home.tsx and SpotlightSearch.tsx so the logic stays in one place.

export interface BlockSpec {
  type: string
  content: unknown
  meta?: Record<string, unknown>
}

export interface ParsedWrite {
  blocks: BlockSpec[]
  confirmation: string
}

const TYPE_MAP: Record<string, string> = {
  ul: 'bullet_list',
  ol: 'ordered_list',
  steps: 'ordered_list',
  list: 'bullet_list',
  numbered_list: 'ordered_list',
}

/** Convert a single block's content to a plain string the BlockEditor can render. */
export function normalizeContent(type: string, raw: unknown): string {
  const lines = Array.isArray(raw)
    ? (raw as unknown[]).map(String)
    : String(raw ?? '').split('\n')
  if (type === 'bullet_list') {
    return lines.map(l => l.replace(/^\s*[-*]\s+/, '').trim()).filter(Boolean).join('\n')
  }
  if (type === 'ordered_list') {
    return lines.map(l => l.replace(/^\s*\d+[.)]\s+/, '').trim()).filter(Boolean).join('\n')
  }
  return Array.isArray(raw) ? (raw as string[]).join('\n') : String(raw ?? '')
}

/**
 * Normalise an array of blocks so every `content` field is a string
 * and every `type` alias is resolved. Safe to call before a Supabase insert
 * or before passing to EditorBridge.insertBlocks.
 */
export function normalizeBlocks(blocks: BlockSpec[]): BlockSpec[] {
  return blocks.map(b => {
    const type = TYPE_MAP[b.type] ?? b.type
    return { ...b, type, content: normalizeContent(type, b.content) }
  })
}

/**
 * Parse a raw LLM response that may contain a [WRITE_TO_EDITOR] block.
 * Returns null if the response is not a write response.
 */
export function parseWriteResponse(content: string): ParsedWrite | null {
  if (!content.trimStart().startsWith('[WRITE_TO_EDITOR]')) return null
  try {
    const body = content.replace(/^\s*\[WRITE_TO_EDITOR\]\s*/, '')
    const rawStart = body.indexOf('[')
    if (rawStart === -1) return null
    const afterBracket = body.slice(rawStart + 1).trimStart()
    const start = afterBracket.startsWith('{') ? rawStart : body.indexOf('[{')
    const end = body.lastIndexOf(']')
    if (start === -1 || end === -1 || end <= start) return null
    const parsed = JSON.parse(body.slice(start, end + 1))
    if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0].type !== 'string') return null
    const blocks = normalizeBlocks(parsed as BlockSpec[])
    const confirmation = body.slice(end + 1).trim() || `Wrote ${blocks.length} block(s) to your notes.`
    return { blocks, confirmation }
  } catch {
    return null
  }
}

/** Derive a document title from blocks (first h1) or fall back to the prompt. */
export function titleFromBlocks(blocks: BlockSpec[], fallback: string): string {
  const h1 = blocks.find(b => b.type === 'h1')
  const raw = (h1?.content as string | undefined) || fallback
  return raw.length > 80 ? raw.slice(0, 77) + '…' : raw
}
