import { callLlmForSwarm, repairJson, type SwarmConfig, type SwarmResult, getSwarmConfig } from './swarm-engine'
import { logger } from '@/shared/utils/logger'

const PLAN_PROMPT = `你是一个任务规划专家。将复杂任务分解为可执行的子任务列表。

输出格式（JSON）：
{
  "plan": [
    { "id": 1, "task": "子任务描述", "priority": "high|medium|low" }
  ]
}

最多分解为 5 个子任务。只输出 JSON。`

const VALIDATE_PROMPT = `你是一个计划审查员。评估以下计划是否合理。

输出格式（JSON）：
{
  "valid": true或false,
  "issues": ["问题1"],
  "suggestion": "改进建议"
}

只输出 JSON。`

export async function runPlannerExecutorMode(
  task: string,
  workerConfig: { systemPrompt: string; temperature?: number },
  overrides?: Partial<SwarmConfig>,
): Promise<SwarmResult> {
  const config = getSwarmConfig(overrides)
  let hop = 0

  logger.info('planner-executor', `Starting planner-executor for: ${task.slice(0, 50)}`)

  // Step 1: Plan
  let planRaw = await callLlmForSwarm(
    PLAN_PROMPT,
    `任务：${task}`,
    config.role,
    { temperature: 0.3, maxTokens: 1000 },
  )

  let plan: Array<{ id: number; task: string; priority: string }>
  try {
    const repaired = repairJson(planRaw)
    plan = JSON.parse(repaired).plan || []
  } catch {
    plan = [{ id: 1, task, priority: 'high' }]
  }

  // Step 2: Validate (with retry)
  for (let v = 0; v < config.maxRetries; v++) {
    const validateRaw = await callLlmForSwarm(
      VALIDATE_PROMPT,
      `任务：${task}\n\n计划：\n${JSON.stringify(plan, null, 2)}`,
      config.role,
      { temperature: 0.2, maxTokens: 500 },
    )

    try {
      const repaired = repairJson(validateRaw)
      const result = JSON.parse(repaired)
      if (result.valid === true) {
        logger.info('planner-executor', 'Plan validated')
        break
      }
      logger.info('planner-executor', `Plan rejected: ${result.suggestion}`)
      // Re-plan with feedback
      planRaw = await callLlmForSwarm(
        PLAN_PROMPT,
        `任务：${task}\n\n上一个计划有问题：${result.suggestion || result.issues?.join(', ')}\n请重新规划。`,
        config.role,
        { temperature: 0.3, maxTokens: 1000 },
      )
      try {
        const repaired2 = repairJson(planRaw)
        plan = JSON.parse(repaired2).plan || plan
      } catch {
        // keep existing plan
      }
    } catch {
      break
    }
    hop++
  }

  // Step 3: Execute workers
  const results: string[] = []
  for (const subtask of plan) {
    if (hop >= config.maxHops) break

    logger.info('planner-executor', `Executing subtask ${subtask.id}: ${subtask.task.slice(0, 40)}`)
    const output = await callLlmForSwarm(
      workerConfig.systemPrompt,
      `请执行以下子任务：\n${subtask.task}\n\n原始任务：${task}`,
      config.role,
      { temperature: workerConfig.temperature ?? 0.7 },
    )
    results.push(output)
    hop++
  }

  // Step 4: Synthesize
  logger.info('planner-executor', 'Synthesizing results')
  const synthesized = await callLlmForSwarm(
    '你是一个结果合成专家。请将以下多个子任务的结果合并为一个连贯的最终输出。',
    results.map((r, i) => `[子任务 ${i + 1}]\n${r.slice(0, 1000)}`).join('\n\n'),
    config.role,
    { temperature: 0.5, maxTokens: 4000 },
  )

  return {
    success: true,
    output: synthesized,
    hops: hop,
  }
}
