/**
 * EditorBridgeContext — cross-component bridge for injecting blocks into the
 * active BlockEditor instance from outside the editor tree (e.g. AI agent).
 *
 * The AI agent or any other caller can call `insertBlocks` to append content
 * to whichever editor is currently mounted, without needing a direct ref.
 */
import { createContext, useContext, useCallback, useRef, useState, useMemo } from 'react'
import type { Block, BlockType } from '../hooks/useDocument'
import { newBlock } from '../hooks/useDocument'

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Describes a single block to be inserted by the bridge. */
export interface BlockSpec {
  type: BlockType
  content: string
  meta?: Record<string, unknown>
}

/** Public API surface exposed by EditorBridgeContext. */
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

/** Callbacks the Editor page registers so the bridge can read/write its blocks. */
interface RegisterPayload {
  getBlocks: () => Block[]
  setBlocks: (blocks: Block[]) => void
}

// ─── Context ───────────────────────────────────────────────────────────────────

/** Default no-op context value used when no provider is present. */
const EditorBridgeContext = createContext<EditorBridge>({
  isEditorActive: false,
  insertBlocks: () => {},
  register: () => {},
  unregister: () => {},
})

/**
 * Hook to access the editor bridge from any component.
 * Returns the bridge even when no editor is active — callers must check `isEditorActive`.
 */
export function useEditorBridge() {
  return useContext(EditorBridgeContext)
}

// ─── Provider ──────────────────────────────────────────────────────────────────

/**
 * Provides the editor bridge to the app tree.
 * Wrap the app root with this to enable AI-agent → editor injection.
 */
export function EditorBridgeProvider({ children }: { children: React.ReactNode }) {
  /** Ref to the currently mounted editor's read/write callbacks. */
  const ref = useRef<RegisterPayload | null>(null)
  const [isActive, setIsActive] = useState(false)

  /** Registers an editor instance so the bridge can mutate its blocks. */
  const register = useCallback((payload: RegisterPayload) => {
    ref.current = payload
    setIsActive(true)
  }, [])

  /** Unregisters the editor on unmount, preventing stale mutations. */
  const unregister = useCallback(() => {
    ref.current = null
    setIsActive(false)
  }, [])

  /**
   * Appends one or more blocks to the active editor's document.
   * Normalizes list-item content by stripping markdown bullet/number prefixes.
   * No-op when no editor is registered.
   */
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

    // Construct full Block objects from each spec, applying the normalised content above
    const created: Block[] = specs.map(s => ({
      ...newBlock(s.type),
      content: normalizeContent(s.type, s.content),
      meta: s.meta ?? newBlock(s.type).meta,
    }))
    ref.current.setBlocks([...existing, ...created])
  }, [])

  // Memoize the bridge object; only recreates when editor activation state or callbacks change
  const value = useMemo((): EditorBridge => ({
    isEditorActive: isActive,
    insertBlocks,
    register,
    unregister,
  }), [isActive, insertBlocks, register, unregister])

  return (
    <EditorBridgeContext.Provider value={value}>
      {children}
    </EditorBridgeContext.Provider>
  )
}
