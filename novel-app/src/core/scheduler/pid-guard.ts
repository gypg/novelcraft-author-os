import { isTauri } from '@/shared/utils/tauri-env'
import { logger } from '@/shared/utils/logger'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

let hasLock = false

export async function acquirePidLock(): Promise<boolean> {
  const inv = await getInvoke()
  if (!inv) return false
  try {
    const result = await inv<boolean>('check_pid_lock')
    if (result) {
      logger.warn('pid-guard', 'Another auto-pilot instance is running')
      return false
    }
    await inv<void>('write_pid_lock')
    hasLock = true
    logger.info('pid-guard', 'PID lock acquired')
    return true
  } catch {
    // Fallback: in-memory guard
    if (hasLock) return false
    hasLock = true
    return true
  }
}

export async function releasePidLock(): Promise<void> {
  const inv = await getInvoke()
  if (!inv) {
    hasLock = false
    return
  }
  try {
    await inv<void>('remove_pid_lock')
  } catch {
    // ignore
  }
  hasLock = false
  logger.info('pid-guard', 'PID lock released')
}
