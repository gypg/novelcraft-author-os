import { parseIntent, type InteractionRequest } from './intent-parser'
import { workflowEngine } from '../workflow-engine'
import { callLlm } from '../providers'
import { resolveProviderAndModel } from '../model-router'
import { buildStyleGuardPrompt } from '../style-guard'
import { runRouterMode, runSupervisorMode } from '../modes'
import { logger } from '@/shared/utils/logger'
import { useAICollabStore } from '@/modules/ai-collab/store'

export interface CoordinatorResponse {
  type: 'text' | 'pipeline-started' | 'error'
  content: string
  requestId?: string
}

interface CoordinatorContext {
  bookId: string
  chapterId: string
  chapterContent: string
  providerId?: string
  model?: string
  onDelta?: (delta: string) => void
}

class Coordinator {
  async handleInput(
    input: string,
    context: CoordinatorContext,
  ): Promise<CoordinatorResponse> {
    const request = parseIntent(input, {
      bookId: context.bookId,
      chapterId: context.chapterId,
    })

    const { mode, swarmSubMode } = useAICollabStore.getState()

    logger.info('coordinator', `Intent: ${request.intent} | Mode: ${mode} | Input: ${input.slice(0, 50)}`)

    if (mode === 'swarm') {
      return this.handleSwarm(request, context, swarmSubMode)
    }

    if (mode === 'multi') {
      return this.startPipeline(request, context, 'full-pipeline')
    }

    switch (request.intent) {
      case 'write-chapter':
        return this.startPipeline(request, context, 'write-audit')

      case 'audit-chapter':
        return this.startPipeline(request, context, 'audit-only')

      case 'revise-chapter':
        return this.startPipeline(request, context, 'revise-only')

      case 'write-audit-loop':
        return this.startPipeline(request, context, 'write-audit')

      case 'full-pipeline':
      case 'plan-chapter':
        return this.startPipeline(request, context, 'full-pipeline')

      case 'observe-chapter':
        return this.startPipeline(request, context, 'audit-only')

      case 'swarm':
        return this.handleSwarm(request, context, swarmSubMode)

      case 'autopilot':
        return { type: 'text', content: '请在自动驾驶页面启动。' }

      case 'continue-chat':
        return this.handleChat(input, context)

      case 'unknown':
      default:
        return {
          type: 'text',
          content: '未识别的指令。使用 /write /audit /revise /loop /run 或自然语言描述需求。',
        }
    }
  }

  private async startPipeline(
    request: InteractionRequest,
    context: CoordinatorContext,
    mode: 'write-audit' | 'audit-only' | 'revise-only' | 'full-pipeline',
  ): Promise<CoordinatorResponse> {
    const agentContext = {
      bookId: request.bookId ?? context.bookId,
      chapterId: request.chapterId ?? context.chapterId,
      chapterContent: context.chapterContent,
    }

    const modelRoute = context.providerId
      ? { role: 'coordinator' as const, providerId: context.providerId, model: context.model || '' }
      : undefined

    workflowEngine
      .runWithMode(agentContext, mode, { onDelta: context.onDelta, modelRoute })
      .catch((err) => logger.error('coordinator', `Pipeline error: ${err}`))

    const modeLabels: Record<string, string> = {
      'write-audit': '写作→审计',
      'audit-only': '审计',
      'revise-only': '修订',
      'full-pipeline': '规划→编排→写作→审计',
    }

    return {
      type: 'pipeline-started',
      content: `已启动 ${modeLabels[mode]} 管线，请等待...`,
      requestId: context.chapterId,
    }
  }

  private async handleSwarm(
    request: InteractionRequest,
    context: CoordinatorContext,
    subMode: string = 'router',
  ): Promise<CoordinatorResponse> {
    const mode = subMode || (request.params.mode as string) || 'router'
    const task = (request.params.task as string) || context.chapterContent || '请帮我写一段内容'

    try {
      if (mode === 'router') {
        const result = await runRouterMode(task, [
          {
            name: '写作专家',
            description: '擅长小说正文创作',
            systemPrompt: '你是一个专业的小说写作助手。请根据任务要求创作内容。',
            temperature: 0.8,
          },
          {
            name: '修订专家',
            description: '擅长文本润色和修订',
            systemPrompt: '你是一个专业的文本修订助手。请根据任务要求润色文本。',
            temperature: 0.6,
          },
          {
            name: '审计专家',
            description: '擅长文本质量检查',
            systemPrompt: '你是一个专业的文本审计员。请根据任务要求检查文本质量。',
            temperature: 0.3,
          },
        ])
        return { type: 'text', content: result.output }
      }

      if (mode === 'supervisor') {
        const result = await runSupervisorMode(task, {
          systemPrompt: '你是一个专业的小说写作助手。请执行分配给你的子任务。',
          temperature: 0.7,
        })
        return { type: 'text', content: result.output }
      }

      return { type: 'text', content: `未知的蚁群模式: ${mode}。可用模式: router, supervisor` }
    } catch (err) {
      return { type: 'error', content: `蚁群执行失败: ${String(err)}` }
    }
  }

  private async handleChat(
    input: string,
    context: CoordinatorContext,
  ): Promise<CoordinatorResponse> {
    try {
      const route = context.providerId
        ? { providerId: context.providerId, model: context.model || '' }
        : await resolveProviderAndModel('coordinator')
      if (!route.providerId) {
        return { type: 'error', content: '未配置 AI Provider，请在设置中添加。' }
      }

      const systemPrompt = [
        '你是一个小说创作助手。请用简洁的中文回答用户的问题。',
        '如果用户想执行写作、审计或修订操作，请建议使用 /write /audit /revise 命令。',
        '',
        buildStyleGuardPrompt(),
      ].join('\n')

      let response = ''
      await callLlm({
        providerId: route.providerId,
        model: route.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        maxTokens: 1000,
        temperature: 0.7,
        onDelta: context.onDelta,
        onComplete: (full) => {
          response = full
        },
      })

      return { type: 'text', content: response }
    } catch (err) {
      logger.error('coordinator', `Chat error: ${err}`)
      return { type: 'error', content: `AI 调用失败：${String(err)}` }
    }
  }
}

export const coordinator = new Coordinator()
