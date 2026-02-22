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

export type ExpandFn       = (item: TaskItem, context: string, ancestors: TaskItem[]) => Promise<{ items: TaskItem[]; summary: string }>
export type QueryFn        = (item: TaskItem, question: string, ancestors: TaskItem[]) => Promise<string>
export type GraphChangedFn = (nodes: Node[], edges: Edge[]) => void
type CircleNodeData = {
  label: string
  text: string
  index: number
  total: number
  isRoot: boolean
  isExpanded?: boolean
  isGenerating?: boolean  // true while children are being fetched
  ancestors?: TaskItem[]
  depth: number       // BFS depth from root (0 = center)
  animDelay: number   // ms delay for staggered entrance animation
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
// All nodes share one bounding box (NODE_W × NODE_H) so handles & edge routing
// are consistent. Only the visual circle diameter varies by depth.
const NODE_W = 160
const NODE_H = 160
const circleD = (depth: number) => depth === 0 ? 120 : depth === 1 ? 82 : 66

// Handles pinned to bounding-box centre so edges route at any angle
const HS = {
  left: NODE_W / 2, top: NODE_H / 2, bottom: 'auto', right: 'auto',
  transform: 'translate(-50%, -50%)',
  opacity: 0, width: 1, height: 1,
}

// ─── CIRCLE NODE ─────────────────────────────────────────────────────────────
const CircleNode = ({ data, selected }: NodeProps<CircleNodeType>) => {
  const acc  = '#A3B18A'
  const bg   = selected ? '#264635' : '#E9E4D4'
  const depth = data.depth ?? 1
  const D    = circleD(depth)
  const delay = (data.animDelay ?? 0) / 1000

  // Centre the circle vertically within the fixed NODE_H bounding box
  const circlePaddingTop = (NODE_H - D - 8 - 36) / 2

  // Bottom of visible content — root has no label rendered, others have circle + gap + label
  const contentBottom = depth === 0
    ? circlePaddingTop + D
    : circlePaddingTop + D + 8 + 36

  return (
    <>
      <Handle type="target" position={Position.Top}    style={HS} />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, delay, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: NODE_W, height: NODE_H, paddingTop: circlePaddingTop,
          transformOrigin: 'center center',
        }}
      >
        <div style={{
          width: D, height: D, borderRadius: '50%',
          background: bg,
          border: `${depth === 0 ? 3 : 2}px solid ${data.isExpanded ? acc : '#264635'}`,
          boxShadow: selected
            ? `0 0 0 4px ${acc}, 0 0 0 8px rgba(38,70,53,0.10)`
            : depth === 0
              ? `0 0 0 8px rgba(163,177,138,0.18), 4px 4px 0 rgba(38,70,53,0.14)`
              : data.isExpanded
                ? `0 0 0 2px ${acc}`
                : '2px 2px 0 rgba(38,70,53,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s, box-shadow 0.2s, border-color 0.2s',
          position: 'relative', overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Dashed inner ring */}
          <div style={{
            position: 'absolute', inset: depth === 0 ? 10 : 7, borderRadius: '50%',
            border: `1px dashed ${selected ? acc : '#264635'}`,
            opacity: 0.2,
          }} />

          {depth === 0 ? (
            // Root node: show label text inside the circle
            <div style={{
              fontFamily: "'Gamja Flower', cursive",
              fontSize: 12, fontWeight: 400,
              color: selected ? '#E9E4D4' : '#264635',
              textAlign: 'center',
              padding: '0 12px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3,
            }}>
              {data.label}
            </div>
          ) : (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: depth === 1 ? 11 : 9,
              fontWeight: 700,
              color: acc,
              letterSpacing: '0.04em',
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
          marginTop: 8, width: NODE_W, textAlign: 'center',
          fontFamily: "'Gamja Flower', cursive",
          fontSize: depth === 0 ? 12 : depth === 1 ? 11 : 10,
          color: '#264635', lineHeight: 1.3,
          display: depth === 0 ? 'none' : '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {data.label}
        </div>
      </motion.div>

      {/* ── Generating animation — appears below the node while children load ── */}
      <AnimatePresence>
        {data.isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: contentBottom + 8,
              left: 0,
              width: NODE_W,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'none',
            }}
          >
            {/* Dashed spoke lines radiating from below */}
            <div style={{ position: 'relative', width: 60, height: 28 }}>
              {[- 40, 0, 40].map((deg, i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%', top: 0,
                    width: 28, height: 1.5,
                    background: 'linear-gradient(90deg, #A3B18A, transparent)',
                    transformOrigin: 'left center',
                    transform: `rotate(${deg}deg)`,
                    marginTop: 0,
                  }}
                  animate={{ opacity: [0.2, 0.8, 0.2], scaleX: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
                />
              ))}
            </div>

            {/* Three bouncing dots */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#A3B18A',
                    flexShrink: 0,
                  }}
                  animate={{ y: [0, -7, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </div>

            {/* "generating" label */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, letterSpacing: '0.12em',
              color: '#A3B18A', textTransform: 'uppercase',
              opacity: 0.7,
            }}>
              generating
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Bottom} style={HS} />
    </>
  )
}

const nodeTypes: NodeTypes = { circle: CircleNode }

// ─── HUB-AND-SPOKE LAYOUT ────────────────────────────────────────────────────
// Root node(s) sit at the centre; children radiate outward in concentric rings.
// Nodes at depth ≥ 2 are clustered near their parent's angular position so the
// graph reads as a true spoke/wheel rather than concentric circles.
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

  // Fallback chain if no edges declared
  if (edgeSet.size === 0) {
    for (let i = 0; i < n - 1; i++) {
      edgeSet.add(`${i}→${i + 1}`)
      childrenOf[i].push(i + 1)
      parentsOf[i + 1].push(i)
    }
  }

  // ── BFS to assign depths and animation order ──────────────────────────────
  const roots = items.map((_, i) => i).filter(i => parentsOf[i].length === 0)
  const depth: number[] = new Array(n).fill(-1)
  const bfsOrder: number[] = []
  const queue = [...roots]
  roots.forEach(r => { depth[r] = 0 })

  while (queue.length) {
    const cur = queue.shift()!
    bfsOrder.push(cur)
    for (const child of childrenOf[cur]) {
      if (depth[child] === -1) {
        depth[child] = depth[cur] + 1
        queue.push(child)
      }
    }
  }
  // Cycle members / disconnected nodes get depth 1
  items.forEach((_, i) => { if (depth[i] === -1) { depth[i] = 1; bfsOrder.push(i) } })

  // ── Group by depth ────────────────────────────────────────────────────────
  const byDepth = new Map<number, number[]>()
  items.forEach((_, i) => {
    if (!byDepth.has(depth[i])) byDepth.set(depth[i], [])
    byDepth.get(depth[i])!.push(i)
  })

  const RING_RADIUS = 180
  const pos: { x: number; y: number }[] = new Array(n)

  byDepth.forEach((idxs, d) => {
    if (d === 0) {
      // Root(s) at centre
      idxs.forEach(i => { pos[i] = { x: 0, y: 0 } })
      return
    }

    const r = d * RING_RADIUS

    if (d === 1) {
      // Depth-1: evenly spaced around root
      const cnt = idxs.length
      idxs.forEach((i, j) => {
        const angle = (2 * Math.PI * j / cnt) - Math.PI / 2
        pos[i] = { x: r * Math.cos(angle), y: r * Math.sin(angle) }
      })
      return
    }

    // Depth ≥ 2: cluster children near parent's angular direction
    const byParent = new Map<number, number[]>()
    idxs.forEach(i => {
      const parent = parentsOf[i][0] ?? -1
      if (!byParent.has(parent)) byParent.set(parent, [])
      byParent.get(parent)!.push(i)
    })

    byParent.forEach((children, parentIdx) => {
      const pPos = pos[parentIdx] ?? { x: 0, y: 0 }
      const parentAngle = Math.atan2(pPos.y, pPos.x)
      const spread = Math.PI / 2.5  // ~72° arc per parent
      const cnt = children.length
      children.forEach((i, j) => {
        const offset = cnt === 1 ? 0 : (j / (cnt - 1) - 0.5) * spread
        const angle = parentAngle + offset
        pos[i] = { x: r * Math.cos(angle), y: r * Math.sin(angle) }
      })
    })
  })

  // animDelay: BFS order × 150 ms
  const animDelayArr = new Array(n).fill(0)
  bfsOrder.forEach((idx, order) => { animDelayArr[idx] = order * 150 })

  const rfNodes: Node[] = items.map((item, idx) => ({
    id: `n${idx}`,
    type: 'circle' as const,
    position: { x: pos[idx].x - NODE_W / 2, y: pos[idx].y - NODE_H / 2 },
    data: {
      label: item.name, text: item.text, index: idx, total: n,
      isRoot: depth[idx] === 0,
      depth: depth[idx],
      animDelay: animDelayArr[idx],
      ancestors: [],
    },
  }))

  const rfEdges: Edge[] = [...edgeSet].map(s => {
    const [src, tgt] = s.split('→').map(Number)
    return {
      id: `e${src}-${tgt}`,
      source: `n${src}`, target: `n${tgt}`,
      type: 'curved',
      style: { stroke: '#A3B18A', strokeWidth: 1.5, opacity: 0.75 },
      markerEnd: { type: MarkerType.Arrow, color: '#A3B18A', width: 10, height: 10 },
      data: { curvature: 0.2 },
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

  const MIN_ARC = Math.max(NODE_W, NODE_H) + 10
  const RADIUS  = Math.max((n * MIN_ARC) / (2 * Math.PI), 160)

  // Offset the ring centre outward so the nearest child is ~1.5×RADIUS from
  // the parent, giving clear visual separation between parent and child ring.
  const mag = Math.sqrt(parentCx ** 2 + parentCy ** 2) || 1
  const ux = parentCx / mag
  const uy = parentCy / mag
  const cx = parentCx + ux * RADIUS * 1.4
  const cy = parentCy + uy * RADIUS * 1.4

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
export default function GraphView({ items, onExpand, onQuery, onGraphChanged }: { items: TaskItem[]; onExpand: ExpandFn; onQuery: QueryFn; onGraphChanged?: GraphChangedFn }) {
  const [panel, setPanel] = useState<PanelState | null>(null)
  const expCounter = useRef(0)

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildCircularLayout(items),
    [items]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  // Refs so async callbacks can read current state without stale closures
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

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
            cx: node.position.x + NODE_W / 2,
            cy: node.position.y + NODE_H / 2,
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

    // Mark the parent node as "generating" so it shows the loading animation
    setNodes(prev => prev.map(nd =>
      nd.id === panel.nodeId
        ? { ...nd, data: { ...nd.data, isGenerating: true } }
        : nd
    ))

    try {
      const { items: newItems, summary } = await onExpand(panel.item, panel.context, panel.ancestors)
      const counter = expCounter.current++

      // Read current state from refs so we can compute final state synchronously
      const nds = nodesRef.current
      const eds = edgesRef.current

      const existingByLabel = new Map(nds.map(nd => [(nd.data as CircleNodeData).label, nd.id]))
      const existingNames = new Set(existingByLabel.keys())
      const dagPositions = getExpansionCircularPositions(panel.cx, panel.cy, newItems, existingNames)

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
      const parentDepth = (nds.find(nd => nd.id === panel.nodeId)?.data as CircleNodeData)?.depth ?? 0
      const newNodes: Node[] = brandNewItems.map((item, itemIdx) => {
        const id  = nameToId.get(item.name)!
        const pos = dagPositions.get(item.name)!
        return {
          id,
          type: 'circle' as const,
          position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
          data: {
            label: item.name, text: item.text, index: itemIdx,
            total: brandNewItems.length, isRoot: false,
            depth: parentDepth + 1,
            animDelay: itemIdx * 120,
            ancestors: [...(panel.ancestors ?? []), { name: panel.item.name, text: panel.item.text }],
          },
        }
      })

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
          if (tgtId) { const e = addEdge(panel.nodeId, tgtId, edgeIdx++); if (e) edgesToAdd.push(e) }
        }
      })

      const baseNodes: Node[] = nds.map(nd =>
        nd.id === panel.nodeId
          ? { ...nd, data: { ...nd.data, isExpanded: true, isGenerating: false } }
          : nd
      )
      const existingEdgeKeys = new Set(eds.map(e => `${e.source}→${e.target}`))
      const dedupedEdgesToAdd = edgesToAdd.filter(e => !existingEdgeKeys.has(`${e.source}→${e.target}`))

      // Pre-compute the complete final state (needed for onGraphChanged callback)
      const finalNodes: Node[] = [...baseNodes, ...newNodes]
      const finalEdges: Edge[] = [...eds, ...dedupedEdgesToAdd]

      if (newNodes.length === 0) {
        // Nothing new to add — just update parent + edges immediately
        setNodes(baseNodes)
        setEdges(finalEdges)
        onGraphChanged?.(finalNodes, finalEdges)
        setPanel(p => p ? { ...p, loading: false, summary, context: '' } : null)
        return
      }

      // Mark parent as expanded immediately, then reveal each child one by one
      setNodes(baseNodes)

      const STAGGER_MS = 200
      newNodes.forEach((node, i) => {
        setTimeout(() => {
          // Each node mounts fresh → framer-motion plays scale 0→1 from animDelay=0
          setNodes(prev => [...prev, { ...node, data: { ...node.data, animDelay: 0 } }])
          // Reveal the edge(s) targeting this node at the same moment
          const nodeEdges = dedupedEdgesToAdd.filter(e => e.target === node.id)
          if (nodeEdges.length > 0) {
            setEdges(prev => {
              const seen = new Set(prev.map(e => `${e.source}→${e.target}`))
              const fresh = nodeEdges.filter(e => !seen.has(`${e.source}→${e.target}`))
              return fresh.length > 0 ? [...prev, ...fresh] : prev
            })
          }
        }, (i + 1) * STAGGER_MS)
      })

      // Notify persistence after all nodes have appeared
      setTimeout(() => {
        onGraphChanged?.(finalNodes, finalEdges)
        setPanel(p => p ? { ...p, loading: false, summary, context: '' } : null)
      }, (newNodes.length + 1) * STAGGER_MS + 50)
    } catch (err) {
      setPanel(p => p
        ? { ...p, loading: false, error: err instanceof Error ? err.message : 'Failed to expand' }
        : null
      )
      // Clear the generating animation on error
      setNodes(prev => prev.map(nd =>
        nd.id === panel.nodeId
          ? { ...nd, data: { ...nd.data, isGenerating: false } }
          : nd
      ))
    }
  }, [panel, onExpand, onGraphChanged, setNodes, setEdges])

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

    // Place new node offset from parent
    const angle = Math.random() * Math.PI * 2
    const dist = 250
    const nx = panel.cx + Math.cos(angle) * dist - NODE_W / 2
    const ny = panel.cy + Math.sin(angle) * dist - NODE_H / 2

    const parentDepth = (nodesRef.current.find(nd => nd.id === panel.nodeId)?.data as CircleNodeData)?.depth ?? 0
    const newNode: Node = {
      id,
      type: 'circle' as const,
      position: { x: nx, y: ny },
      data: {
        label: name, text: text || name, index: 0, total: 1, isRoot: false,
        depth: parentDepth + 1, animDelay: 0,
        ancestors: [...(panel.ancestors ?? []), { name: panel.item.name, text: panel.item.text }],
      },
    }
    const newEdge: Edge = {
      id: `manual-edge-${id}`,
      source: panel.nodeId,
      target: id,
      type: 'curved',
      style: { stroke: '#A3B18A', strokeWidth: 1.5, opacity: 0.7, strokeDasharray: '4 3' },
      markerEnd: { type: MarkerType.Arrow, color: '#A3B18A', width: 9, height: 9 },
      data: { curvature: 0.25 },
    }

    const finalNodes = [...nodesRef.current, newNode]
    const finalEdges = [...edgesRef.current, newEdge]
    setNodes(finalNodes)
    setEdges(finalEdges)
    onGraphChanged?.(finalNodes, finalEdges)
    setPanel(p => p ? { ...p, newNodeName: '', newNodeText: '' } : null)
  }, [panel, onGraphChanged, setNodes, setEdges])

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
        minZoom={0.1}
        maxZoom={10}
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
