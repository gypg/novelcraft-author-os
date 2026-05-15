import { useState } from 'react'
import { getInstalledPlugins, uninstallPlugin, togglePlugin, installPlugin, type PluginManifest } from '@/core/plugins/plugin-registry'

export function PluginManagerPage() {
  const [plugins, setPlugins] = useState(() => getInstalledPlugins())
  const [importText, setImportText] = useState('')

  const handleToggle = (id: string, enabled: boolean) => {
    togglePlugin(id, enabled)
    setPlugins(getInstalledPlugins())
  }

  const handleUninstall = (id: string) => {
    if (!confirm('确定卸载此插件？')) return
    uninstallPlugin(id)
    setPlugins(getInstalledPlugins())
  }

  const handleImport = () => {
    try {
      const manifest: PluginManifest = JSON.parse(importText)
      if (!manifest.id || !manifest.name) {
        alert('无效的插件 manifest')
        return
      }
      installPlugin(manifest)
      setPlugins(getInstalledPlugins())
      setImportText('')
    } catch {
      alert('JSON 格式错误')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>插件管理</h2>

      {/* Installed plugins */}
      <div className="space-y-2">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>已安装插件</div>
        {plugins.length === 0 ? (
          <div className="text-xs p-4 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            暂无已安装插件
          </div>
        ) : (
          plugins.map((p) => (
            <div
              key={p.manifest.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {p.manifest.name} <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>v{p.manifest.version}</span>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  {p.manifest.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(p.manifest.id, !p.enabled)}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: p.enabled ? 'oklch(0.65 0.17 145 / 0.2)' : 'var(--muted)',
                    color: p.enabled ? 'oklch(0.5 0.17 145)' : 'var(--muted-foreground)',
                  }}
                >
                  {p.enabled ? '启用' : '禁用'}
                </button>
                <button
                  onClick={() => handleUninstall(p.manifest.id)}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{ color: 'var(--destructive)' }}
                >
                  卸载
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import */}
      <div className="space-y-2">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>导入插件</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='粘贴插件 JSON manifest...\n\n{\n  "id": "my-plugin",\n  "name": "我的插件",\n  "version": "1.0.0",\n  "description": "插件描述",\n  "author": "作者",\n  "hooks": [],\n  "commands": ["/my-command"],\n  "permissions": []\n}'
          className="w-full h-32 px-3 py-2 rounded text-xs font-mono border outline-none resize-none"
          style={{
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        />
        <button
          onClick={handleImport}
          disabled={!importText.trim()}
          className="px-4 py-2 rounded text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          导入
        </button>
      </div>
    </div>
  )
}
