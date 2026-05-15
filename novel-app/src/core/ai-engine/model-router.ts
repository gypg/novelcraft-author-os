import { listProviders } from './providers'
import { eventBus } from '@/core/events'

export type AgentRole = 'writer' | 'auditor' | 'reviser' | 'coordinator'
  | 'planner' | 'composer' | 'observer' | 'director'
  | 'router' | 'supervisor' | 'finalizer' | 'worker'

export interface ModelRoute {
  role: AgentRole
  providerId: string
  model: string
}

export interface ModelRouterConfig {
  routes: Record<AgentRole, ModelRoute | null>
}

const STORAGE_KEY = 'model-router-config'

export const DEFAULT_ROLES: AgentRole[] = ['writer', 'auditor', 'reviser', 'coordinator', 'planner', 'composer', 'observer', 'director', 'router', 'supervisor', 'finalizer', 'worker']

export const ROLE_LABELS: Record<AgentRole, string> = {
  writer: '写作 Agent',
  auditor: '审计 Agent',
  reviser: '修订 Agent',
  coordinator: '协调 Agent',
  planner: '规划 Agent',
  composer: '编排 Agent',
  observer: '观察 Agent',
  director: '导演 Agent',
  router: '路由 Agent',
  supervisor: '监督 Agent',
  finalizer: '终结 Agent',
  worker: '工人 Agent',
}

export function getModelRoute(role: AgentRole): ModelRoute | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const config: ModelRouterConfig = JSON.parse(raw)
    return config.routes[role] ?? null
  } catch {
    return null
  }
}

export function setModelRoute(role: AgentRole, route: ModelRoute | null): void {
  const config = getAllRoutes()
  config.routes[role] = route
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  eventBus.emit('ai:model-route:changed', { role })
}

export function getAllRoutes(): ModelRouterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        routes: {
          writer: null,
          auditor: null,
          reviser: null,
          coordinator: null,
          planner: null,
          composer: null,
          observer: null,
          director: null,
          router: null,
          supervisor: null,
          finalizer: null,
          worker: null,
        },
      }
    }
    const parsed = JSON.parse(raw)
    // Ensure all roles exist (for backward compatibility)
    const allRoles: AgentRole[] = ['writer', 'auditor', 'reviser', 'coordinator', 'planner', 'composer', 'observer', 'director', 'router', 'supervisor', 'finalizer', 'worker']
    for (const role of allRoles) {
      if (!(role in parsed.routes)) {
        parsed.routes[role] = null
      }
    }
    return parsed
  } catch {
    return {
      routes: {
        writer: null,
        auditor: null,
        reviser: null,
        coordinator: null,
        planner: null,
        composer: null,
        observer: null,
        director: null,
        router: null,
        supervisor: null,
        finalizer: null,
        worker: null,
      },
    }
  }
}

export function setAllRoutes(config: ModelRouterConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  eventBus.emit('ai:model-route:changed', { role: 'all' })
}

export async function resolveProviderAndModel(
  role: AgentRole,
): Promise<{ providerId: string; model: string }> {
  // Check configured route first
  const route = getModelRoute(role)
  if (route) {
    return { providerId: route.providerId, model: route.model }
  }

  // Fall back to first available provider
  try {
    const providers = await listProviders()
    if (providers.length > 0) {
      const p = providers[0]
      const models = JSON.parse(p.models) as string[]
      return {
        providerId: p.id,
        model: p.default_model || models[0] || '',
      }
    }
  } catch {
    // ignore
  }

  return { providerId: '', model: '' }
}
