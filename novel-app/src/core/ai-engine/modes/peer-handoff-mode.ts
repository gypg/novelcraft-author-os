import { callLlmForSwarm, repairJson, type SwarmConfig, type SwarmResult, getSwarmConfig } from './swarm-engine'
import { logger } from '@/shared/utils/logger'

const DECIDE_PROMPT = `你是一个自主决策 Agent。根据当前执行结果，决定下一步行动。

输出格式（JSON）：
{
  "decision": "continue" | "complete" | "review",
  "reason": "决策原因",
  "nextTask": "如果是 continue，下一步任务描述"
}

决策说明：
- continue: 继续执行相关任务
- complete: 任务已完成，输出最终结果
- review: 需要审查当前结果

只输出 JSON。`

export async function runPeerHandoffMode(
  task: string,
  agentConfig: { systemPrompt: string; temperature?: number },
  overrides?: Partial<SwarmConfig>,
): Promise<SwarmResult> {
  const config = getSwarmConfig(overrides)
  let hop = 0
  let currentTask = task
  const allOutputs: string[] = []

  logger.info('peer-handoff', `Starting peer-handoff mode for: ${task.slice(0, 50)}`)

  while (hop < config.maxHops) {
    // Execute current task
    logger.info('peer-handoff', `Hop ${hop + 1}: Executing`)
    const output = await callLlmForSwarm(
      agentConfig.systemPrompt,
      currentTask,
      config.role,
      { temperature: agentConfig.temperature ?? 0.7 },
    )
    allOutputs.push(output)
    hop++

    // Decide next action
    logger.info('peer-handoff', `Hop ${hop}: Deciding next action`)
    const decisionRaw = await callLlmForSwarm(
      DECIDE_PROMPT,
      `原始任务：${task}\n\n当前执行结果：\n${output.slice(0, 1000)}`,
      config.role,
      { temperature: 0.2, maxTokens: 500 },
    )

    let decision: string
    let nextTask = ''
    try {
      const repaired = repairJson(decisionRaw)
      const parsed = JSON.parse(repaired)
      decision = parsed.decision || 'complete'
      nextTask = parsed.nextTask || ''
    } catch {
      decision = 'complete'
    }

    logger.info('peer-handoff', `Decision: ${decision}`)

    if (decision === 'complete') {
      break
    }

    if (decision === 'review') {
      // Do a quick review pass
      const reviewOutput = await callLlmForSwarm(
        '你是一个审查员。请简要审查以下内容的质量，指出关键问题。',
        output.slice(0, 2000),
        config.role,
        { temperature: 0.3, maxTokens: 500 },
      )
      allOutputs.push(`[审查意见] ${reviewOutput}`)
      break
    }

    if (nextTask) {
      currentTask = nextTask
    } else {
      break
    }
  }

  return {
    success: true,
    output: allOutputs.join('\n\n'),
    hops: hop,
  }
}
