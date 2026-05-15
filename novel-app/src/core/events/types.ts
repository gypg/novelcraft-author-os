import type { AuditReport, AuditReportMeta } from '../ai-engine/agents/audit-types'

export interface AppEvents {
  'editor:content-changed': { bookId: string; chapterId: string; content: string }

  // Book events
  'book:created': { bookId: string }
  'book:updated': { bookId: string }
  'book:deleted': { bookId: string }

  // Chapter events
  'chapter:created': { bookId: string; chapterId: string }
  'chapter:updated': { bookId: string; chapterId: string }
  'chapter:deleted': { bookId: string; chapterId: string }

  // AI events
  'ai:stream:start': { requestId: string }
  'ai:stream:delta': { requestId: string; text: string }
  'ai:stream:complete': { requestId: string }
  'ai:stream:error': { requestId: string; error: string }
  'ai:mode:changed': { mode: 'single' | 'multi' | 'swarm' }
  'ai:model-route:changed': { role: string }
  'ai:resilience:degraded': { stage: string; error: string }

  // Pipeline events
  'pipeline:stage:start': { stage: string; requestId: string }
  'pipeline:stage:complete': { stage: string; requestId: string }
  'pipeline:status': { status: 'idle' | 'running' | 'audit' | 'revise' | 'completed' | 'paused'; iteration: number }
  'pipeline:report:ready': { report: AuditReport; meta: AuditReportMeta }
  'pipeline:audit:complete': { bookId: string; chapterId: string; score: number }
  'pipeline:quality-gate:iteration': { iteration: number; criticalCount: number }
  'pipeline:quality-gate:exceeded': { maxRetries: number; finalCriticalCount: number }
  'pipeline:plan:complete': { bookId: string; chapterId: string; goalsCount: number }
  'pipeline:observe:complete': { bookId: string; chapterId: string; factsExtracted: number }
  'pipeline:truth-file:updated': { bookId: string; fileType: string }

  // Auto-pilot events
  'auto-pilot:start': { bookId: string }
  'auto-pilot:stop': { bookId: string }
  'auto-pilot:chapter-complete': { bookId: string; chapterId: string; score: number }

  // Swarm events
  'swarm:router:selected': { expert: string; reason: string }
  'swarm:supervisor:iteration': { hop: number; subtaskCount: number }

  // Style events
  'style:drift-detected': { similarity: number; threshold: number }

  // Export events
  'export:complete': { format: string; filename: string }
  'export:error': { format: string; error: string }

  // Hook events
  'hook:stale-detected': { hookCount: number; chapterNumber: number }

  // Tension events
  'tension:anomaly-detected': { chapterNumber: number; score: number }

  // Plugin events
  'plugin:installed': { pluginId: string; name: string }
  'plugin:uninstalled': { pluginId: string }

  // UI events
  'ui:theme:changed': { theme: string }
  'ui:sidebar:toggle': { collapsed: boolean }
  'ui:right-panel:toggle': { collapsed: boolean }
}
