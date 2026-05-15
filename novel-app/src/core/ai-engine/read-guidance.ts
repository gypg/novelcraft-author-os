export type ReadGuidance = 'alwaysRead' | 'readIfRelevant' | 'neverRead'

export interface AgentReadGuidance {
  writer: ReadGuidance
  auditor: ReadGuidance
  reviser: ReadGuidance
  planner: ReadGuidance
  composer: ReadGuidance
  observer: ReadGuidance
}

export const DEFAULT_READ_GUIDANCE: AgentReadGuidance = {
  writer: 'alwaysRead',
  auditor: 'readIfRelevant',
  reviser: 'readIfRelevant',
  planner: 'readIfRelevant',
  composer: 'alwaysRead',
  observer: 'alwaysRead',
}

export function shouldReadTruthFile(
  agentRole: string,
  guidance: AgentReadGuidance = DEFAULT_READ_GUIDANCE,
): boolean {
  const g = guidance[agentRole as keyof AgentReadGuidance] || 'readIfRelevant'
  return g !== 'neverRead'
}
