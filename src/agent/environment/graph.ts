export type EnvironmentNodeKind = 'workspace' | 'project' | 'route' | 'panel' | 'element' | 'file' | 'task' | 'selection' | 'capability'

export interface EnvironmentNode {
  id: string
  kind: EnvironmentNodeKind
  label: string
  data?: Record<string, unknown>
  updatedAt: number
}

export interface EnvironmentEdge {
  from: string
  to: string
  relation: string
}

export interface EnvironmentSnapshot {
  nodes: EnvironmentNode[]
  edges: EnvironmentEdge[]
  revision: number
  timestamp: number
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export class EnvironmentGraph {
  private nodes = new Map<string, EnvironmentNode>()
  private edges = new Map<string, EnvironmentEdge>()
  private revision = 0
  private listeners = new Set<(snapshot: EnvironmentSnapshot) => void>()

  upsertNode(node: Omit<EnvironmentNode, 'updatedAt'> & { updatedAt?: number }) {
    const next = { ...node, updatedAt: node.updatedAt ?? Date.now() }
    this.nodes.set(next.id, next)
    this.touch()
    return next
  }

  addNode(kind: EnvironmentNodeKind, label: string, data?: Record<string, unknown>) {
    return this.upsertNode({ id: makeId(), kind, label, data })
  }

  removeNode(id: string) {
    if (!this.nodes.delete(id)) return false
    for (const [key, edge] of this.edges) if (edge.from === id || edge.to === id) this.edges.delete(key)
    this.touch()
    return true
  }

  relate(from: string, to: string, relation: string) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error('Both graph nodes must exist before creating a relation')
    const edge = { from, to, relation }
    this.edges.set(`${from}:${relation}:${to}`, edge)
    this.touch()
    return edge
  }

  query(predicate: (node: EnvironmentNode) => boolean) {
    return [...this.nodes.values()].filter(predicate)
  }

  neighbors(id: string) {
    return [...this.edges.values()]
      .filter(edge => edge.from === id || edge.to === id)
      .map(edge => this.nodes.get(edge.from === id ? edge.to : edge.from))
      .filter((node): node is EnvironmentNode => Boolean(node))
  }

  snapshot(): EnvironmentSnapshot {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()], revision: this.revision, timestamp: Date.now() }
  }

  subscribe(listener: (snapshot: EnvironmentSnapshot) => void) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  clear() {
    this.nodes.clear()
    this.edges.clear()
    this.touch()
  }

  private touch() {
    this.revision += 1
    const snapshot = this.snapshot()
    this.listeners.forEach(listener => listener(snapshot))
  }
}

export const environmentGraph = new EnvironmentGraph()
