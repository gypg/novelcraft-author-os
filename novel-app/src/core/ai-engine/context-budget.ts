import type { ChatMessage } from './providers'

export interface BudgetConfig {
  maxTokens: number
  layers: {
    name: string
    percentage: number
  }[]
}

const DEFAULT_LAYERS = [
  { name: 'core', percentage: 0.20 },
  { name: 'recent', percentage: 0.30 },
  { name: 'history', percentage: 0.20 },
  { name: 'conversation', percentage: 0.15 },
  { name: 'reserve', percentage: 0.15 },
]

const DEFAULT_CONFIG: BudgetConfig = {
  maxTokens: 8000,
  layers: DEFAULT_LAYERS,
}

export function estimateTokens(text: string): number {
  if (!text) return 0

  let cjkCount = 0
  let otherCount = 0

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      cjkCount++
    } else {
      otherCount++
    }
  }

  return Math.ceil(cjkCount / 1.5) + Math.ceil(otherCount / 4)
}

export function allocateBudget(config: Partial<BudgetConfig> = {}): Record<string, number> {
  const { maxTokens = DEFAULT_CONFIG.maxTokens, layers = DEFAULT_CONFIG.layers } = config
  const result: Record<string, number> = {}

  for (const layer of layers) {
    result[layer.name] = Math.floor(maxTokens * layer.percentage)
  }

  return result
}

export function estimateMessageTokens(messages: ChatMessage[]): {
  total: number
  byRole: Record<string, number>
} {
  const byRole: Record<string, number> = {}
  let total = 0

  for (const msg of messages) {
    const tokens = estimateTokens(msg.content)
    byRole[msg.role] = (byRole[msg.role] || 0) + tokens
    total += tokens
  }

  return { total, byRole }
}

export function compressContext(
  messages: ChatMessage[],
  maxTokens: number,
  config?: Partial<BudgetConfig>,
): ChatMessage[] {
  const budget = allocateBudget(config)
  const { total } = estimateMessageTokens(messages)

  if (total <= maxTokens) {
    return messages
  }

  const result: ChatMessage[] = []
  let usedTokens = 0

  // 1. Keep system messages (core budget)
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  for (const msg of systemMessages) {
    const tokens = estimateTokens(msg.content)
    if (usedTokens + tokens <= budget.core) {
      result.push(msg)
      usedTokens += tokens
    }
  }

  // 2. Keep most recent messages (recent budget)
  const recentBudget = budget.recent
  const recentMessages: ChatMessage[] = []
  let recentTokens = 0

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(nonSystemMessages[i].content)
    if (recentTokens + tokens <= recentBudget) {
      recentMessages.unshift(nonSystemMessages[i])
      recentTokens += tokens
    } else {
      break
    }
  }

  result.push(...recentMessages)
  usedTokens += recentTokens

  // 3. Fill remaining with history messages (truncated)
  const historyBudget = maxTokens - usedTokens - budget.reserve
  if (historyBudget > 0) {
    const earlierMessages = nonSystemMessages.slice(
      0,
      nonSystemMessages.length - recentMessages.length,
    )

    for (const msg of earlierMessages) {
      const tokens = estimateTokens(msg.content)
      if (usedTokens + tokens <= maxTokens - budget.reserve) {
        result.push(msg)
        usedTokens += tokens
      } else {
        // Truncate to fit
        const remaining = maxTokens - budget.reserve - usedTokens
        if (remaining > 50) {
          const truncated = truncateToTokens(msg.content, remaining)
          result.push({ ...msg, content: truncated })
        }
        break
      }
    }
  }

  return result
}

function truncateToTokens(text: string, maxTokens: number): string {
  // Rough character limit based on token estimate
  const chars = [...text]
  let tokens = 0
  let i = 0

  for (; i < chars.length; i++) {
    tokens += estimateTokens(chars[i])
    if (tokens >= maxTokens) break
  }

  return chars.slice(0, i).join('') + '...'
}
