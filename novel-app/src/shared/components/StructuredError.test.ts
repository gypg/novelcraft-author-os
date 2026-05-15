import { describe, it, expect, vi } from 'vitest'
import {
  parseToStructuredError,
  createStructuredError,
  formatErrorForUser,
  type StructuredError,
  type ErrorCode,
} from '@/shared/components/StructuredError'

describe('parseToStructuredError', () => {
  it('识别 429 为 RATE_LIMIT', () => {
    const result = parseToStructuredError('HTTP 429 Too Many Requests')
    expect(result.code).toBe('RATE_LIMIT')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('api')
    expect(result.type).toBe('error')
  })

  it('识别 rate limit 关键词为 RATE_LIMIT', () => {
    const result = parseToStructuredError('rate limit exceeded')
    expect(result.code).toBe('RATE_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 timeout 为 TIMEOUT', () => {
    const result = parseToStructuredError('Request timeout after 30000ms')
    expect(result.code).toBe('TIMEOUT')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('api')
  })

  it('识别 TIMEOUT 大写为 TIMEOUT', () => {
    const result = parseToStructuredError('TIMEOUT ERROR')
    expect(result.code).toBe('TIMEOUT')
    expect(result.retryable).toBe(true)
  })

  it('识别 network 为 NETWORK_ERROR', () => {
    const result = parseToStructuredError('network error')
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('api')
  })

  it('识别 fetch 为 NETWORK_ERROR', () => {
    const result = parseToStructuredError('fetch failed')
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.retryable).toBe(true)
  })

  it('识别 ECONNREFUSED 为 NETWORK_ERROR', () => {
    const result = parseToStructuredError('ECONNREFUSED')
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.retryable).toBe(true)
  })

  it('识别 401 为 AUTH_ERROR', () => {
    const result = parseToStructuredError('HTTP 401 Unauthorized')
    expect(result.code).toBe('AUTH_ERROR')
    expect(result.retryable).toBe(false)
    expect(result.kind).toBe('api')
    expect(result.hint).toBe('请检查 API Key 是否正确')
  })

  it('识别 403 为 AUTH_ERROR', () => {
    const result = parseToStructuredError('HTTP 403 Forbidden')
    expect(result.code).toBe('AUTH_ERROR')
    expect(result.retryable).toBe(false)
    expect(result.hint).toBe('请检查 API Key 是否正确')
  })

  it('识别 unauthorized 为 AUTH_ERROR', () => {
    const result = parseToStructuredError('unauthorized access')
    expect(result.code).toBe('AUTH_ERROR')
    expect(result.retryable).toBe(false)
  })

  it('识别 context exceed 为 CONTEXT_WINDOW_EXCEEDED', () => {
    const result = parseToStructuredError('context window exceed the maximum')
    expect(result.code).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('safe-fail')
    expect(result.hint).toBe('上下文超出限制，系统将自动压缩后重试')
  })

  it('识别 token limit 为 CONTEXT_WINDOW_EXCEEDED', () => {
    const result = parseToStructuredError('token limit exceeded')
    expect(result.code).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(result.retryable).toBe(true)
    expect(result.hint).toBe('Token 超限，系统将自动压缩后重试')
  })

  it('识别 500 为 HTTP_ERROR', () => {
    const result = parseToStructuredError('HTTP 500 Internal Server Error')
    expect(result.code).toBe('HTTP_ERROR')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('api')
  })

  it('识别 502 为 HTTP_ERROR', () => {
    const result = parseToStructuredError('HTTP 502 Bad Gateway')
    expect(result.code).toBe('HTTP_ERROR')
    expect(result.retryable).toBe(true)
  })

  it('识别 503 为 HTTP_ERROR', () => {
    const result = parseToStructuredError('HTTP 503 Service Unavailable')
    expect(result.code).toBe('HTTP_ERROR')
    expect(result.retryable).toBe(true)
  })

  it('识别 JSON parse 为 JSON_PARSE_ERROR', () => {
    const result = parseToStructuredError('Unexpected token in JSON at position 0')
    expect(result.code).toBe('JSON_PARSE_ERROR')
    expect(result.retryable).toBe(true)
    expect(result.kind).toBe('cli')
    expect(result.hint).toBe('AI 输出格式异常，将尝试自动修复')
  })

  it('识别 parse 关键词为 JSON_PARSE_ERROR', () => {
    const result = parseToStructuredError('Failed to parse response body')
    expect(result.code).toBe('JSON_PARSE_ERROR')
    expect(result.retryable).toBe(true)
  })

  it('未知错误返回 UNKNOWN_ERROR', () => {
    const result = parseToStructuredError('something completely unexpected')
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.kind).toBe('cli')
    expect(result.hint).toBe('未知错误')
  })

  it('保留原始错误信息到 error 字段', () => {
    const result = parseToStructuredError('HTTP 429 rate limit')
    expect(result.error).toBe('HTTP 429 rate limit')
  })

  it('接受 Error 对象', () => {
    const result = parseToStructuredError(new Error('timeout occurred'))
    expect(result.code).toBe('TIMEOUT')
    expect(result.error).toContain('timeout occurred')
  })

  it('返回的 type 字段始终为 error', () => {
    const cases = ['429', 'timeout', 'network', '401', '500', 'unknown']
    for (const msg of cases) {
      expect(parseToStructuredError(msg).type).toBe('error')
    }
  })
})

describe('createStructuredError', () => {
  it('创建基本错误结构', () => {
    const result = createStructuredError('API_ERROR', 'Something failed')
    expect(result.type).toBe('error')
    expect(result.code).toBe('API_ERROR')
    expect(result.error).toBe('Something failed')
    expect(result.kind).toBe('api')
    expect(result.retryable).toBe(false)
    expect(result.hint).toBe('API 调用失败')
  })

  it('使用自定义 hint', () => {
    const result = createStructuredError('RATE_LIMIT', 'Too many requests', {
      hint: '自定义提示',
    })
    expect(result.hint).toBe('自定义提示')
  })

  it('使用自定义 retryable', () => {
    const result = createStructuredError('RATE_LIMIT', 'Too many requests', {
      retryable: false,
    })
    expect(result.retryable).toBe(false)
  })

  it('使用自定义 details', () => {
    const result = createStructuredError('HTTP_ERROR', 'Server error', {
      details: { statusCode: 500, path: '/api/chat' },
    })
    expect(result.details).toEqual({ statusCode: 500, path: '/api/chat' })
  })

  it('不传 options 时使用默认值', () => {
    const result = createStructuredError('TIMEOUT', 'Request timed out')
    expect(result.hint).toBe('请求超时，请检查网络或稍后重试')
    expect(result.retryable).toBe(true)
    expect(result.details).toBeUndefined()
  })

  it('CONTEXT_WINDOW_EXCEEDED 分类为 safe-fail', () => {
    const result = createStructuredError('CONTEXT_WINDOW_EXCEEDED', 'Too long')
    expect(result.kind).toBe('safe-fail')
  })

  it('DATABASE_ERROR 分类为 safe-fail', () => {
    const result = createStructuredError('DATABASE_ERROR', 'DB down')
    expect(result.kind).toBe('safe-fail')
  })

  it('VALIDATION_ERROR 分类为 safe-fail', () => {
    const result = createStructuredError('VALIDATION_ERROR', 'Invalid data')
    expect(result.kind).toBe('safe-fail')
  })

  it('UNKNOWN_ERROR 分类为 cli', () => {
    const result = createStructuredError('UNKNOWN_ERROR', '???')
    expect(result.kind).toBe('cli')
  })

  it('EXPIRED_TOKEN 分类为 cli', () => {
    const result = createStructuredError('EXPIRED_TOKEN', 'Token expired')
    expect(result.kind).toBe('cli')
  })

  it('可重试的错误码默认 retryable 为 true', () => {
    const retryableCodes: ErrorCode[] = [
      'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR',
      'JSON_PARSE_ERROR', 'CONTEXT_WINDOW_EXCEEDED',
    ]
    for (const code of retryableCodes) {
      const result = createStructuredError(code, 'test')
      expect(result.retryable).toBe(true)
    }
  })

  it('不可重试的错误码默认 retryable 为 false', () => {
    const nonRetryableCodes: ErrorCode[] = [
      'MISSING_CREDENTIALS', 'AUTH_ERROR', 'INVALID_API_KEY',
      'EXPIRED_TOKEN', 'API_ERROR', 'RETRIES_EXHAUSTED',
    ]
    for (const code of nonRetryableCodes) {
      const result = createStructuredError(code, 'test')
      expect(result.retryable).toBe(false)
    }
  })
})

describe('formatErrorForUser', () => {
  it('格式化为 [CODE] hint 格式', () => {
    const err: StructuredError = {
      type: 'error',
      code: 'RATE_LIMIT',
      error: 'Too many requests',
      kind: 'api',
      hint: '请求频率过高，请稍后重试',
      retryable: true,
    }
    const result = formatErrorForUser(err)
    expect(result).toBe('[RATE_LIMIT] 请求频率过高，请稍后重试')
  })

  it('格式化 TIMEOUT 错误', () => {
    const err: StructuredError = {
      type: 'error',
      code: 'TIMEOUT',
      error: 'Request timed out',
      kind: 'api',
      hint: '请求超时，请检查网络或稍后重试',
      retryable: true,
    }
    const result = formatErrorForUser(err)
    expect(result).toBe('[TIMEOUT] 请求超时，请检查网络或稍后重试')
  })

  it('格式化 UNKNOWN_ERROR 错误', () => {
    const err: StructuredError = {
      type: 'error',
      code: 'UNKNOWN_ERROR',
      error: '???',
      kind: 'cli',
      hint: '未知错误',
      retryable: false,
    }
    const result = formatErrorForUser(err)
    expect(result).toBe('[UNKNOWN_ERROR] 未知错误')
  })

  it('MISSING_CREDENTIALS 在 Windows 上追加环境变量提示', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' })
    const err: StructuredError = {
      type: 'error',
      code: 'MISSING_CREDENTIALS',
      error: 'No API key',
      kind: 'api',
      hint: '请在设置中配置 API Key',
      retryable: false,
    }
    const result = formatErrorForUser(err)
    expect(result).toContain('[MISSING_CREDENTIALS]')
    expect(result).toContain('Windows')
    expect(result).toContain('setx')
    vi.unstubAllGlobals()
  })

  it('INVALID_API_KEY 在 Windows 上追加环境变量提示', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' })
    const err: StructuredError = {
      type: 'error',
      code: 'INVALID_API_KEY',
      error: 'Bad key',
      kind: 'api',
      hint: 'API Key 无效，请在设置中检查',
      retryable: false,
    }
    const result = formatErrorForUser(err)
    expect(result).toContain('.env')
    vi.unstubAllGlobals()
  })

  it('MISSING_CREDENTIALS 在非 Windows 上不追加提示', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    const err: StructuredError = {
      type: 'error',
      code: 'MISSING_CREDENTIALS',
      error: 'No API key',
      kind: 'api',
      hint: '请在设置中配置 API Key',
      retryable: false,
    }
    const result = formatErrorForUser(err)
    expect(result).toBe('[MISSING_CREDENTIALS] 请在设置中配置 API Key')
    vi.unstubAllGlobals()
  })

  it('非凭据类错误不追加 Windows 提示', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' })
    const err: StructuredError = {
      type: 'error',
      code: 'NETWORK_ERROR',
      error: 'fetch failed',
      kind: 'api',
      hint: '网络连接失败，请检查网络',
      retryable: true,
    }
    const result = formatErrorForUser(err)
    expect(result).toBe('[NETWORK_ERROR] 网络连接失败，请检查网络')
    vi.unstubAllGlobals()
  })
})
