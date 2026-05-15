import { useEffect, useCallback } from 'react'

export interface ShortcutDefinition {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (inInput) {
        if (e.key !== 'Escape' && !(e.ctrlKey || e.metaKey)) return
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts, enabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const DEFAULT_SHORTCUTS_INFO: Array<{ key: string; description: string }> = [
  { key: 'Ctrl+K', description: '全局搜索' },
  { key: 'Ctrl+S', description: '手动保存' },
  { key: 'Ctrl+Shift+F', description: '全屏编辑' },
  { key: 'Ctrl+Shift+E', description: '导出' },
  { key: 'Ctrl+/', description: '斜杠命令' },
  { key: 'Escape', description: '关闭对话框' },
]
