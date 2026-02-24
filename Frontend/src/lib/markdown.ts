/**
 * markdown.ts — lightweight JSON serialization utilities for document blocks.
 *
 * Blocks are stored as a JSON array in Supabase Storage (scratch) and in the
 * `documents.blocks` jsonb column (real docs). These helpers ensure a consistent
 * round-trip: `Block[] → JSON string → Block[]`.
 */
import { type Block, newBlock } from '../hooks/useDocument'

// ─── Serializer ────────────────────────────────────────────────────────────────

/**
 * Serializes a block array to a JSON string for storage.
 * @param blocks - The ordered list of blocks to serialize.
 * @returns A JSON string representation of the blocks array.
 */
export function blocksToJson(blocks: Block[]): string {
  return JSON.stringify(blocks)
}

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parses a JSON string back into a block array.
 * Falls back to a single blank paragraph block on any parse error or empty input.
 *
 * @param json - A JSON string produced by {@link blocksToJson}.
 * @returns The deserialized block array, or `[newBlock('paragraph')]` on failure.
 */
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
