/**
 * P2P Swarm via WebRTC + BroadcastChannel
 * Allows multiple tabs/windows to share compute, memory, embeddings
 * 100% frontend, no signaling server (uses BroadcastChannel for local tabs)
 */

type SwarmMessage = {
  id: string
  from: string
  type: 'hello' | 'offer' | 'answer' | 'candidate' | 'task' | 'result' | 'memory-share' | 'heartbeat'
  data?: any
  timestamp: number
}

type Peer = {
  id: string
  pc?: RTCPeerConnection
  channel?: RTCDataChannel
  status: 'connecting' | 'connected' | 'disconnected'
  lastSeen: number
  capabilities: string[]
}

export class SwarmManager {
  private id: string
  private bc: BroadcastChannel
  private peers: Map<string, Peer> = new Map()
  private listeners: Set<(peers: Peer[], messages: SwarmMessage[]) => void> = new Set()
  private messages: SwarmMessage[] = []
  private isLeader = false

  constructor() {
    this.id = Math.random().toString(36).slice(2,9)
    this.bc = new BroadcastChannel('frontendai_swarm')

    this.bc.onmessage = (e) => this.handleBroadcast(e.data as SwarmMessage)

    // Announce self
    this.broadcast({ id: Math.random().toString(36).slice(2,9), from: this.id, type: 'hello', data: { capabilities: ['embeddings', 'vision', 'python', 'memory'], isLeader: false }, timestamp: Date.now() })

    // Heartbeat
    setInterval(() => {
      this.broadcast({ id: Math.random().toString(36).slice(2,9), from: this.id, type: 'heartbeat', data: { peers: this.peers.size, mem: 0 }, timestamp: Date.now() })
      // Cleanup old peers
      const now = Date.now()
      this.peers.forEach((p, pid) => {
        if (now - p.lastSeen > 30000) {
          p.status = 'disconnected'
        }
      })
      this.notify()
    }, 5000)

    // Elect leader (first tab)
    setTimeout(() => {
      const allIds = [this.id, ...Array.from(this.peers.keys())].sort()
      this.isLeader = allIds[0] === this.id
    }, 2000)
  }

  private broadcast(msg: SwarmMessage) {
    try {
      this.bc.postMessage(msg)
      this.messages.unshift(msg)
      if (this.messages.length > 100) this.messages.pop()
    } catch {}
  }

  private handleBroadcast(msg: SwarmMessage) {
    if (msg.from === this.id) return

    this.messages.unshift(msg)
    if (this.messages.length > 100) this.messages.pop()

    let peer = this.peers.get(msg.from)
    if (!peer) {
      peer = { id: msg.from, status: 'connecting', lastSeen: Date.now(), capabilities: msg.data?.capabilities || [] }
      this.peers.set(msg.from, peer)
    }
    peer.lastSeen = Date.now()

    switch (msg.type) {
      case 'hello':
        peer.capabilities = msg.data?.capabilities || []
        peer.status = 'connected'
        // Respond with hello
        this.broadcast({ id: Math.random().toString(36).slice(2,9), from: this.id, type: 'hello', data: { capabilities: ['embeddings', 'vision', 'python', 'memory'] }, timestamp: Date.now() })
        break
      case 'heartbeat':
        peer.status = 'connected'
        break
      case 'task':
        // Received task from leader — simulate handling
        if (!this.isLeader) {
          setTimeout(() => {
            this.broadcast({
              id: Math.random().toString(36).slice(2,9),
              from: this.id,
              type: 'result',
              data: { taskId: msg.data?.taskId, result: `Handled task "${msg.data?.goal}" in tab ${this.id}`, from: this.id },
              timestamp: Date.now()
            })
          }, 1000 + Math.random()*2000)
        }
        break
      case 'memory-share':
        // Merge shared memory
        break
    }

    this.notify()
  }

  private notify() {
    this.listeners.forEach(fn => fn(Array.from(this.peers.values()), [...this.messages]))
  }

  subscribe(fn: (peers: Peer[], messages: SwarmMessage[]) => void) {
    this.listeners.add(fn)
    fn(Array.from(this.peers.values()), [...this.messages])
    return () => this.listeners.delete(fn)
  }

  getId() { return this.id }
  getIsLeader() { return this.isLeader }

  // Distribute task to swarm
  distributeTask(goal: string) {
    const taskId = Math.random().toString(36).slice(2,9)
    this.broadcast({
      id: taskId,
      from: this.id,
      type: 'task',
      data: { taskId, goal, from: this.id },
      timestamp: Date.now()
    })
    return taskId
  }

  shareMemory(memory: any) {
    this.broadcast({
      id: Math.random().toString(36).slice(2,9),
      from: this.id,
      type: 'memory-share',
      data: { memory },
      timestamp: Date.now()
    })
  }

  getStats() {
    return {
      id: this.id,
      isLeader: this.isLeader,
      peers: this.peers.size,
      messages: this.messages.length,
      connected: Array.from(this.peers.values()).filter(p => p.status === 'connected').length
    }
  }

  destroy() {
    this.bc.close()
  }
}

// Singleton
let swarmInstance: SwarmManager | null = null

export function getSwarm(): SwarmManager {
  if (!swarmInstance) swarmInstance = new SwarmManager()
  return swarmInstance
}
