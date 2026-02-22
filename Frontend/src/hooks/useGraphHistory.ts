import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { TaskItem } from '../pages/GraphView'

export interface GraphHistoryItem {
  graphId: string
  title: string
  summary: string
  nodeCount: number
  versionNum: number
  createdAt: string
  updatedAt: string
  // Raw stored nodes/edges so caller can reconstruct TaskItems
  rawNodes: unknown[]
  rawEdges: unknown[]
}

/** Convert whatever format is stored in graph_versions.nodes → TaskItem[] */
export function rawNodesToItems(rawNodes: unknown[], rawEdges: unknown[]): TaskItem[] {
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) return []

  const first = rawNodes[0] as Record<string, unknown>

  // TaskItem format: { name: string, text: string }
  if (typeof first.name === 'string' && !('data' in first)) {
    return rawNodes as TaskItem[]
  }

  // ReactFlow Node format: { id, data: { label, text } }
  const idToLabel = new Map(
    rawNodes.map((n: any) => [n.id as string, n.data?.label as string]),
  )
  return (rawNodes as any[]).map(n => ({
    name:       n.data?.label ?? '',
    text:       n.data?.text  ?? '',
    depends_on: (rawEdges as any[])
      .filter(e => e.source === n.id)       // edges where this node is the SOURCE (parent)
      .map(e => idToLabel.get(e.target))    // → target label = child name
      .filter(Boolean) as string[],
  }))
}

export function useGraphHistory() {
  const { user } = useAuth()
  const [graphs, setGraphs]   = useState<GraphHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch graphs owned by user
      const { data: graphRows, error: gErr } = await supabase
        .from('graphs')
        .select('id, title, created_at, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (gErr || !graphRows?.length) { setGraphs([]); return }

      // 2. Fetch heads (pointer to latest version per graph)
      const graphIds = graphRows.map(g => g.id)
      const { data: heads } = await supabase
        .from('graph_heads')
        .select('graph_id, latest_version_id, version_num')
        .in('graph_id', graphIds)

      if (!heads?.length) { setGraphs([]); return }

      // 3. Fetch latest versions
      const versionIds = heads.map(h => h.latest_version_id).filter(Boolean)
      const { data: versions } = await supabase
        .from('graph_versions')
        .select('id, nodes, edges, summary, version_num')
        .in('id', versionIds)

      const versionById = new Map((versions ?? []).map(v => [v.id, v]))
      const headByGraphId = new Map(heads.map(h => [h.graph_id, h]))

      setGraphs(
        graphRows.flatMap(g => {
          const head = headByGraphId.get(g.id)
          if (!head) return []
          const ver = versionById.get(head.latest_version_id)
          const nodes: unknown[] = Array.isArray(ver?.nodes) ? ver.nodes : []
          const edges: unknown[] = Array.isArray(ver?.edges) ? ver.edges : []
          return [{
            graphId:    g.id,
            title:      g.title,
            summary:    ver?.summary ?? '',
            nodeCount:  nodes.length,
            versionNum: head.version_num,
            createdAt:  g.created_at,
            updatedAt:  g.updated_at,
            rawNodes:   nodes,
            rawEdges:   edges,
          }]
        }),
      )
    } catch (err) {
      console.error('[useGraphHistory] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [user?.id])

  return { graphs, loading, refresh }
}
