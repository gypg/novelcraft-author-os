import { callLlm, type CallLlmOptions } from './providers'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  timeoutMs: number
}

export interface ResilientCallOptions extends CallLlmOptions {
  retryConfig?: Partial<RetryConfig>
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
}

interface LlmErrorInfo {
  code: string
  message: string
  retryable: boolean
}

export function parseLlmError(err: unknown): LlmErrorInfo {
  const msg = typeof err === 'string' ? err : String(err)

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('Too Many Requests')) {
    return { code: 'RATE_LIMIT', message: msg, retryable: true }
  }
  if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
    return { code: 'TIMEOUT', message: msg, retryable: true }
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
    return { code: 'NETWORK', message: msg, retryable: true }
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('invalid_api_key')) {
    return { code: 'AUTH', message: msg, retryable: false }
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return { code: 'SERVER', message: msg, retryable: true }
  }
  if (msg.includes('context') && (msg.includes('exceed') || msg.includes('length') || msg.includes('limit'))) {
    return { code: 'TOKEN_LIMIT', message: msg, retryable: true }
  }
  if (msg.includes('token') && msg.includes('limit')) {
    return { code: 'TOKEN_LIMIT', message: msg, retryable: true }
  }

  return { code: 'UNKNOWN', message: msg, retryable: true }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise
      .then((val) => {
        clearTimeout(timer)
        resolve(val)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function resilientCallLlm(options: ResilientCallOptions): Promise<string> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }
  const callOptions: Omit<ResilientCallOptions, 'retryConfig'> = {
    providerId: options.providerId,
    messages: options.messages,
    model: options.model,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    onDelta: options.onDelta,
    onComplete: options.onComplete,
    onError: options.onError,
  }

  let lastError: string = ''

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await withTimeout(
        callLlm({
          ...callOptions,
          onDelta: options.onDelta,
          onComplete: options.onComplete,
          onError: options.onError,
        }),
        config.timeoutMs,
      )
      return result
    } catch (err) {
      const errorInfo = parseLlmError(err)
      lastError = errorInfo.message

      logger.warn('resilience', `LLM call failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${errorInfo.code} - ${errorInfo.message}`)

      if (!errorInfo.retryable || attempt >= config.maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      let delay = config.baseDelayMs * Math.pow(2, attempt)

      // For 429, use longer delay
      if (errorInfo.code === 'RATE_LIMIT') {
        delay = Math.max(delay, config.baseDelayMs * 4)
      }

      delay = Math.min(delay, config.maxDelayMs)

      logger.info('resilience', `Retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }

  // All retries exhausted — graceful degradation
  logger.error('resilience', `All retries exhausted. Last error: ${lastError}`)
  eventBus.emit('ai:resilience:degraded', {
    stage: options.providerId,
    error: lastError,
  })

  return ''
}
