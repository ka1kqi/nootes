import { useRef, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { TaskItem } from '../pages/GraphView'

interface SaveOpts {
  title?: string
  summary?: string
  prompt?: string
}

export function useGraphPersistence() {
  const { user } = useAuth()
  const graphIdRef   = useRef<string | null>(null)
  const versionRef   = useRef(0)
  const [saving, setSaving] = useState(false)

  const _insertVersion = async (
    graphId: string,
    versionNum: number,
    nodes: unknown,
    edges: unknown,
    opts: SaveOpts = {},
  ) => {
    const { data: v, error: vErr } = await supabase
      .from('graph_versions')
      .insert({ graph_id: graphId, version_num: versionNum, nodes, edges, summary: opts.summary ?? null, prompt: opts.prompt ?? null })
      .select('id')
      .single()
    if (vErr || !v) throw vErr ?? new Error('Failed to insert version')
    return v.id as string
  }

  const _createGraph = async (
    nodes: unknown,
    edges: unknown,
    opts: SaveOpts,
  ) => {
    const title = opts.title ?? opts.prompt?.slice(0, 60) ?? 'Untitled Graph'

    const { data: g, error: gErr } = await supabase
      .from('graphs')
      .insert({ owner_id: user!.id, title })
      .select('id')
      .single()
    if (gErr || !g) throw gErr ?? new Error('Failed to create graph')

    const versionId = await _insertVersion(g.id, 1, nodes, edges, opts)

    await supabase
      .from('graph_heads')
      .insert({ graph_id: g.id, latest_version_id: versionId, version_num: 1 })

    graphIdRef.current = g.id
    versionRef.current = 1
  }

  const _updateGraph = async (nodes: unknown, edges: unknown) => {
    const nextVersion = versionRef.current + 1

    const versionId = await _insertVersion(graphIdRef.current!, nextVersion, nodes, edges)

    await supabase
      .from('graph_heads')
      .update({ latest_version_id: versionId, version_num: nextVersion })
      .eq('graph_id', graphIdRef.current)

    versionRef.current = nextVersion
  }

  /** Save the initial AI-generated TaskItems directly — called by sendPrompt */
  const saveItems = async (items: TaskItem[], opts: SaveOpts = {}) => {
    if (!user) return
    setSaving(true)
    try {
      await _createGraph(items, [], opts)
    } catch (err) {
      console.error('[GraphPersistence] saveItems failed:', err)
    } finally {
      setSaving(false)
    }
  }

  /** Save updated ReactFlow nodes/edges after expand or manual node — called by onGraphChanged */
  const upsert = async (nodes: Node[], edges: Edge[], opts: SaveOpts = {}) => {
    if (!user) return
    setSaving(true)
    try {
      if (!graphIdRef.current) {
        await _createGraph(nodes, edges, opts)
      } else {
        await _updateGraph(nodes, edges)
      }
    } catch (err) {
      console.error('[GraphPersistence] upsert failed:', err)
    } finally {
      setSaving(false)
    }
  }

  /** Point persistence at an existing graph loaded from history */
  const loadGraph = (graphId: string, versionNum: number) => {
    graphIdRef.current = graphId
    versionRef.current = versionNum
  }

  /** Reset when the conversation is cleared */
  const reset = () => {
    graphIdRef.current = null
    versionRef.current = 0
  }

  return { saving, saveItems, upsert, loadGraph, reset, graphId: graphIdRef.current }
}

