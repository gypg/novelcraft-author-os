export type SwarmSubMode = 'router' | 'supervisor' | 'peer' | 'planner-executor' | 'emergent'

export { runRouterMode, type Expert } from './router-mode'
export { runSupervisorMode } from './supervisor-mode'
export { runPeerHandoffMode } from './peer-handoff-mode'
export { runPlannerExecutorMode } from './planner-executor-mode'
export { runEmergentMode } from './emergent-mode'
export type { SwarmConfig, SwarmResult } from './swarm-engine'
