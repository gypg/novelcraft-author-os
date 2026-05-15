import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary, PageErrorBoundary } from './shared/components/ErrorBoundary'
import { ToastProvider } from './shared/components/Toast'
import { SearchDialog } from './shared/components/SearchDialog'
import { ShortcutHelpDialog } from './shared/components/ShortcutHelpDialog'
import { useKeyboardShortcuts } from './shared/hooks/use-keyboard-shortcuts'
import { useGlobalErrorHandler } from './shared/hooks/use-global-error-handler'
import { AppLayout } from './app/components/AppLayout'
import { PageLoading } from './shared/components/PageLoading'
import { usePipelineToast } from './shared/hooks/use-pipeline-toast'
import { useEditorStore } from './modules/editor/store'

const BookshelfPage = lazy(() => import('./modules/bookshelf/BookshelfPage').then((m) => ({ default: m.BookshelfPage })))
const EditorPage = lazy(() => import('./modules/editor/EditorPage').then((m) => ({ default: m.EditorPage })))
const AICollabPage = lazy(() => import('./modules/ai-collab/AICollabPage').then((m) => ({ default: m.AICollabPage })))
const TruthFilesPage = lazy(() => import('./modules/truth-files-ui/TruthFilesPage').then((m) => ({ default: m.TruthFilesPage })))
const AnalyticsPage = lazy(() => import('./modules/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./modules/theme/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const AutoPilotPage = lazy(() => import('./modules/auto-pilot/AutoPilotPage').then((m) => ({ default: m.AutoPilotPage })))
const WorldBiblePage = lazy(() => import('./modules/world-bible/WorldBiblePage').then((m) => ({ default: m.WorldBiblePage })))
const PluginManagerPage = lazy(() => import('./modules/plugins/PluginManagerPage').then((m) => ({ default: m.PluginManagerPage })))
const CharactersPage = lazy(() => import('./modules/characters/CharactersPage').then((m) => ({ default: m.CharactersPage })))
const TimelinePage = lazy(() => import('./modules/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })))
const KnowledgeGraphPage = lazy(() => import('./modules/knowledge-graph/KnowledgeGraphPage').then((m) => ({ default: m.KnowledgeGraphPage })))
const StylePage = lazy(() => import('./modules/style/StylePage').then((m) => ({ default: m.StylePage })))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      {children}
    </Suspense>
  )
}

function AppWithSearch() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  usePipelineToast()
  useGlobalErrorHandler()

  useKeyboardShortcuts([
    { key: 'k', ctrl: true, description: '全局搜索', action: () => setSearchOpen(true) },
    { key: '/', ctrl: true, shift: true, description: '快捷键帮助', action: () => setHelpOpen(true) },
    { key: 's', ctrl: true, description: '手动保存', action: () => useEditorStore.getState().requestSave() },
    { key: 'f', ctrl: true, description: '查找替换', action: () => {
      const event = new CustomEvent('editor:toggle-search')
      window.dispatchEvent(event)
    }},
  ])

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<PageErrorBoundary><LazyPage><BookshelfPage /></LazyPage></PageErrorBoundary>} />
          <Route path="editor" element={<PageErrorBoundary><LazyPage><EditorPage /></LazyPage></PageErrorBoundary>} />
          <Route path="ai" element={<PageErrorBoundary><LazyPage><AICollabPage /></LazyPage></PageErrorBoundary>} />
          <Route path="truth-files" element={<PageErrorBoundary><LazyPage><TruthFilesPage /></LazyPage></PageErrorBoundary>} />
          <Route path="analytics" element={<PageErrorBoundary><LazyPage><AnalyticsPage /></LazyPage></PageErrorBoundary>} />
          <Route path="settings" element={<PageErrorBoundary><LazyPage><SettingsPage /></LazyPage></PageErrorBoundary>} />
          <Route path="autopilot" element={<PageErrorBoundary><LazyPage><AutoPilotPage /></LazyPage></PageErrorBoundary>} />
          <Route path="world-bible" element={<PageErrorBoundary><LazyPage><WorldBiblePage /></LazyPage></PageErrorBoundary>} />
          <Route path="plugins" element={<PageErrorBoundary><LazyPage><PluginManagerPage /></LazyPage></PageErrorBoundary>} />
          <Route path="characters" element={<PageErrorBoundary><LazyPage><CharactersPage /></LazyPage></PageErrorBoundary>} />
          <Route path="timeline" element={<PageErrorBoundary><LazyPage><TimelinePage /></LazyPage></PageErrorBoundary>} />
          <Route path="knowledge-graph" element={<PageErrorBoundary><LazyPage><KnowledgeGraphPage /></LazyPage></PageErrorBoundary>} />
          <Route path="style" element={<PageErrorBoundary><LazyPage><StylePage /></LazyPage></PageErrorBoundary>} />
        </Route>
      </Routes>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AppWithSearch />
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
