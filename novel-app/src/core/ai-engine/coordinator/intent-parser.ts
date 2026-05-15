export type IntentType =
  | 'write-chapter'
  | 'audit-chapter'
  | 'revise-chapter'
  | 'write-audit-loop'
  | 'continue-chat'
  | 'unknown'
  | 'plan-chapter'
  | 'compose-context'
  | 'observe-chapter'
  | 'full-pipeline'
  | 'swarm'
  | 'autopilot'

export interface InteractionRequest {
  intent: IntentType
  bookId?: string
  chapterId?: string
  params: Record<string, unknown>
  rawInput: string
}

const SLASH_COMMANDS: Record<
  string,
  { intent: IntentType; parser: (args: string) => Partial<InteractionRequest> }
> = {
  '/write': {
    intent: 'write-chapter',
    parser: (args) => ({ params: { instruction: args } }),
  },
  '/audit': {
    intent: 'audit-chapter',
    parser: (args) => ({
      params: { focusDimensions: args.split(',').map((s) => s.trim()) },
    }),
  },
  '/revise': {
    intent: 'revise-chapter',
    parser: (args) => ({ params: { specificIssues: args } }),
  },
  '/loop': {
    intent: 'write-audit-loop',
    parser: (args) => ({ params: { maxIterations: parseInt(args) || 3 } }),
  },
  '/plan': {
    intent: 'plan-chapter',
    parser: (args) => ({ params: { instruction: args } }),
  },
  '/compose': {
    intent: 'compose-context',
    parser: () => ({ params: {} }),
  },
  '/observe': {
    intent: 'observe-chapter',
    parser: () => ({ params: {} }),
  },
  '/run': {
    intent: 'full-pipeline',
    parser: (args) => ({ params: { instruction: args } }),
  },
  '/swarm': {
    intent: 'swarm',
    parser: (args) => ({ params: { mode: args.split(' ')[0] || 'router', task: args.split(' ').slice(1).join(' ') } }),
  },
  '/autopilot': {
    intent: 'autopilot',
    parser: () => ({ params: {} }),
  },
  '/outline': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'show-outline' } }),
  },
  '/export': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'export' } }),
  },
  '/status': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'status' } }),
  },
  '/help': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'help' } }),
  },
  '/compact': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'compact' } }),
  },
  '/config': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'config' } }),
  },
  '/debug': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'debug' } }),
  },
  '/model': {
    intent: 'continue-chat',
    parser: () => ({ params: { action: 'model' } }),
  },
}

const NL_KEYWORDS: Record<string, IntentType> = {
  续写: 'write-chapter',
  写下: 'write-chapter',
  创作: 'write-chapter',
  开始写: 'write-chapter',
  审计: 'audit-chapter',
  检查: 'audit-chapter',
  质量: 'audit-chapter',
  审稿: 'audit-chapter',
  修改: 'revise-chapter',
  修订: 'revise-chapter',
  修复: 'revise-chapter',
  润色: 'revise-chapter',
  循环: 'write-audit-loop',
  写完检查: 'write-audit-loop',
  全流程: 'full-pipeline',
  完整写作: 'full-pipeline',
  蚁群: 'swarm',
  自动驾驶: 'autopilot',
  规划: 'plan-chapter',
  编排: 'compose-context',
  观察: 'observe-chapter',
}

function detectIntentFromNL(input: string): IntentType {
  for (const [keyword, intent] of Object.entries(NL_KEYWORDS)) {
    if (input.includes(keyword)) {
      return intent
    }
  }
  return 'continue-chat'
}

export function parseIntent(
  input: string,
  context?: { bookId?: string; chapterId?: string },
): InteractionRequest {
  const trimmed = input.trim()

  // Slash command
  if (trimmed.startsWith('/')) {
    const spaceIdx = trimmed.indexOf(' ')
    const command = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
    const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1)

    const def = SLASH_COMMANDS[command.toLowerCase()]
    if (def) {
      const parsed = def.parser(args)
      return {
        intent: def.intent,
        bookId: context?.bookId,
        chapterId: context?.chapterId,
        params: parsed.params ?? {},
        rawInput: input,
      }
    }
  }

  // Natural language
  const intent = detectIntentFromNL(trimmed)

  return {
    intent,
    bookId: context?.bookId,
    chapterId: context?.chapterId,
    params: {},
    rawInput: input,
  }
}
