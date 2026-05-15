import { resilientCallLlm } from '../resilience'
import { resolveProviderAndModel, type AgentRole } from '../model-router'
import { compressContext } from '../context-budget'
import type { ChatMessage } from '../providers'
import { logger } from '@/shared/utils/logger'

export interface SwarmConfig {
  maxHops: number
  maxRetries: number
  validator?: (output: string) => boolean
  role?: AgentRole
}

export interface SwarmResult {
  success: boolean
  output: string
  hops: number
  error?: string
}

const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  maxHops: 10,
  maxRetries: 3,
  role: 'writer',
}

export function repairJson(raw: string): string {
  let str = raw

  // Remove markdown code fences
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    str = fenceMatch[1]
  }

  // Find JSON boundaries
  const jsonStart = str.indexOf('{')
  const jsonEnd = str.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    str = str.slice(jsonStart, jsonEnd + 1)
  }

  // Fix trailing commas
  str = str.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

  // Try to fix unclosed strings
  const lines = str.split('\n')
  const fixedLines = lines.map((line) => {
    const trimmed = line.trimEnd()
    if (trimmed.endsWith('"') || trimmed.endsWith("'")) return trimmed
    // Check for unclosed quotes
    const quoteCount = (trimmed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      return trimmed + '"'
    }
    return trimmed
  })

  return fixedLines.join('\n')
}

export async function callLlmForSwarm(
  systemPrompt: string,
  userMessage: string,
  role: AgentRole = 'writer',
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const route = await resolveProviderAndModel(role)
  if (!route.providerId) {
    throw new Error('No provider configured')
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  const compressed = compressContext(messages, 8000)

  return resilientCallLlm({
    providerId: route.providerId,
    model: route.model,
    messages: compressed,
    maxTokens: options?.maxTokens ?? 4000,
    temperature: options?.temperature ?? 0.7,
  })
}

export function getSwarmConfig(overrides?: Partial<SwarmConfig>): SwarmConfig {
  return { ...DEFAULT_SWARM_CONFIG, ...overrides }
}

export async function validateOrRetry(
  output: string,
  config: SwarmConfig,
  attempt: number,
): Promise<{ valid: boolean; output: string }> {
  if (!config.validator) {
    return { valid: true, output }
  }

  if (config.validator(output)) {
    return { valid: true, output }
  }

  if (attempt >= config.maxRetries) {
    return { valid: false, output }
  }

  // Try to repair JSON
  const repaired = repairJson(output)
  if (repaired !== output && config.validator(repaired)) {
    logger.info('swarm-engine', 'JSON repaired successfully')
    return { valid: true, output: repaired }
  }

  return { valid: false, output }
}
