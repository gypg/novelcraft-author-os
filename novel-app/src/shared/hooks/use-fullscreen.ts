import { useEffect } from 'react'
import { useEditorStore } from '@/modules'

export function useFullscreen() {
  const isFullscreen = useEditorStore((s) => s.isFullscreen)
  const toggleFullscreen = useEditorStore((s) => s.toggleFullscreen)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFullscreen])

  return { isFullscreen, toggleFullscreen }
}
