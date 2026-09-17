/**
 * CRDT Sync for multi-tab memory
 * Uses Yjs for CRDT, BroadcastChannel for transport, no server
 * Syncs memories, notes, tasks across tabs in real-time
 */

import * as Y from 'yjs'
import { db } from '../memory/db'
import type { MemoryItem, Note, Task } from '../types'

export class CRDTSync {
  private doc: Y.Doc
  private bc: BroadcastChannel
  private memoriesMap: Y.Map<any>
  private notesMap: Y.Map<any>
  private tasksMap: Y.Map<any>
  private listeners: Set<() => void> = new Set()
  private id: string

  constructor() {
    this.id = Math.random().toString(36).slice(2,9)
    this.doc = new Y.Doc()
    
    this.memoriesMap = this.doc.getMap('memories')
    this.notesMap = this.doc.getMap('notes')
    this.tasksMap = this.doc.getMap('tasks')

    this.bc = new BroadcastChannel('frontendai_crdt')

    // Listen for updates from other tabs
    this.bc.onmessage = (e) => {
      const { from, update } = e.data
      if (from === this.id) return
      try {
        Y.applyUpdate(this.doc, new Uint8Array(update))
      } catch (err) {
        console.warn('CRDT apply update failed', err)
      }
    }

    // Broadcast local updates
    this.doc.on('update', (update: Uint8Array) => {
      try {
        this.bc.postMessage({ from: this.id, update: Array.from(update) })
      } catch {}
    })

    // Observe changes and sync to IndexedDB
    this.memoriesMap.observe(async () => {
      await this.syncToIDB()
      this.notify()
    })
    this.notesMap.observe(async () => {
      await this.syncToIDB()
      this.notify()
    })
    this.tasksMap.observe(async () => {
      await this.syncToIDB()
      this.notify()
    })

    // Initial sync from IDB to Yjs
    this.syncFromIDB()
  }

  private async syncFromIDB() {
    try {
      const mems = await db.memories.toArray()
      const notes = await db.notes.toArray()
      const tasks = await db.tasks.toArray()

      this.doc.transact(() => {
        mems.forEach(m => {
          if (!this.memoriesMap.has(m.id)) {
            this.memoriesMap.set(m.id, m)
          }
        })
        notes.forEach(n => {
          if (!this.notesMap.has(n.id)) {
            this.notesMap.set(n.id, n)
          }
        })
        tasks.forEach(t => {
          if (!this.tasksMap.has(t.id)) {
            this.tasksMap.set(t.id, t)
          }
        })
      })
    } catch (e) {
      console.warn('CRDT sync from IDB failed', e)
    }
  }

  private async syncToIDB() {
    try {
      // Memories
      const yMems = Array.from(this.memoriesMap.values()) as MemoryItem[]
      for (const mem of yMems) {
        const existing = await db.memories.get(mem.id)
        if (!existing || mem.timestamp > existing.timestamp) {
          await db.memories.put(mem)
        }
      }

      // Notes
      const yNotes = Array.from(this.notesMap.values()) as Note[]
      for (const note of yNotes) {
        const existing = await db.notes.get(note.id)
        if (!existing || note.updated > existing.updated) {
          await db.notes.put(note)
        }
      }

      // Tasks
      const yTasks = Array.from(this.tasksMap.values()) as Task[]
      for (const task of yTasks) {
        await db.tasks.put(task)
      }
    } catch (e) {
      console.warn('CRDT sync to IDB failed', e)
    }
  }

  // Public API to add/update
  addMemory(memory: MemoryItem) {
    this.doc.transact(() => {
      this.memoriesMap.set(memory.id, memory)
    })
  }

  addNote(note: Note) {
    this.doc.transact(() => {
      this.notesMap.set(note.id, note)
    })
  }

  addTask(task: Task) {
    this.doc.transact(() => {
      this.tasksMap.set(task.id, task)
    })
  }

  deleteMemory(id: string) {
    this.doc.transact(() => {
      this.memoriesMap.delete(id)
    })
  }

  deleteNote(id: string) {
    this.doc.transact(() => {
      this.notesMap.delete(id)
    })
  }

  deleteTask(id: string) {
    this.doc.transact(() => {
      this.tasksMap.delete(id)
    })
  }

  getStats() {
    return {
      id: this.id,
      memories: this.memoriesMap.size,
      notes: this.notesMap.size,
      tasks: this.tasksMap.size,
      peers: 'via BroadcastChannel (no peer list, Yjs handles)'
    }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach(fn => fn())
  }

  destroy() {
    this.bc.close()
    this.doc.destroy()
  }

  // Export Yjs state
  exportState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc)
  }

  // Import Yjs state
  importState(update: Uint8Array) {
    Y.applyUpdate(this.doc, update)
  }
}

let crdtInstance: CRDTSync | null = null

export function getCRDT(): CRDTSync {
  if (!crdtInstance) crdtInstance = new CRDTSync()
  return crdtInstance
}
