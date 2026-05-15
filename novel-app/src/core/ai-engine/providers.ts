import { isTauri } from '@/shared/utils/tauri-env'
import { generateId } from '@/core/db/repository'
import { getModelLabel, buildModelsUrlCandidates, getPresetByType, type ProviderType, type ApiFormat } from './provider-presets'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

type UnlistenFn = () => void

async function getListen() {
  if (!isTauri()) return null
  try {
    const mod = await import('@tauri-apps/api/event')
    return mod.listen
  } catch {
    return null
  }
}

// ==================== API Key Encryption (AES-GCM via Web Crypto API) ====================

const PASSPHRASE = 'novelcraft-aesgcm-2026'
const SALT = new TextEncoder().encode('novelcraft-salt-v1')
const KEY_LENGTH = 256
const IV_LENGTH = 12

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PASSPHRASE),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

function xorLegacy(text: string, key: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

function isLegacyFormat(encrypted: string): boolean {
  try {
    const decoded = atob(encrypted)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
    if (bytes.length < IV_LENGTH + 1) return true
    const marker = bytes[bytes.length - 1]
    return marker !== 0xae
  } catch {
    return true
  }
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  try {
    const key = await deriveKey()
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const encoded = new TextEncoder().encode(plaintext)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const marker = new Uint8Array([0xae])
    const combined = new Uint8Array(iv.length + ciphertext.byteLength + marker.length)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)
    combined.set(marker, iv.length + ciphertext.byteLength)
    return btoa(String.fromCharCode(...combined))
  } catch {
    return plaintext
  }
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  if (!encrypted) return ''
  if (isLegacyFormat(encrypted)) {
    try {
      return xorLegacy(atob(encrypted), 'novelcraft-enc-key-2024')
    } catch {
      return encrypted
    }
  }
  try {
    const key = await deriveKey()
    const decoded = atob(encrypted)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
    const iv = bytes.slice(0, IV_LENGTH)
    const ciphertext = bytes.slice(IV_LENGTH, bytes.length - 1)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    try {
      return xorLegacy(atob(encrypted), 'novelcraft-enc-key-2024')
    } catch {
      return encrypted
    }
  }
}

// ==================== Types ====================

export interface LlmProviderRow {
  id: string
  name: string
  provider_type: ProviderType
  /** 协议格式：'openai' | 'anthropic' | 'gemini'，决定 Rust 后端如何调用。可选以兼容旧数据。 */
  api_format?: string | null
  base_url: string
  api_key: string
  models: string       // JSON array
  default_model: string | null
  created_at: number
}

export interface CreateProviderInput {
  name: string
  provider_type: ProviderType
  /** 可选：传入时直接生效；缺失时 Rust 会根据 provider_type 兜底（多数走 openai 兼容） */
  api_format?: ApiFormat
  base_url: string
  api_key: string
  models: string[]
  default_model?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmStreamChunk {
  delta: string
  finish_reason: string | null
}

// ==================== Browser-mode localStorage fallback ====================

const STORAGE_KEY = 'novelcraft_providers'

function loadBrowserProviders(): LlmProviderRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBrowserProviders(rows: LlmProviderRow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

function safeModelsStr(models: string[] | string): string {
  if (Array.isArray(models)) return JSON.stringify(models)
  if (typeof models === 'string') return models
  return '[]'
}

// 从 preset 推断 apiFormat。显式传入优先；preset 命中次之；最后兜底 'openai'
function resolveApiFormat(providerType: string, explicit?: string | null): ApiFormat {
  if (explicit === 'openai' || explicit === 'anthropic' || explicit === 'gemini') return explicit
  const preset = getPresetByType(providerType)
  return (preset?.apiFormat ?? 'openai') as ApiFormat
}

// ==================== Provider CRUD ====================

export async function createProvider(input: CreateProviderInput): Promise<LlmProviderRow> {
  const inv = await getInvoke()
  const api_format = resolveApiFormat(input.provider_type, input.api_format)
  const row: LlmProviderRow = {
    id: generateId(),
    name: input.name,
    provider_type: input.provider_type,
    api_format,
    base_url: input.base_url,
    api_key: input.api_key,
    models: safeModelsStr(input.models),
    default_model: input.default_model || null,
    created_at: Date.now(),
  }
  if (!inv) {
    // 浏览器模式：保留 AES-GCM 加密落 localStorage
    const rows = loadBrowserProviders()
    const encryptedKey = await encryptApiKey(input.api_key)
    rows.unshift({ ...row, api_key: encryptedKey })
    saveBrowserProviders(rows)
    return row
  }
  // Tauri 模式：明文经 IPC 传给 Rust，Rust 负责写 keychain；不再前端加密。
  return inv<LlmProviderRow>('create_llm_provider', {
    input: { id: row.id, ...input, api_format },
  })
}

export async function listProviders(): Promise<LlmProviderRow[]> {
  const inv = await getInvoke()
  if (!inv) {
    // 浏览器模式：localStorage 中是 AES-GCM 加密的值
    const rows = loadBrowserProviders()
    return Promise.all(rows.map(async (row) => ({
      ...row,
      api_key: await decryptApiKey(row.api_key),
    })))
  }
  // Tauri 模式：Rust list_llm_providers 已把哨兵替换为 plaintext。
  // 兼容老数据：DB 中可能仍存在 AES-GCM 加密的 Base64（早于 keychain 改造的版本写入），尝试解密。
  const rows = await inv<LlmProviderRow[]>('list_llm_providers')
  return Promise.all(rows.map(async (row) => {
    const looksLikeLegacyAesGcm = !!row.api_key && row.api_key.length > 32 && /^[A-Za-z0-9+/=]+$/.test(row.api_key)
    if (looksLikeLegacyAesGcm) {
      const decrypted = await decryptApiKey(row.api_key)
      return { ...row, api_key: decrypted }
    }
    return row
  }))
}

export async function deleteProvider(id: string): Promise<void> {
  const inv = await getInvoke()
  if (!inv) {
    const rows = loadBrowserProviders().filter((r) => r.id !== id)
    saveBrowserProviders(rows)
    return
  }
  // Rust delete_llm_provider 内部已经同步删除 keychain 凭据
  return inv<void>('delete_llm_provider', { id })
}

export interface UpdateProviderInput {
  name?: string
  provider_type?: string
  api_format?: string
  base_url?: string
  api_key?: string
  models?: string[]
  default_model?: string
}

export async function updateProvider(id: string, input: UpdateProviderInput): Promise<LlmProviderRow> {
  const inv = await getInvoke()
  // 切换 provider_type 时，自动重新解析 api_format（除非用户显式传了）
  const inputWithFormat: UpdateProviderInput = input.provider_type && !input.api_format
    ? { ...input, api_format: resolveApiFormat(input.provider_type) }
    : input
  if (!inv) {
    const rows = loadBrowserProviders()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx >= 0) {
      const existing = rows[idx]
      const newKey = inputWithFormat.api_key !== undefined
        ? await encryptApiKey(inputWithFormat.api_key)
        : existing.api_key
      rows[idx] = {
        ...existing,
        name: inputWithFormat.name ?? existing.name,
        provider_type: (inputWithFormat.provider_type ?? existing.provider_type) as ProviderType,
        api_format: inputWithFormat.api_format ?? existing.api_format,
        base_url: inputWithFormat.base_url ?? existing.base_url,
        api_key: newKey,
        models: inputWithFormat.models ? safeModelsStr(inputWithFormat.models) : existing.models,
        default_model: inputWithFormat.default_model ?? existing.default_model,
      }
      saveBrowserProviders(rows)
      // 返回给调用方时解密
      return { ...rows[idx], api_key: await decryptApiKey(rows[idx].api_key) }
    }
    return { id, name: '', provider_type: 'custom', base_url: '', api_key: '', models: '[]', default_model: null, created_at: 0 }
  }
  // Tauri 模式：明文经 IPC 传给 Rust（Rust 自行写 keychain）
  const row = await inv<LlmProviderRow>('update_llm_provider', { id, input: inputWithFormat })
  // Rust 返回时哨兵已替换；若值是空（keychain 失败），让前端按需引导用户重设
  return row
}

export async function testProvider(input: CreateProviderInput): Promise<string | { ok: false; msg: string }> {
  const inv = await getInvoke()
  if (!inv) {
    try {
      const candidates = buildModelsUrlCandidates(input.base_url, getPresetByType(input.provider_type)?.modelsUrl)
      if (candidates.length === 0) return { ok: false, msg: '无法构建测试端点' }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (input.api_key) headers['Authorization'] = `Bearer ${input.api_key}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const resp = await fetch(candidates[0], { method: 'GET', headers, signal: controller.signal })
      clearTimeout(timeout)
      if (resp.ok) return `连接成功 (HTTP ${resp.status})`
      return { ok: false, msg: `HTTP ${resp.status}` }
    } catch (err) {
      return { ok: false, msg: String(err) }
    }
  }
  return inv<string>('test_llm_provider', { input: { id: 'test', ...input, api_format: resolveApiFormat(input.provider_type, input.api_format) } })
}

export interface ModelInfo {
  id: string
  owned_by: string | null
}

interface OpenAIModelsResponse {
  data?: Array<{ id: string; owned_by?: string | null }>
}

async function fetchModelsViaHttp(urlCandidates: string[], apiKey: string): Promise<ModelInfo[]> {
  let lastErr = ''

  for (const url of urlCandidates) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const resp = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (resp.status === 404 || resp.status === 405) {
        lastErr = `HTTP ${resp.status}`
        continue
      }

      if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status}: ${body.slice(0, 200)}`)
      }

      const json: OpenAIModelsResponse = await resp.json()
      const models: ModelInfo[] = (json.data || [])
        .map((m) => ({ id: m.id, owned_by: m.owned_by ?? null }))
        .sort((a, b) => a.id.localeCompare(b.id))
      return models
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastErr = '请求超时'
        continue
      }
      lastErr = String(err)
    }
  }

  throw new Error(lastErr || '所有候选端点均失败')
}

export async function fetchModels(baseUrl: string, apiKey: string, providerType: string): Promise<ModelInfo[]> {
  const inv = await getInvoke()
  const api_format = resolveApiFormat(providerType)
  if (inv) {
    try {
      const result = await inv<ModelInfo[]>('fetch_models', { input: { base_url: baseUrl, api_key: apiKey, provider_type: providerType, api_format } })
      if (result && result.length > 0) return result
    } catch {
      // fall through to HTTP
    }
  }
  const preset = getPresetByType(providerType)
  const candidates = buildModelsUrlCandidates(baseUrl, preset?.modelsUrl)
  return fetchModelsViaHttp(candidates, apiKey)
}

// ==================== LLM Call ====================

export interface CallLlmOptions {
  providerId: string
  model?: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  onDelta?: (delta: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: string) => void
}

export async function callLlm(options: CallLlmOptions): Promise<string> {
  const inv = await getInvoke()
  if (!inv) throw new Error('Tauri not available')

  const { providerId, model, messages, maxTokens, temperature, onDelta, onComplete, onError } = options

  let unlisten: UnlistenFn | null = null

  if (onDelta) {
    const listenFn = await getListen()
    if (listenFn) {
      unlisten = await listenFn<LlmStreamChunk>('llm-stream-chunk', (event) => {
        const { delta, finish_reason } = event.payload
        if (delta) onDelta(delta)
        if (finish_reason === 'stop' && unlisten) {
          unlisten()
        }
      })
    }
  }

  try {
    const fullText = await inv<string>('call_llm', {
      input: {
        provider_id: providerId,
        model: model || null,
        messages,
        max_tokens: maxTokens || 2000,
        temperature: temperature ?? 0.7,
      },
    })
    onComplete?.(fullText)
    return fullText
  } catch (err) {
    const msg = typeof err === 'string' ? err : String(err)
    onError?.(msg)
    throw err
  } finally {
    unlisten?.()
  }
}

// ==================== Provider Presets ====================

export { getModelLabel }
export type { ProviderType }
