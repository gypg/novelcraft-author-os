import { logger } from '@/shared/utils/logger'

export interface SyncConfig {
  provider: 'local' | 'webdav'
  remoteUrl?: string
  lastSyncTime?: number
}

export interface SyncResult {
  success: boolean
  message: string
  timestamp: number
}

const STORAGE_KEY = 'sync-config'

export function getSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { provider: 'local' }
  } catch {
    return { provider: 'local' }
  }
}

export function setSyncConfig(config: SyncConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export async function exportBackup(): Promise<Blob> {
  const data: Record<string, string> = {}

  // Collect all localStorage data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      data[key] = localStorage.getItem(key) || ''
    }
  }

  const json = JSON.stringify(data, null, 2)
  return new Blob([json], { type: 'application/json;charset=utf-8' })
}

export async function importBackup(blob: Blob): Promise<SyncResult> {
  try {
    const text = await blob.text()
    const data = JSON.parse(text)

    if (typeof data !== 'object') {
      return { success: false, message: '无效的备份文件', timestamp: Date.now() }
    }

    let count = 0
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        localStorage.setItem(key, value)
        count++
      }
    }

    logger.info('sync', `Imported ${count} items from backup`)
    return {
      success: true,
      message: `成功导入 ${count} 项数据`,
      timestamp: Date.now(),
    }
  } catch (err) {
    return { success: false, message: `导入失败: ${err}`, timestamp: Date.now() }
  }
}

export async function syncToWebdav(config: SyncConfig): Promise<SyncResult> {
  if (!config.remoteUrl) {
    return { success: false, message: '未配置 WebDAV 地址', timestamp: Date.now() }
  }

  try {
    const backup = await exportBackup()
    const text = await backup.text()

    const response = await fetch(config.remoteUrl, {
      method: 'PUT',
      body: text,
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return { success: false, message: `WebDAV 错误: ${response.status}`, timestamp: Date.now() }
    }

    setSyncConfig({ ...config, lastSyncTime: Date.now() })
    return { success: true, message: '同步成功', timestamp: Date.now() }
  } catch (err) {
    return { success: false, message: `同步失败: ${err}`, timestamp: Date.now() }
  }
}
