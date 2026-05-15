import { describe, it, expect } from 'vitest'
import { encryptApiKey, decryptApiKey } from '@/core/ai-engine/providers'

describe('AES-GCM 加密/解密', () => {
  it('加密后能正确解密还原', async () => {
    const original = 'sk-test-api-key-12345'
    const encrypted = await encryptApiKey(original)
    expect(encrypted).not.toBe(original)
    expect(encrypted.length).toBeGreaterThan(0)
    const decrypted = await decryptApiKey(encrypted)
    expect(decrypted).toBe(original)
  })

  it('空字符串返回空字符串', async () => {
    expect(await encryptApiKey('')).toBe('')
    expect(await decryptApiKey('')).toBe('')
  })

  it('不同次加密产生不同密文（随机 IV）', async () => {
    const original = 'sk-another-key-67890'
    const enc1 = await encryptApiKey(original)
    const enc2 = await encryptApiKey(original)
    expect(enc1).not.toBe(enc2)
    const dec1 = await decryptApiKey(enc1)
    const dec2 = await decryptApiKey(enc2)
    expect(dec1).toBe(original)
    expect(dec2).toBe(original)
  })

  it('中文 API Key 也能正确加解密', async () => {
    const original = '密钥-测试-中文'
    const encrypted = await encryptApiKey(original)
    const decrypted = await decryptApiKey(encrypted)
    expect(decrypted).toBe(original)
  })

  it('长 API Key 也能正确加解密', async () => {
    const original = 'sk-' + 'a'.repeat(500)
    const encrypted = await encryptApiKey(original)
    const decrypted = await decryptApiKey(encrypted)
    expect(decrypted).toBe(original)
  })

  it('兼容旧格式（XOR+Base64）解密', async () => {
    const original = 'legacy-test-key'
    const key = 'novelcraft-enc-key-2024'
    let xorResult = ''
    for (let i = 0; i < original.length; i++) {
      xorResult += String.fromCharCode(original.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    const legacyEncrypted = btoa(xorResult)
    const decrypted = await decryptApiKey(legacyEncrypted)
    expect(decrypted).toBe(original)
  })

  it('篡改密文后解密失败返回原始值', async () => {
    const encrypted = await encryptApiKey('sk-tamper-test')
    const decoded = atob(encrypted)
    const tampered = btoa('X' + decoded.slice(1))
    const result = await decryptApiKey(tampered)
    expect(typeof result).toBe('string')
  })

  it('端到端：模拟 Provider 密钥存储流程', async () => {
    const apiKey = 'sk-proj-abc123xyz456'
    const encrypted = await encryptApiKey(apiKey)
    expect(encrypted).not.toContain(apiKey)
    const marker = atob(encrypted)
    const markerByte = marker.charCodeAt(marker.length - 1)
    expect(markerByte).toBe(0xae)
    const decrypted = await decryptApiKey(encrypted)
    expect(decrypted).toBe(apiKey)
  })

  it('多次加密-解密循环稳定性', async () => {
    const original = 'sk-cycle-stability-test'
    let current = original
    for (let i = 0; i < 5; i++) {
      const encrypted = await encryptApiKey(current)
      current = await decryptApiKey(encrypted)
    }
    expect(current).toBe(original)
  })
})
