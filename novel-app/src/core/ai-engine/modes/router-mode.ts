import { callLlmForSwarm, repairJson, type SwarmConfig, type SwarmResult, getSwarmConfig } from './swarm-engine'
import { logger } from '@/shared/utils/logger'

export interface Expert {
  name: string
  description: string
  systemPrompt: string
  temperature?: number
}

const ROUTER_SYSTEM_PROMPT = `你是一个任务路由器。根据用户任务的性质，从给定的专家列表中选择最合适的一个。

输出格式（JSON）：
{
  "selectedExpert": "专家名称",
  "reason": "选择原因（一句话）"
}

只输出 JSON，不要添加其他文字。`

export async function runRouterMode(
  task: string,
  experts: Expert[],
  overrides?: Partial<SwarmConfig>,
): Promise<SwarmResult> {
  const config = getSwarmConfig(overrides)

  if (experts.length === 0) {
    return { success: false, output: '', hops: 0, error: 'No experts provided' }
  }

  if (experts.length === 1) {
    // Only one expert, skip routing
    logger.info('router-mode', `Single expert: ${experts[0].name}`)
    const output = await callLlmForSwarm(
      experts[0].systemPrompt,
      task,
      config.role,
      { temperature: experts[0].temperature },
    )
    return { success: true, output, hops: 1 }
  }

  // Step 1: Router selects expert
  logger.info('router-mode', `Routing task to best expert from ${experts.length} candidates`)

  const expertList = experts
    .map((e) => `- ${e.name}: ${e.description}`)
    .join('\n')

  const routerOutput = await callLlmForSwarm(
    ROUTER_SYSTEM_PROMPT,
    `可用专家：\n${expertList}\n\n任务：${task}`,
    config.role,
    { temperature: 0.2, maxTokens: 500 },
  )

  let selectedName: string
  try {
    const repaired = repairJson(routerOutput)
    const parsed = JSON.parse(repaired)
    selectedName = parsed.selectedExpert
  } catch {
    // Fallback to first expert
    selectedName = experts[0].name
    logger.warn('router-mode', 'Failed to parse router output, using first expert')
  }

  const selected = experts.find((e) => e.name === selectedName) ?? experts[0]
  logger.info('router-mode', `Selected expert: ${selected.name}`)

  // Step 2: Expert executes
  const output = await callLlmForSwarm(
    selected.systemPrompt,
    task,
    config.role,
    { temperature: selected.temperature },
  )

  return { success: true, output, hops: 2 }
}
