import type { AppEvents } from './types'

type EventCallback<T = unknown> = (data: T) => void

type EventKey = keyof AppEvents

interface EventEntry {
  callback: EventCallback
  once: boolean
}

class TypedEventBus {
  private listeners = new Map<string, EventEntry[]>()

  on<K extends EventKey>(
    event: K,
    callback: EventCallback<AppEvents[K]>,
  ): () => void {
    return this.addListener(event, callback as EventCallback<unknown>, false)
  }

  once<K extends EventKey>(
    event: K,
    callback: EventCallback<AppEvents[K]>,
  ): () => void {
    return this.addListener(event, callback as EventCallback<unknown>, true)
  }

  emit<K extends EventKey>(event: K, data: AppEvents[K]): void {
    const list = this.listeners.get(event)
    if (!list) return

    const toRemove: EventEntry[] = []
    for (const entry of list) {
      entry.callback(data)
      if (entry.once) toRemove.push(entry)
    }

    if (toRemove.length > 0) {
      for (const entry of toRemove) {
        const idx = list.indexOf(entry)
        if (idx >= 0) list.splice(idx, 1)
      }
    }
  }

  off<K extends EventKey>(
    event: K,
    callback?: EventCallback<AppEvents[K]>,
  ): void {
    if (!callback) {
      this.listeners.delete(event)
      return
    }
    const list = this.listeners.get(event)
    if (list) {
      const idx = list.findIndex((e) => e.callback === callback)
      if (idx >= 0) list.splice(idx, 1)
    }
  }

  clear(): void {
    this.listeners.clear()
  }

  private addListener(
    event: string,
    callback: EventCallback,
    once: boolean,
  ): () => void {
    const entry: EventEntry = { callback, once }
    const list = this.listeners.get(event) || []
    list.push(entry)
    this.listeners.set(event, list)

    return () => {
      const l = this.listeners.get(event)
      if (l) {
        const idx = l.indexOf(entry)
        if (idx >= 0) l.splice(idx, 1)
      }
    }
  }
}

export const eventBus = new TypedEventBus()
