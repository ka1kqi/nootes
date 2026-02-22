import { createContext, useContext, useCallback, useRef } from 'react'
import type { Block, BlockType } from '../hooks/useDocument'
import { newBlock } from '../hooks/useDocument'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BlockSpec {
  type: BlockType
  content: string
  meta?: Record<string, unknown>
}

interface EditorBridge {
  /** true when the BlockEditor is mounted and registered */
  isEditorActive: boolean
  /** Append blocks to the current document */
  insertBlocks: (specs: BlockSpec[]) => void
  /** Called by Editor page to register its block-mutation callback */
  register: (cb: RegisterPayload) => void
  /** Called by Editor page on unmount */
  unregister: () => void
}

interface RegisterPayload {
  getBlocks: () => Block[]
  setBlocks: (blocks: Block[]) => void
}

// ─── Context ───────────────────────────────────────────────────────────────────

const EditorBridgeContext = createContext<EditorBridge>({
  isEditorActive: false,
  insertBlocks: () => {},
  register: () => {},
  unregister: () => {},
})

export function useEditorBridge() {
  return useContext(EditorBridgeContext)
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function EditorBridgeProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<RegisterPayload | null>(null)

  const register = useCallback((payload: RegisterPayload) => {
    ref.current = payload
  }, [])

  const unregister = useCallback(() => {
    ref.current = null
  }, [])

  const insertBlocks = useCallback((specs: BlockSpec[]) => {
    if (!ref.current) return
    const existing = ref.current.getBlocks()

    // Normalize content: arrays → newline-joined; strip list prefixes
    const normalizeContent = (type: BlockSpec['type'], raw: unknown): string => {
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

    const created: Block[] = specs.map(s => ({
      ...newBlock(s.type),
      content: normalizeContent(s.type, s.content),
      meta: s.meta ?? newBlock(s.type).meta,
    }))
    ref.current.setBlocks([...existing, ...created])
  }, [])

  const value: EditorBridge = {
    get isEditorActive() { return ref.current !== null },
    insertBlocks,
    register,
    unregister,
  }

  return (
    <EditorBridgeContext.Provider value={value}>
      {children}
    </EditorBridgeContext.Provider>
  )
}
