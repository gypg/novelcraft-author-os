export type ErrorCode =
  | 'MISSING_CREDENTIALS'
  | 'CONTEXT_WINDOW_EXCEEDED'
  | 'EXPIRED_TOKEN'
  | 'AUTH_ERROR'
  | 'INVALID_API_KEY'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'JSON_PARSE_ERROR'
  | 'API_ERROR'
  | 'RETRIES_EXHAUSTED'
  | 'INVALID_SSE_FRAME'
  | 'BACKOFF_OVERFLOW'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

export interface StructuredError {
  type: 'error'
  code: ErrorCode
  error: string
  kind: 'api' | 'safe-fail' | 'cli'
  hint: string
  retryable: boolean
  details?: Record<string, unknown>
}

export function createStructuredError(
  code: ErrorCode,
  message: string,
  options?: { hint?: string; retryable?: boolean; details?: Record<string, unknown> },
): StructuredError {
  return {
    type: 'error',
    code,
    error: message,
    kind: classifyErrorKind(code),
    hint: options?.hint ?? getDefaultHint(code),
    retryable: options?.retryable ?? isRetryable(code),
    details: options?.details,
  }
}

export function parseToStructuredError(err: unknown): StructuredError {
  const msg = typeof err === 'string' ? err : String(err)

  if (msg.includes('429') || msg.includes('rate limit')) {
    return createStructuredError('RATE_LIMIT', msg, { retryable: true })
  }
  if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
    return createStructuredError('TIMEOUT', msg, { retryable: true })
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
    return createStructuredError('NETWORK_ERROR', msg, { retryable: true })
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized')) {
    return createStructuredError('AUTH_ERROR', msg, { hint: '请检查 API Key 是否正确' })
  }
  if (msg.includes('context') && msg.includes('exceed')) {
    return createStructuredError('CONTEXT_WINDOW_EXCEEDED', msg, {
      hint: '上下文超出限制，系统将自动压缩后重试',
      retryable: true,
    })
  }
  if (msg.includes('token') && msg.includes('limit')) {
    return createStructuredError('CONTEXT_WINDOW_EXCEEDED', msg, {
      hint: 'Token 超限，系统将自动压缩后重试',
      retryable: true,
    })
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return createStructuredError('HTTP_ERROR', msg, { retryable: true })
  }
  if (msg.includes('JSON') || msg.includes('parse')) {
    return createStructuredError('JSON_PARSE_ERROR', msg, {
      hint: 'AI 输出格式异常，将尝试自动修复',
      retryable: true,
    })
  }

  return createStructuredError('UNKNOWN_ERROR', msg)
}

function classifyErrorKind(code: ErrorCode): 'api' | 'safe-fail' | 'cli' {
  const apiErrors: ErrorCode[] = [
    'MISSING_CREDENTIALS', 'AUTH_ERROR', 'INVALID_API_KEY',
    'HTTP_ERROR', 'NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT',
    'API_ERROR', 'RETRIES_EXHAUSTED', 'INVALID_SSE_FRAME', 'BACKOFF_OVERFLOW',
  ]
  const safeFailErrors: ErrorCode[] = [
    'CONTEXT_WINDOW_EXCEEDED', 'PROVIDER_UNAVAILABLE', 'DATABASE_ERROR', 'VALIDATION_ERROR',
  ]

  if (apiErrors.includes(code)) return 'api'
  if (safeFailErrors.includes(code)) return 'safe-fail'
  return 'cli'
}

function isRetryable(code: ErrorCode): boolean {
  return ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR', 'JSON_PARSE_ERROR', 'CONTEXT_WINDOW_EXCEEDED'].includes(code)
}

function getDefaultHint(code: ErrorCode): string {
  const hints: Record<ErrorCode, string> = {
    MISSING_CREDENTIALS: '请在设置中配置 API Key',
    CONTEXT_WINDOW_EXCEEDED: '上下文超出限制，系统将自动压缩后重试',
    EXPIRED_TOKEN: 'Token 已过期，请重新配置',
    AUTH_ERROR: '认证失败，请检查 API Key',
    INVALID_API_KEY: 'API Key 无效，请在设置中检查',
    HTTP_ERROR: '服务器错误，稍后重试',
    NETWORK_ERROR: '网络连接失败，请检查网络',
    JSON_PARSE_ERROR: 'AI 输出格式异常，将尝试自动修复',
    API_ERROR: 'API 调用失败',
    RETRIES_EXHAUSTED: '重试次数已用完，请稍后重试',
    INVALID_SSE_FRAME: '流式响应格式异常',
    BACKOFF_OVERFLOW: '退避时间溢出',
    RATE_LIMIT: '请求频率过高，请稍后重试',
    TIMEOUT: '请求超时，请检查网络或稍后重试',
    PROVIDER_UNAVAILABLE: 'Provider 不可用，建议切换',
    DATABASE_ERROR: '数据库操作失败',
    VALIDATION_ERROR: '数据校验失败',
    UNKNOWN_ERROR: '未知错误',
  }
  return hints[code]
}

export function formatErrorForUser(err: StructuredError): string {
  let msg = `[${err.code}] ${err.hint}`

  // Windows env var setup hints (PRD Section 13.3)
  if (err.code === 'MISSING_CREDENTIALS' || err.code === 'INVALID_API_KEY') {
    if (navigator.platform.includes('Win')) {
      msg += '\n\nWindows 用户提示：\n• 设置环境变量：setx ANTHROPIC_API_KEY "your-key"\n• 或在项目根目录创建 .env 文件：ANTHROPIC_API_KEY=your-key'
    }
  }

  return msg
}
