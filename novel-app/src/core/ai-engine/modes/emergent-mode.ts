import { callLlmForSwarm, type SwarmConfig, type SwarmResult, getSwarmConfig } from './swarm-engine'
import { logger } from '@/shared/utils/logger'

const WRITER_VARIANTS = [
  { style: '简洁利落', temperature: 0.6 },
  { style: '华丽细腻', temperature: 0.9 },
  { style: '悬疑紧张', temperature: 0.75 },
]

const FINALIZER_PROMPT = `你是一个创意合成专家。请从以下多个不同风格的写作片段中，选择最精彩的段落并合并为一个连贯的输出。

要求：
- 保留每个片段中最出彩的句子
- 确保合并后文本连贯自然
- 不要添加任何解释，直接输出合并后的文本`

export async function runEmergentMode(
  task: string,
  config?: Partial<SwarmConfig>,
): Promise<SwarmResult> {
  const swarmConfig = getSwarmConfig(config)
  const writerCount = Math.min(WRITER_VARIANTS.length, swarmConfig.maxHops)

  logger.info('emergent', `Starting emergent mode with ${writerCount} writers`)

  // Step 1: Multiple writers generate in parallel
  const writerPromises = WRITER_VARIANTS.slice(0, writerCount).map(async (variant, i) => {
    logger.info('emergent', `Writer ${i + 1} (${variant.style}) generating`)
    const output = await callLlmForSwarm(
      `你是一个小说写作助手。请用"${variant.style}"的风格完成以下写作任务。`,
      task,
      swarmConfig.role,
      { temperature: variant.temperature, maxTokens: 2000 },
    )
    return { index: i, style: variant.style, output }
  })

  const writerResults = await Promise.all(writerPromises)

  // Step 2: Collect to blackboard
  const blackboard = writerResults
    .map((r) => `[${r.style}风格]\n${r.output}`)
    .join('\n\n---\n\n')

  logger.info('emergent', `Blackboard collected: ${writerResults.length} fragments`)

  // Step 3: Finalizer selects and merges
  const finalOutput = await callLlmForSwarm(
    FINALIZER_PROMPT,
    blackboard,
    swarmConfig.role,
    { temperature: 0.5, maxTokens: 3000 },
  )

  return {
    success: true,
    output: finalOutput,
    hops: writerCount + 1,
  }
}
