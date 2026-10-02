export type EnvironmentNodeKind = 'workspace' | 'project' | 'route' | 'component' | 'element' | 'panel' | 'selection' | 'data'

export interface EnvironmentNode {
  id: string
  kind: EnvironmentNodeKind
  label: string
  metadata?: Record<string, unknown>
}

export interface EnvironmentEdge { from: string; to: string; relation: string }

export interface EnvironmentSnapshot {
  nodes: EnvironmentNode[]
  edges: EnvironmentEdge[]
  focusedNodeId?: string
  version: number
}

export class EnvironmentGraph {
  private nodes = new Map<string, EnvironmentNode>()
  private edges: EnvironmentEdge[] = []
  private version = 0

  upsert(node: EnvironmentNode) { this.nodes.set(node.id, { ...node, metadata: node.metadata ? { ...node.metadata } : undefined }); this.version++ }
  connect(from: string, to: string, relation: string) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return false
    if (!this.edges.some(e => e.from === from && e.to === to && e.relation === relation)) this.edges.push({ from, to, relation })
    this.version++; return true
  }
  remove(id: string) { this.nodes.delete(id); this.edges = this.edges.filter(e => e.from !== id && e.to !== id); this.version++ }
  focus(id?: string) { if (id && !this.nodes.has(id)) return false; this.focused = id; this.version++; return true }
  private focused?: string

  snapshot(): EnvironmentSnapshot { return { nodes: [...this.nodes.values()].map(n => ({ ...n, metadata: n.metadata ? { ...n.metadata } : undefined })), edges: this.edges.map(e => ({ ...e })), focusedNodeId: this.focused, version: this.version } }
  related(id: string) {
    const ids = new Set([id])
    this.edges.forEach(e => { if (e.from === id) ids.add(e.to); if (e.to === id) ids.add(e.from) })
    return [...ids].map(nodeId => this.nodes.get(nodeId)).filter(Boolean) as EnvironmentNode[]
  }
}

export const environmentGraph = new EnvironmentGraph()
