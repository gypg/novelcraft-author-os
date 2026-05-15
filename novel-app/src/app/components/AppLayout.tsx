import { Outlet } from 'react-router-dom'
import { useEditorStore } from '@/modules'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { LogViewerPanel } from '@/shared/components/LogViewerPanel'

export function AppLayout() {
  const isFullscreen = useEditorStore((s) => s.isFullscreen)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--app-page-bg)',
      }}
    >
      <div style={{ flexShrink: 0, display: isFullscreen ? 'none' : 'block' }}>
        <TopBar />
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ flexShrink: 0, display: isFullscreen ? 'none' : 'flex', height: '100%', overflow: 'hidden' }}>
          <Sidebar />
        </div>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--app-page-bg)',
          }}
        >
          <Outlet />
        </main>
      </div>

      {!isFullscreen && <LogViewerPanel />}

      <div style={{ flexShrink: 0, display: isFullscreen ? 'none' : 'block' }}>
        <BottomBar />
      </div>
    </div>
  )
}
