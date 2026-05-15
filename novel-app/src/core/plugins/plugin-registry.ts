import { logger } from '@/shared/utils/logger'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  hooks: string[]
  commands: string[]
  permissions: string[]
}

export interface Plugin {
  manifest: PluginManifest
  enabled: boolean
  installedAt: number
}

const STORAGE_KEY = 'plugin-registry'

export function getInstalledPlugins(): Plugin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePlugins(plugins: Plugin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins))
}

export function installPlugin(manifest: PluginManifest): Plugin {
  const plugins = getInstalledPlugins()

  // Check if already installed
  const existing = plugins.find((p) => p.manifest.id === manifest.id)
  if (existing) {
    existing.manifest = manifest
    existing.enabled = true
    savePlugins(plugins)
    logger.info('plugin-registry', `Updated plugin: ${manifest.name}`)
    return existing
  }

  const plugin: Plugin = {
    manifest,
    enabled: true,
    installedAt: Date.now(),
  }

  plugins.push(plugin)
  savePlugins(plugins)
  logger.info('plugin-registry', `Installed plugin: ${manifest.name}`)
  return plugin
}

export function uninstallPlugin(id: string): void {
  const plugins = getInstalledPlugins().filter((p) => p.manifest.id !== id)
  savePlugins(plugins)
  logger.info('plugin-registry', `Uninstalled plugin: ${id}`)
}

export function togglePlugin(id: string, enabled: boolean): void {
  const plugins = getInstalledPlugins().map((p) =>
    p.manifest.id === id ? { ...p, enabled } : p,
  )
  savePlugins(plugins)
}

export function getEnabledPlugins(): Plugin[] {
  return getInstalledPlugins().filter((p) => p.enabled)
}

export function getPluginCommands(): Array<{ command: string; pluginName: string; description: string }> {
  const result: Array<{ command: string; pluginName: string; description: string }> = []
  for (const plugin of getEnabledPlugins()) {
    for (const cmd of plugin.manifest.commands) {
      result.push({
        command: cmd,
        pluginName: plugin.manifest.name,
        description: `来自插件 ${plugin.manifest.name}`,
      })
    }
  }
  return result
}
