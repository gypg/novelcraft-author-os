import { callLlmForSwarm, repairJson, type SwarmConfig, type SwarmResult, getSwarmConfig } from './swarm-engine'
import { logger } from '@/shared/utils/logger'

interface WorkerConfig {
  systemPrompt: string
  temperature?: number
}

const SUPERVISOR_DECOMPOSE_PROMPT = `你是一个任务分解专家。将给定的复杂任务分解为可独立执行的子任务。

输出格式（JSON）：
{
  "subtasks": [
    { "id": 1, "description": "子任务描述", "priority": "high|medium|low" }
  ]
}

子任务应该具体、可执行、有明确的输出要求。最多分解为 5 个子任务。只输出 JSON。`

const SUPERVISOR_REVIEW_PROMPT = `你是一个质量审查员。审查以下执行结果是否满足任务要求。

输出格式（JSON）：
{
  "approved": true或false,
  "issues": ["问题1", "问题2"],
  "feedback": "改进建议（如果未通过）"
}

只输出 JSON。`

export async function runSupervisorMode(
  task: string,
  workerConfig: WorkerConfig,
  overrides?: Partial<SwarmConfig>,
): Promise<SwarmResult> {
  const config = getSwarmConfig(overrides)

  // Step 1: Decompose task
  logger.info('supervisor-mode', 'Decomposing task into subtasks')

  const decomposed = await callLlmForSwarm(
    SUPERVISOR_DECOMPOSE_PROMPT,
    `任务：${task}`,
    config.role,
    { temperature: 0.3, maxTokens: 1000 },
  )

  let subtasks: Array<{ id: number; description: string; priority: string }>
  try {
    const repaired = repairJson(decomposed)
    const parsed = JSON.parse(repaired)
    subtasks = parsed.subtasks || [{ id: 1, description: task, priority: 'high' }]
  } catch {
    subtasks = [{ id: 1, description: task, priority: 'high' }]
    logger.warn('supervisor-mode', 'Failed to parse decomposition, using single task')
  }

  // Step 2: Execute + Review loop
  const results: string[] = []
  let hop = 0

  for (const subtask of subtasks) {
    if (hop >= config.maxHops) {
      logger.warn('supervisor-mode', `Max hops (${config.maxHops}) reached`)
      break
    }

    // Execute subtask
    logger.info('supervisor-mode', `Executing subtask ${subtask.id}: ${subtask.description.slice(0, 50)}`)

    const executed = await callLlmForSwarm(
      workerConfig.systemPrompt,
      `请执行以下子任务：\n\n${subtask.description}\n\n原始任务：${task}`,
      config.role,
      { temperature: workerConfig.temperature ?? 0.7 },
    )
    hop++

    // Review
    logger.info('supervisor-mode', `Reviewing subtask ${subtask.id}`)

    const reviewed = await callLlmForSwarm(
      SUPERVISOR_REVIEW_PROMPT,
      `任务要求：${subtask.description}\n\n执行结果：\n${executed}`,
      config.role,
      { temperature: 0.2, maxTokens: 500 },
    )
    hop++

    let _approved = true
    try {
      const repaired = repairJson(reviewed)
      const parsed = JSON.parse(repaired)
      const isApproved = parsed.approved === true
      _approved = isApproved
      if (!isApproved && hop < config.maxHops) {
        logger.info('supervisor-mode', `Subtask ${subtask.id} rejected, retrying`)
        // Re-execute with feedback
        const feedback = parsed.feedback || '请改进输出质量'
        const retryResult = await callLlmForSwarm(
          workerConfig.systemPrompt,
          `请重新执行以下子任务，注意改进：\n${feedback}\n\n任务：${subtask.description}\n\n原始任务：${task}`,
          config.role,
          { temperature: workerConfig.temperature ?? 0.7 },
        )
        results.push(retryResult)
        hop++
        continue
      }
    } catch {
      // If review parse fails, accept the result
    }

    results.push(executed)
  }

  // Step 3: Finalize — combine all results
  const finalOutput = results.join('\n\n')

  return {
    success: true,
    output: finalOutput,
    hops: hop,
  }
}
