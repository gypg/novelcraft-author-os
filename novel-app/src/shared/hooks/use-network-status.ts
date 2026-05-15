import { useState, useEffect, useCallback } from 'react'
import { eventBus } from '@/core/events'

export interface NetworkStatus {
  online: boolean
  lastChanged: number
}

let globalStatus: NetworkStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastChanged: Date.now(),
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(globalStatus)

  useEffect(() => {
    const handleOnline = () => {
      globalStatus = { online: true, lastChanged: Date.now() }
      setStatus(globalStatus)
    }
    const handleOffline = () => {
      globalStatus = { online: false, lastChanged: Date.now() }
      setStatus(globalStatus)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}

export function useNetworkGuard() {
  const status = useNetworkStatus()

  const guardedFetch = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (!status.online) {
      eventBus.emit('ai:resilience:degraded', {
        stage: 'network-guard',
        error: '网络不可用，请检查网络连接后重试',
      })
      return null
    }
    try {
      return await fn()
    } catch (err) {
      const msg = String(err)
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        eventBus.emit('ai:resilience:degraded', {
          stage: 'network-guard',
          error: '网络请求失败，请检查网络连接',
        })
      }
      throw err
    }
  }, [status.online])

  return { online: status.online, guardedFetch }
}
