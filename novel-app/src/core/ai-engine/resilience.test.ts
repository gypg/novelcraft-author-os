import { describe, it, expect } from 'vitest'
import { parseLlmError } from '@/core/ai-engine/resilience'

describe('parseLlmError', () => {
  it('识别 429 状态码为 RATE_LIMIT', () => {
    const result = parseLlmError('HTTP 429 Too Many Requests')
    expect(result.code).toBe('RATE_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 rate limit 关键词为 RATE_LIMIT', () => {
    const result = parseLlmError('rate limit exceeded')
    expect(result.code).toBe('RATE_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 Too Many Requests 关键词为 RATE_LIMIT', () => {
    const result = parseLlmError('Too Many Requests from this IP')
    expect(result.code).toBe('RATE_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 timeout 关键词为 TIMEOUT', () => {
    const result = parseLlmError('Request timeout after 30000ms')
    expect(result.code).toBe('TIMEOUT')
    expect(result.retryable).toBe(true)
  })

  it('识别 TIMEOUT 大写关键词为 TIMEOUT', () => {
    const result = parseLlmError('TIMEOUT ERROR')
    expect(result.code).toBe('TIMEOUT')
    expect(result.retryable).toBe(true)
  })

  it('识别 network 关键词为 NETWORK', () => {
    const result = parseLlmError('network error occurred')
    expect(result.code).toBe('NETWORK')
    expect(result.retryable).toBe(true)
  })

  it('识别 fetch 关键词为 NETWORK', () => {
    const result = parseLlmError('fetch failed')
    expect(result.code).toBe('NETWORK')
    expect(result.retryable).toBe(true)
  })

  it('识别 ECONNREFUSED 关键词为 NETWORK', () => {
    const result = parseLlmError('ECONNREFUSED 127.0.0.1:8080')
    expect(result.code).toBe('NETWORK')
    expect(result.retryable).toBe(true)
  })

  it('识别 401 状态码为 AUTH', () => {
    const result = parseLlmError('HTTP 401 Unauthorized')
    expect(result.code).toBe('AUTH')
    expect(result.retryable).toBe(false)
  })

  it('识别 403 状态码为 AUTH', () => {
    const result = parseLlmError('HTTP 403 Forbidden')
    expect(result.code).toBe('AUTH')
    expect(result.retryable).toBe(false)
  })

  it('识别 unauthorized 关键词为 AUTH', () => {
    const result = parseLlmError('unauthorized access')
    expect(result.code).toBe('AUTH')
    expect(result.retryable).toBe(false)
  })

  it('识别 invalid_api_key 关键词为 AUTH', () => {
    const result = parseLlmError('invalid_api_key provided')
    expect(result.code).toBe('AUTH')
    expect(result.retryable).toBe(false)
  })

  it('识别 500 状态码为 SERVER', () => {
    const result = parseLlmError('HTTP 500 Internal Server Error')
    expect(result.code).toBe('SERVER')
    expect(result.retryable).toBe(true)
  })

  it('识别 502 状态码为 SERVER', () => {
    const result = parseLlmError('HTTP 502 Bad Gateway')
    expect(result.code).toBe('SERVER')
    expect(result.retryable).toBe(true)
  })

  it('识别 503 状态码为 SERVER', () => {
    const result = parseLlmError('HTTP 503 Service Unavailable')
    expect(result.code).toBe('SERVER')
    expect(result.retryable).toBe(true)
  })

  it('识别 context exceed 关键词为 TOKEN_LIMIT', () => {
    const result = parseLlmError('context window exceed the maximum limit')
    expect(result.code).toBe('TOKEN_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 context length 关键词为 TOKEN_LIMIT', () => {
    const result = parseLlmError('context length exceeded')
    expect(result.code).toBe('TOKEN_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 context limit 关键词为 TOKEN_LIMIT', () => {
    const result = parseLlmError('context limit reached')
    expect(result.code).toBe('TOKEN_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('识别 token limit 关键词为 TOKEN_LIMIT', () => {
    const result = parseLlmError('token limit exceeded')
    expect(result.code).toBe('TOKEN_LIMIT')
    expect(result.retryable).toBe(true)
  })

  it('未知错误返回 UNKNOWN 且 retryable 为 true', () => {
    const result = parseLlmError('something went wrong')
    expect(result.code).toBe('UNKNOWN')
    expect(result.retryable).toBe(true)
  })

  it('保留原始错误信息到 message 字段', () => {
    const result = parseLlmError('HTTP 429 Too Many Requests')
    expect(result.message).toBe('HTTP 429 Too Many Requests')
  })

  it('接受 Error 对象并转为字符串', () => {
    const result = parseLlmError(new Error('timeout occurred'))
    expect(result.code).toBe('TIMEOUT')
    expect(result.retryable).toBe(true)
    expect(result.message).toContain('timeout occurred')
  })

  it('接受数字输入', () => {
    const result = parseLlmError(429)
    expect(result.message).toBe('429')
  })
})
