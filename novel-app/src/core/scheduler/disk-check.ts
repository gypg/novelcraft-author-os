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

const MIN_DISK_SPACE_MB = 100

export async function checkDiskSpace(): Promise<{ available: number; sufficient: boolean } | null> {
  const inv = await getInvoke()
  if (!inv) return null
  try {
    const result = await inv<{ available_mb: number }>('check_disk_space')
    const available = result.available_mb
    return {
      available,
      sufficient: available >= MIN_DISK_SPACE_MB,
    }
  } catch {
    // If we can't check, assume sufficient (don't block)
    logger.warn('disk-check', 'Could not check disk space')
    return { available: -1, sufficient: true }
  }
}
