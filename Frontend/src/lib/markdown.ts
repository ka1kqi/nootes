import { type Block, newBlock } from '../hooks/useDocument'

// ─── Serializer ────────────────────────────────────────────────────────────────

export function blocksToJson(blocks: Block[]): string {
  return JSON.stringify(blocks)
}

// ─── Parser ────────────────────────────────────────────────────────────────────

export function jsonToBlocks(json: string): Block[] {
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [newBlock('paragraph')]
    }
    return parsed as Block[]
  } catch {
    return [newBlock('paragraph')]
  }
}
