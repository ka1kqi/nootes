import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  getBezierPath,
  BaseEdge,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface TaskItem {
  name: string
  text: string
  depends_on?: string[]
}

export type ExpandFn = (item: TaskItem, context: string, ancestors: TaskItem[]) => Promise<{ items: TaskItem[]; summary: string }>
export type QueryFn  = (item: TaskItem, question: string, ancestors: TaskItem[]) => Promise<string>
type CircleNodeData = {
  label: string
  text: string
  index: number
  total: number
  isRoot: boolean
  isExpanded?: boolean
  ancestors?: TaskItem[]
}
type CircleNodeType = Node<CircleNodeData, 'circle'>

// ─── CUSTOM CURVED EDGE ───────────────────────────────────────────────────────
// ReactFlow's built-in 'bezier' ignores data.curvature; this custom edge uses it
// so that edges between far-apart nodes get higher curvature and don't all pile up.
const CurvedEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, data,
}: EdgeProps) => {
  const curvature = (data?.curvature as number | undefined) ?? 0.25
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature })
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
}

const edgeTypes: EdgeTypes = { curved: CurvedEdge }

// ─── DIMENSIONS ──────────────────────────────────────────────────────────────
const D  = 80
const NW = 120
const NH = D + 8 + 40

// Handles pinned to circle centre so edges route at any angle
const HS = {
  left: NW / 2, top: D / 2, bottom: 'auto', right: 'auto',
  transform: 'translate(-50%, -50%)',
  opacity: 0, width: 1, height: 1,
}

// ─── CIRCLE NODE ─────────────────────────────────────────────────────────────
const CircleNode = ({ data, selected }: NodeProps<CircleNodeType>) => {
  const acc = '#A3B18A'
  const bg  = selected ? '#264635' : '#E9E4D4'

  return (
    <>
      <Handle type="target" position={Position.Top}    style={HS} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: NW }}>
        <div style={{
          width: D, height: D, borderRadius: '50%',
          background: bg,
          border: `2px solid ${data.isExpanded ? acc : '#264635'}`,
          boxShadow: selected
            ? `0 0 0 4px ${acc}, 0 0 0 8px rgba(38,70,53,0.10)`
            : data.isExpanded
              ? `0 0 0 2px ${acc}`
              : '2px 2px 0 rgba(38,70,53,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s, box-shadow 0.2s, border-color 0.2s',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Dashed inner ring */}
          <div style={{
            position: 'absolute', inset: 7, borderRadius: '50%',
            border: `1px dashed ${selected ? acc : '#264635'}`,
            opacity: 0.2,
          }} />

          {data.isRoot ? (
            <div style={{
              width: 16, height: 16, background: selected ? acc : '#264635',
              transform: 'rotate(45deg)', opacity: 0.85,
            }} />
          ) : (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700, color: acc, letterSpacing: '0.04em',
            }}>
              {String(data.index + 1).padStart(2, '0')}
            </span>
          )}

          {/* Expanded indicator dot */}
          {data.isExpanded && (
            <div style={{
              position: 'absolute', bottom: 6, right: 6,
              width: 7, height: 7, borderRadius: '50%',
              background: acc, border: '1px solid #264635',
            }} />
          )}
        </div>

        <div style={{
          marginTop: 8, width: NW, textAlign: 'center',
          fontFamily: "'Gamja Flower', cursive",
          fontSize: data.isRoot ? 13 : 11,
          color: '#264635', lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {data.label}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={HS} />
    </>
  )
}

const nodeTypes: NodeTypes = { circle: CircleNode }

// ─── CIRCULAR LAYOUT ─────────────────────────────────────────────────────────
function buildCircularLayout(items: TaskItem[]) {
  const n = items.length
  if (n === 0) return { nodes: [], edges: [] }

  const nameToIdx = new Map(items.map((it, i) => [it.name, i]))
  const childrenOf: number[][] = Array.from({ length: n }, () => [])
  const parentsOf:  number[][] = Array.from({ length: n }, () => [])
  const edgeSet = new Set<string>()

  items.forEach((item, src) => {
    if (!Array.isArray(item.depends_on)) return
    item.depends_on.forEach(name => {
      const tgt = nameToIdx.get(name)
      if (tgt === undefined || tgt === src) return
      edgeSet.add(`${src}→${tgt}`)
      childrenOf[src].push(tgt)
      parentsOf[tgt].push(src)
    })
  })

  if (edgeSet.size === 0) {
    for (let i = 0; i < n - 1; i++) {
      edgeSet.add(`${i}→${i + 1}`)
      childrenOf[i].push(i + 1)
      parentsOf[i + 1].push(i)
    }
  }

  // Topological sort → clockwise order
  const inDeg = parentsOf.map(p => p.length)
  const order: number[] = []
  const queue = items.map((_, i) => i).filter(i => inDeg[i] === 0)
  while (queue.length) {
    const cur = queue.shift()!
    order.push(cur)
    for (const c of childrenOf[cur]) { if (--inDeg[c] === 0) queue.push(c) }
  }
  const orderedSet = new Set(order)
  items.forEach((_, i) => { if (!orderedSet.has(i)) order.push(i) })

  const MIN_ARC = Math.max(NW, NH) + 30
  const RADIUS  = Math.max((n * MIN_ARC) / (2 * Math.PI), 240)

  const pos: { x: number; y: number }[] = new Array(n)
  const posIdx = new Map<number, number>()
  order.forEach((origIdx, ringPos) => {
    posIdx.set(origIdx, ringPos)
    const angle = (2 * Math.PI * ringPos) / n - Math.PI / 2
    pos[origIdx] = { x: RADIUS * Math.cos(angle), y: RADIUS * Math.sin(angle) }
  })

  const roots = items.map((_, i) => i).filter(i => parentsOf[i].length === 0)

  const rfNodes: Node[] = items.map((item, idx) => ({
    id: `n${idx}`,
    type: 'circle' as const,
    position: { x: pos[idx].x - NW / 2, y: pos[idx].y - NH / 2 },
    data: { label: item.name, text: item.text, index: idx, total: n, isRoot: roots.includes(idx), ancestors: [] },
  }))

  const rfEdges: Edge[] = [...edgeSet].map(s => {
    const [src, tgt] = s.split('→').map(Number)
    const sp = posIdx.get(src) ?? 0
    const tp = posIdx.get(tgt) ?? 0
    const steps = Math.abs(tp - sp)
    const wrap  = Math.min(steps, n - steps)
    const curvature = 0.1 + (wrap / n) * 0.8
    return {
      id: `e${src}-${tgt}`,
      source: `n${src}`, target: `n${tgt}`,
      type: 'curved',
      style: { stroke: '#A3B18A', strokeWidth: 1.5, opacity: 0.7 },
      markerEnd: { type: MarkerType.Arrow, color: '#A3B18A', width: 9, height: 9 },
      data: { curvature },
    }
  })

  return { nodes: rfNodes, edges: rfEdges }
}

// ─── EXPANSION CIRCULAR POSITIONS ────────────────────────────────────────────
// Arrange expansion nodes in a ring centred at (parentCx, parentCy), using the
// same topo-sort → clockwise logic as buildCircularLayout.
// Returns a map from item name → canvas centre {x, y} (brand-new items only).
function getExpansionCircularPositions(
  parentCx: number, parentCy: number,
  items: TaskItem[],
  existingNames: Set<string>,
): Map<string, { x: number; y: number }> {
  const n = items.length
  if (n === 0) return new Map()

  const nameSet  = new Set(items.map(it => it.name))
  const childrenOf = new Map(items.map(it => [it.name, [] as string[]]))
  const parentsOf  = new Map(items.map(it => [it.name, [] as string[]]))

  items.forEach(it => {
    if (!Array.isArray(it.depends_on)) return
    it.depends_on.forEach(dep => {
      if (!nameSet.has(dep) || dep === it.name) return
      childrenOf.get(dep)!.push(it.name)
      parentsOf.get(it.name)!.push(dep)
    })
  })

  // Topological sort → clockwise ring order
  const inDeg = new Map(items.map(it => [it.name, parentsOf.get(it.name)!.length]))
  const order: string[] = []
  const queue = items.filter(it => inDeg.get(it.name) === 0).map(it => it.name)
  while (queue.length) {
    const cur = queue.shift()!
    order.push(cur)
    for (const child of childrenOf.get(cur) ?? []) {
      inDeg.set(child, inDeg.get(child)! - 1)
      if (inDeg.get(child) === 0) queue.push(child)
    }
  }
  // Append any cycle members not yet visited
  const orderedSet = new Set(order)
  items.forEach(it => { if (!orderedSet.has(it.name)) order.push(it.name) })

  const MIN_ARC = Math.max(NW, NH) + 30
  const RADIUS  = Math.max((n * MIN_ARC) / (2 * Math.PI), 240)

  // Offset the ring centre outward so the nearest child is ~1.5×RADIUS from
  // the parent, giving clear visual separation between parent and child ring.
  const mag = Math.sqrt(parentCx ** 2 + parentCy ** 2) || 1
  const ux = parentCx / mag
  const uy = parentCy / mag
  const cx = parentCx + ux * RADIUS * 1.8
  const cy = parentCy + uy * RADIUS * 1.8

  const positions = new Map<string, { x: number; y: number }>()
  order.forEach((name, ringPos) => {
    if (existingNames.has(name)) return
    const angle = (2 * Math.PI * ringPos) / n - Math.PI / 2
    positions.set(name, {
      x: cx + RADIUS * Math.cos(angle),
      y: cy + RADIUS * Math.sin(angle),
    })
  })

  return positions
}

// ─── PANEL STATE ─────────────────────────────────────────────────────────────
interface PanelState {
  item: TaskItem
  nodeId: string
  cx: number
  cy: number
  context: string
  loading: boolean
  summary: string | null
  error: string | null
  // explain section
  query: string
  queryLoading: boolean
  queryResult: string | null
  queryError: string | null
  // manual node creation
  newNodeName: string
  newNodeText: string
  // ancestor chain (from root down to this node's parent)
  ancestors: TaskItem[]
}

// ─── GRAPH VIEW ──────────────────────────────────────────────────────────────
export default function GraphView({ items, onExpand, onQuery }: { items: TaskItem[]; onExpand: ExpandFn; onQuery: QueryFn }) {
  const [panel, setPanel] = useState<PanelState | null>(null)
  const expCounter = useRef(0)

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildCircularLayout(items),
    [items]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  // Sync ReactFlow state when items reference changes (e.g. new graph with same length)
  useEffect(() => {
    setNodes(initNodes)
    setEdges(initEdges)
  }, [initNodes, initEdges, setNodes, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const d = node.data as CircleNodeData
    setPanel(prev =>
      prev?.nodeId === node.id
        ? null
        : {
            item: { name: d.label, text: d.text },
            nodeId: node.id,
            cx: node.position.x + NW / 2,
            cy: node.position.y + NH / 2,
            context: '',
            loading: false,
            summary: null,
            error: null,
            query: '',
            queryLoading: false,
            queryResult: null,
            queryError: null,
            newNodeName: '',
            newNodeText: '',
            ancestors: (d.ancestors ?? []),
          }
    )
  }, [])

  const handleExpand = useCallback(async () => {
    if (!panel || panel.loading) return
    setPanel(p => p ? { ...p, loading: true, error: null } : null)

    try {
      const { items: newItems, summary } = await onExpand(panel.item, panel.context, panel.ancestors)
      const counter = expCounter.current++

      setNodes(nds => {
        const existingByLabel = new Map(nds.map(nd => [(nd.data as CircleNodeData).label, nd.id]))
        const existingNames = new Set(existingByLabel.keys())
        const dagPositions = getExpansionCircularPositions(panel!.cx, panel!.cy, newItems, existingNames)

        let brandNewIdx = 0
        const nameToId = new Map<string, string>()
        newItems.forEach(item => {
          if (existingByLabel.has(item.name)) {
            nameToId.set(item.name, existingByLabel.get(item.name)!)
          } else {
            nameToId.set(item.name, `exp-${counter}-${brandNewIdx++}`)
          }
        })

        const brandNewItems = newItems.filter(it => !existingNames.has(it.name))
        const newNodes: Node[] = brandNewItems.map(item => {
          const id = nameToId.get(item.name)!
          const pos = dagPositions.get(item.name)!
          return {
            id,
            type: 'circle' as const,
            position: { x: pos.x - NW / 2, y: pos.y - NH / 2 },
            data: { label: item.name, text: item.text, index: 0, total: brandNewItems.length, isRoot: false, ancestors: [...(panel!.ancestors ?? []), { name: panel!.item.name, text: panel!.item.text }] },
          }
        })

        // Compute edges here so we don't nest setState calls
        const existingEdgeSet = new Set<string>()
        const edgesToAdd: Edge[] = []
        const sourceOutCount = new Map<string, number>()
        const getNextCurvature = (src: string) => {
          const n = sourceOutCount.get(src) ?? 0
          sourceOutCount.set(src, n + 1)
          const side = n % 2 === 0 ? 1 : -1
          return side * (0.2 + Math.floor(n / 2) * 0.15)
        }
        const addEdge = (src: string, tgt: string, idx: number): Edge | null => {
          const key = `${src}→${tgt}`
          if (existingEdgeSet.has(key)) return null
          existingEdgeSet.add(key)
          return {
            id: `exp-edge-${counter}-${idx}`,
            source: src, target: tgt,
            type: 'curved',
            style: { stroke: '#A3B18A', strokeWidth: 1.5, opacity: 0.6, strokeDasharray: '5 3' },
            markerEnd: { type: MarkerType.Arrow, color: '#A3B18A', width: 9, height: 9 },
            data: { curvature: getNextCurvature(src) },
          }
        }
        let edgeIdx = 0
        const newNameSet = new Set(newItems.map(it => it.name))
        newItems.forEach(item => {
          if (!Array.isArray(item.depends_on)) return
          item.depends_on.forEach(dep => {
            const srcId = newNameSet.has(dep) ? nameToId.get(dep) : existingByLabel.get(dep)
            const tgtId = nameToId.get(item.name)
            if (srcId && tgtId) { const e = addEdge(srcId, tgtId, edgeIdx++); if (e) edgesToAdd.push(e) }
          })
        })
        const hasInternalParent = new Set(
          newItems.flatMap(it => (it.depends_on ?? []).filter(d => newNameSet.has(d)).map(() => it.name))
        )
        newItems.forEach(item => {
          if (!hasInternalParent.has(item.name)) {
            const tgtId = nameToId.get(item.name)
            if (tgtId) { const e = addEdge(panel!.nodeId, tgtId, edgeIdx++); if (e) edgesToAdd.push(e) }
          }
        })

        // Apply edges outside this updater to avoid nested setState
        setTimeout(() => setEdges(eds => {
          const existingKeys = new Set(eds.map(e => `${e.source}→${e.target}`))
          return [...eds, ...edgesToAdd.filter(e => !existingKeys.has(`${e.source}→${e.target}`))]
        }), 0)

        return [
          ...nds.map(nd =>
            nd.id === panel!.nodeId
              ? { ...nd, data: { ...nd.data, isExpanded: true } }
              : nd
          ),
          ...newNodes,
        ]
      })
      setPanel(p => p ? { ...p, loading: false, summary, context: '' } : null)
    } catch (err) {
      setPanel(p => p
        ? { ...p, loading: false, error: err instanceof Error ? err.message : 'Failed to expand' }
        : null
      )
    }
  }, [panel, onExpand, setNodes, setEdges])

  const handleQuery = useCallback(async () => {
    if (!panel || panel.queryLoading || !panel.query.trim()) return
    setPanel(p => p ? { ...p, queryLoading: true, queryError: null, queryResult: null } : null)
    try {
      const result = await onQuery(panel.item, panel.query, panel.ancestors)
      setPanel(p => p ? { ...p, queryLoading: false, queryResult: result, query: '' } : null)
    } catch (err) {
      setPanel(p => p
        ? { ...p, queryLoading: false, queryError: err instanceof Error ? err.message : 'Failed to get explanation' }
        : null
      )
    }
  }, [panel, onQuery])

  const manualCounter = useRef(0)

  const handleCreateManualNode = useCallback(() => {
    if (!panel || !panel.newNodeName.trim()) return
    const name = panel.newNodeName.trim()
    const text = panel.newNodeText.trim()
    const id = `manual-${manualCounter.current++}`

    // Place new node offset below-right of parent
    const angle = Math.random() * Math.PI * 2
    const dist = 220
    const nx = panel.cx + Math.cos(angle) * dist - NW / 2
    const ny = panel.cy + Math.sin(angle) * dist - NH / 2

    const newNode: Node = {
      id,
      type: 'circle' as const,
      position: { x: nx, y: ny },
      data: { label: name, text: text || name, index: 0, total: 1, isRoot: false, ancestors: [...(panel!.ancestors ?? []), { name: panel!.item.name, text: panel!.item.text }] },
    }

    setNodes(nds => [...nds, newNode])
    setEdges(eds => [
      ...eds,
      {
        id: `manual-edge-${id}`,
        source: panel.nodeId,
        target: id,
        type: 'curved',
        style: { stroke: '#A3B18A', strokeWidth: 1.5, opacity: 0.7, strokeDasharray: '4 3' },
        markerEnd: { type: MarkerType.Arrow, color: '#A3B18A', width: 9, height: 9 },
        data: { curvature: 0.25 },
      },
    ])
    setPanel(p => p ? { ...p, newNodeName: '', newNodeText: '' } : null)
  }, [panel, setNodes, setEdges])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        style={{ background: 'transparent' }}
        minZoom={0.5}
        maxZoom={2.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgba(38,70,53,0.1)" />
        <Controls
          style={{ background: '#264635', border: '1px solid #A3B18A', borderRadius: 10, boxShadow: 'none', overflow: 'hidden' }}
          showInteractive={false}
        />
      </ReactFlow>

      {/* ── Node panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {panel && (
          <motion.div
            key={panel.nodeId}
            initial={{ x: 14, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 14, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', top: 12, right: 12, width: 284,
              background: '#F5F0E8', border: '2px solid #264635',
              borderRadius: 14,
              boxShadow: '4px 4px 0 rgba(38,70,53,0.14)',
              zIndex: 20, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100% - 24px)',
            }}
          >
            {/* Header */}
            <div style={{
              background: '#264635', padding: '10px 14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '12px 12px 0 0',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                subtask
              </span>
              <button onClick={() => setPanel(null)} aria-label="Close panel" style={{
                background: 'none', border: 'none', color: '#A3B18A',
                cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px',
              }}>✕</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>

            {/* Task info */}
            <div style={{ padding: '14px 16px 12px', flexShrink: 0 }}>
              <h3 style={{
                fontFamily: "'Gamja Flower', cursive", fontSize: 18,
                color: '#264635', margin: '0 0 8px', lineHeight: 1.3,
              }}>
                {panel.item.name}
              </h3>
              <p style={{ fontSize: 11, color: '#1A1A18', lineHeight: 1.75, margin: 0 }}>
                {panel.item.text}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#264635', opacity: 0.12, margin: '0 16px', flexShrink: 0 }} />

            {/* Explain form */}
            <div style={{ padding: '12px 16px 14px', flexShrink: 0 }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}>
                ask · get explanation
              </p>
              <textarea
                value={panel.query}
                onChange={e => setPanel(p => p ? { ...p, query: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuery() }}
                placeholder="Ask anything about this task…"
                rows={2}
                disabled={panel.queryLoading}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#E9E4D4', border: '1.5px solid #A3B18A',
                  borderRadius: 8,
                  padding: '8px 10px', resize: 'none',
                  fontFamily: 'inherit', fontSize: 12,
                  color: '#1A1A18', outline: 'none', lineHeight: 1.6,
                  opacity: panel.queryLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={handleQuery}
                disabled={panel.queryLoading || !panel.query.trim()}
                style={{
                  marginTop: 6, width: '100%',
                  background: '#264635',
                  color: '#E9E4D4', border: 'none',
                  borderRadius: 8,
                  padding: '8px 0', cursor: (panel.queryLoading || !panel.query.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: (!panel.query.trim() && !panel.queryLoading) ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {panel.queryLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 10, height: 10, border: '1.5px solid #E9E4D4', borderTopColor: 'transparent', borderRadius: '50%' }}
                    />
                    thinking…
                  </>
                ) : '◎ explain'}
              </button>
              {panel.queryError && (
                <p style={{ marginTop: 8, fontSize: 11, color: '#5C4A32', fontFamily: 'monospace', margin: '8px 0 0' }}>
                  ⚠ {panel.queryError}
                </p>
              )}
            </div>

            {/* Explanation result */}
            <AnimatePresence>
              {panel.queryResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div style={{ height: 2, background: '#A3B18A', opacity: 0.5 }} />
                  <div style={{ padding: '10px 16px 12px', background: 'rgba(163,177,138,0.10)' }}>
                    <p style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
                      margin: '0 0 6px',
                    }}>
                      explanation
                    </p>
                    <p style={{ fontSize: 11, color: '#1A1A18', lineHeight: 1.8, margin: 0 }}>
                      {panel.queryResult}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div style={{ height: 1, background: '#264635', opacity: 0.12, margin: '0 16px' }} />

            {/* Manual node creation */}
            <div style={{ padding: '12px 16px 16px', flexShrink: 0 }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}>
                + add child node
              </p>
              <input
                value={panel.newNodeName}
                onChange={e => setPanel(p => p ? { ...p, newNodeName: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateManualNode() }}
                placeholder="Node name…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#E9E4D4', border: '1.5px solid #264635',
                  borderRadius: 8, padding: '7px 10px',
                  fontFamily: "'Gamja Flower', cursive", fontSize: 13,
                  color: '#1A1A18', outline: 'none',
                  marginBottom: 6,
                }}
              />
              <input
                value={panel.newNodeText}
                onChange={e => setPanel(p => p ? { ...p, newNodeText: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateManualNode() }}
                placeholder="Description (optional)…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#E9E4D4', border: '1.5px solid #A3B18A',
                  borderRadius: 8, padding: '7px 10px',
                  fontFamily: 'inherit', fontSize: 11,
                  color: '#1A1A18', outline: 'none',
                }}
              />
              <button
                onClick={handleCreateManualNode}
                disabled={!panel.newNodeName.trim()}
                style={{
                  marginTop: 8, width: '100%',
                  background: '#264635',
                  color: '#E9E4D4', border: 'none',
                  borderRadius: 8,
                  padding: '8px 0', cursor: !panel.newNodeName.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: !panel.newNodeName.trim() ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                ◈ create node
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#264635', opacity: 0.12, margin: '0 16px' }} />
            <div style={{ padding: '12px 16px 16px', flexShrink: 0 }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}>
                drill down · add context
              </p>
              <textarea
                value={panel.context}
                onChange={e => setPanel(p => p ? { ...p, context: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExpand() }}
                placeholder="Add more context or constraints…"
                rows={3}
                disabled={panel.loading}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#E9E4D4', border: '1.5px solid #264635',
                  borderRadius: 8,
                  padding: '8px 10px', resize: 'none',
                  fontFamily: 'inherit', fontSize: 12,
                  color: '#1A1A18', outline: 'none',
                  lineHeight: 1.6,
                  opacity: panel.loading ? 0.5 : 1,
                }}
              />
              <button
                onClick={handleExpand}
                disabled={panel.loading}
                style={{
                  marginTop: 8, width: '100%',
                  background: panel.loading ? '#A3B18A' : '#264635',
                  color: '#E9E4D4', border: 'none',
                  borderRadius: 8,
                  padding: '9px 0', cursor: panel.loading ? 'wait' : 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {panel.loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 10, height: 10, border: '1.5px solid #E9E4D4', borderTopColor: 'transparent', borderRadius: '50%' }}
                    />
                    expanding…
                  </>
                ) : '⊕ expand subtasks'}
              </button>

              {panel.error && (
                <p style={{ marginTop: 8, fontSize: 11, color: '#5C4A32', fontFamily: 'monospace', margin: '8px 0 0' }}>
                  ⚠ {panel.error}
                </p>
              )}
            </div>

            {/* Expansion summary */}
            <AnimatePresence>
              {panel.summary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div style={{ height: 2, background: '#A3B18A', opacity: 0.5 }} />
                  <div style={{ padding: '10px 16px 14px' }}>
                    <p style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: '#A3B18A', textTransform: 'uppercase', letterSpacing: '0.1em',
                      margin: '0 0 6px',
                    }}>
                      expansion summary
                    </p>
                    <p style={{ fontSize: 11, color: '#1A1A18', lineHeight: 1.75, margin: 0 }}>
                      {panel.summary}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            </div>{/* end scrollable body */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
