import { useState, useRef, useEffect, useCallback } from 'react'
import { useAICollabStore } from './store'
import { useBookshelfStore, useEditorStore } from '@/modules'
import { coordinator } from '@/core/ai-engine/coordinator'
import { listProviders, type LlmProviderRow } from '@/core/ai-engine'
import { useLocation } from 'react-router-dom'
import { logger } from '@/shared/utils/logger'
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer'
import { saveChatMessage, listChatMessages } from '@/core/db/chat-repository'
import { useNetworkGuard } from '@/shared/hooks/use-network-status'
import {
  Send,
  Trash2,
  Bot,
  User,
  Zap,
  GitBranch,
  ChevronRight,
  Loader2,
  BrainCircuit,
  ChevronDown,
  WifiOff,
} from 'lucide-react'

const MODE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  single: { label: '单 Agent', color: 'var(--color-success)', bg: 'var(--color-success-dim)' },
  multi: { label: '多 Agent', color: 'var(--color-info)', bg: 'var(--color-info-dim)' },
  swarm: { label: '蚁 群', color: 'var(--color-purple)', bg: 'var(--color-purple-dim)' },
}

function WorkflowGraph({ mode }: { mode: string }) {
  const nodes = mode === 'single'
    ? [{ id: 'writer', label: 'Writer', type: 'agent' as const }]
    : mode === 'multi'
      ? [
          { id: 'planner', label: 'Planner', type: 'agent' as const },
          { id: 'writer', label: 'Writer', type: 'agent' as const },
          { id: 'auditor', label: 'Auditor', type: 'agent' as const },
          { id: 'reviser', label: 'Reviser', type: 'agent' as const },
        ]
      : [
          { id: 'router', label: 'Router', type: 'logic' as const },
          { id: 'w1', label: 'Worker-1', type: 'agent' as const },
          { id: 'w2', label: 'Worker-2', type: 'agent' as const },
          { id: 'synth', label: 'Synthesizer', type: 'final' as const },
        ]

  const NODE_COLORS: Record<string, string> = {
    agent: 'var(--color-brand)',
    logic: 'var(--color-purple)',
    final: 'var(--color-success)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--app-text-muted)',
        }}
      >
        <GitBranch size={12} />
        工作流
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: mode === 'swarm' ? 'row' : 'column',
          gap: mode === 'swarm' ? '24px' : '8px',
          alignItems: 'flex-start',
          flexWrap: mode === 'swarm' ? 'wrap' : undefined,
        }}
      >
        {nodes.map((node) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--app-radius-lg)',
                background: 'var(--app-surface)',
                border: `2px solid ${NODE_COLORS[node.type]}`,
                fontSize: '11px',
                fontWeight: 700,
                color: NODE_COLORS[node.type],
                boxShadow: 'var(--app-shadow-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              {node.label}
            </div>
            {node.id !== nodes[nodes.length - 1].id && mode !== 'swarm' && (
              <ChevronRight size={12} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
            )}
            {mode === 'swarm' && node.id === 'router' && (
              <ChevronRight size={12} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '10px',
          borderRadius: 'var(--app-radius-md)',
          background: 'var(--app-surface-subtle)',
          border: '1px solid var(--app-border)',
          fontSize: '11px',
          color: 'var(--app-text-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--app-text-primary)' }}>快捷命令：</strong>
        <br />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>/write</code> 续写章节
        <br />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>/review</code> 审稿
        <br />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>/audit</code> 审计
      </div>
    </div>
  )
}

function ProviderSelector() {
  const { selectedProviderId, selectedModel, setSelectedProvider } = useAICollabStore()
  const [providers, setProviders] = useState<LlmProviderRow[]>([])

  useEffect(() => {
    listProviders().then(setProviders).catch(() => {})
  }, [])

  const selected = providers.find((p) => p.id === selectedProviderId)
  const models: string[] = selected ? JSON.parse(selected.models || '[]') : []

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--app-radius-lg)',
    border: '1px solid var(--app-border)',
    background: 'var(--app-input-bg)',
    color: 'var(--app-text-primary)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    appearance: 'none',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  }

  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={10} />
        模型配置
      </div>

      <div style={{ position: 'relative' }}>
        <select
          value={selectedProviderId || ''}
          onChange={(e) => {
            const id = e.target.value || null
            const p = providers.find((x) => x.id === id)
            const firstModel = p ? (JSON.parse(p.models || '[]') as string[])[0] || null : null
            setSelectedProvider(id, firstModel)
          }}
          style={selectStyle}
        >
          <option value="">选择 Provider...</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--app-text-muted)', pointerEvents: 'none' }} />
      </div>

      {selected && models.length > 0 && (
        <div style={{ position: 'relative' }}>
          <select
            value={selectedModel || ''}
            onChange={(e) => {
              setSelectedProvider(selectedProviderId, e.target.value || null)
            }}
            style={selectStyle}
          >
            <option value="">选择模型...</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--app-text-muted)', pointerEvents: 'none' }} />
        </div>
      )}

      {providers.length === 0 && (
        <div style={{ fontSize: '11px', color: 'var(--color-danger)', padding: '8px 12px', borderRadius: 'var(--app-radius-md)', background: 'var(--color-danger-light)' }}>
          未配置 Provider，请前往设置页面添加
        </div>
      )}
    </div>
  )
}

export function AICollabPage() {
  const { messages, isStreaming, currentStage, addMessage, setStreaming, setCurrentStage, clearMessages, selectedProviderId, selectedModel } = useAICollabStore()
  const { selectedBookId } = useBookshelfStore()
  const { currentChapterId } = useEditorStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const state = location.state as { bookId?: string } | null
  const { mode, setMode, swarmSubMode, setSwarmSubMode } = useAICollabStore()
  const { online, guardedFetch } = useNetworkGuard()

  const bookId = state?.bookId || selectedBookId
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG.single

  useEffect(() => {
    if (!bookId) return
    listChatMessages(bookId, currentChapterId || undefined, 100)
      .then((rows) => {
        if (rows.length > 0) {
          const state = useAICollabStore.getState()
          if (state.messages.length === 0) {
            rows.forEach((row) => {
              state.addMessage({ id: row.id, role: row.role as 'user' | 'assistant' | 'system', content: row.content, timestamp: new Date(row.created_at) })
            })
          }
        }
      })
      .catch(() => {})
  }, [bookId, currentChapterId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const persistMessage = useCallback((role: string, content: string) => {
    if (bookId) saveChatMessage(bookId, currentChapterId || null, role, content).catch((e) => logger.error('ai-collab', `DB save failed: ${e}`))
  }, [bookId, currentChapterId])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !bookId || !currentChapterId) return
    addMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() })
    persistMessage('user', text)
    setInput('')
    setStreaming(true)
    setCurrentStage('处理中...')

    const result = await guardedFetch(async () => {
      return coordinator.handleInput(text, {
        bookId, chapterId: currentChapterId, chapterContent: '',
        providerId: selectedProviderId ?? undefined,
        model: selectedModel ?? undefined,
        onDelta: (delta) => {
          const msgs = useAICollabStore.getState().messages
          const lastMsg = msgs[msgs.length - 1]
          if (lastMsg && lastMsg.role === 'assistant') {
            addMessage({ ...lastMsg, content: lastMsg.content + delta, timestamp: new Date() })
          }
        },
      })
    })

    if (result === null) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '⚠️ 网络不可用，请检查网络连接后重试', timestamp: new Date() })
      setStreaming(false)
      setCurrentStage(null)
      return
    }

    try {
      if (result.type === 'text') {
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: result.content, timestamp: new Date() })
        persistMessage('assistant', result.content)
      } else if (result.type === 'pipeline-started') {
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `🤖 ${result.content}`, timestamp: new Date(), metadata: { stage: result.content } })
      } else {
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `⚠️ ${result.content}`, timestamp: new Date() })
      }
    } catch (err) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `❌ 错误: ${String(err)}`, timestamp: new Date() })
      logger.error('ai-collab', `Coordinator error: ${err}`)
    } finally {
      setStreaming(false)
      setCurrentStage(null)
    }
  }, [input, bookId, currentChapterId, addMessage, setStreaming, setCurrentStage, persistMessage, selectedProviderId, selectedModel, guardedFetch])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: '220px',
          flexShrink: 0,
          background: 'var(--app-surface)',
          borderRight: '1px solid var(--app-border)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--app-divider)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: modeConfig.bg,
              border: `1px solid ${modeConfig.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: modeConfig.color,
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={16} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              AI 协作
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: modeConfig.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {modeConfig.label} 模式
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--app-divider)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BrainCircuit size={10} />
            协作模式
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(['single', 'multi', 'swarm'] as const).map((m) => {
              const cfg = MODE_CONFIG[m]
              const isActive = mode === m
              return (
                <button
                  key={m}
                  onClick={() => {
                    console.log('[DEBUG] Mode button clicked:', m, 'Current mode:', mode)
                    setMode(m)
                    console.log('[DEBUG] setMode called')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--app-radius-lg)',
                    border: isActive ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                    background: isActive ? cfg.bg : 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? cfg.color : 'var(--app-text-muted)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isActive ? cfg.color : 'var(--app-border)',
                      flexShrink: 0,
                    }}
                  />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {mode === 'swarm' && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-text-muted)', marginBottom: '4px' }}>
                蚁群子模式
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(['router', 'supervisor', 'peer', 'planner-executor', 'emergent'] as const).map((sm) => (
                  <button
                    key={sm}
                    onClick={() => setSwarmSubMode(sm)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--app-radius-full)',
                      border: swarmSubMode === sm ? '1px solid var(--color-purple)' : '1px solid var(--app-border)',
                      background: swarmSubMode === sm ? 'var(--color-purple-dim)' : 'transparent',
                      color: swarmSubMode === sm ? 'var(--color-purple)' : 'var(--app-text-muted)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sm === 'router' ? '路由' : sm === 'supervisor' ? '监督' : sm === 'peer' ? '对等' : sm === 'planner-executor' ? '规划执行' : '涌现'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <WorkflowGraph mode={mode} />
        <ProviderSelector />

        {isStreaming && currentStage && (
          <div
            style={{
              margin: '0 16px 16px',
              padding: '10px 12px',
              borderRadius: 'var(--app-radius-lg)',
              background: 'var(--color-brand-light)',
              border: '1px solid var(--color-brand-border)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <span>{currentStage}</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'var(--color-brand-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
                }}
              >
                <Bot size={30} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '4px' }}>
                  AI 协作助手
                </div>
                <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                  {bookId
                    ? '输入消息或使用 /write /review /audit 命令'
                    : <span style={{ color: 'var(--color-danger)' }}>请先选择一本书</span>}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--app-text-muted)',
                    paddingLeft: msg.role === 'user' ? '0' : '4px',
                    paddingRight: msg.role === 'user' ? '4px' : '0',
                  }}
                >
                  {msg.role === 'assistant' ? <Bot size={12} /> : null}
                  {msg.role === 'user' ? <User size={12} /> : null}
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {msg.role === 'user' ? '你' : 'AI'}
                  </span>
                </div>

                <div
                  className={`message-bubble ${msg.role}`}
                  style={{ maxWidth: '80%' }}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  )}
                </div>
              </div>
            ))
          )}

          {isStreaming && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--app-text-muted)', paddingLeft: '4px' }}>
                <Bot size={12} />
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>AI</span>
              </div>
              <div className="message-bubble assistant">
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--app-border)',
            background: 'var(--app-surface)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
          }}
        >
          {!online && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-danger-light)', fontSize: '11px', fontWeight: 600, color: 'var(--color-danger)', flexShrink: 0 }}>
              <WifiOff size={11} />
              离线
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={bookId ? '输入消息或命令...' : '请先选择一本书'}
            disabled={!bookId || isStreaming}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--app-radius-xl)',
              border: '1px solid var(--app-border)',
              background: 'var(--app-input-bg)',
              color: 'var(--app-text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--app-border)' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !bookId || isStreaming}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: input.trim() && bookId ? 'var(--color-brand)' : 'var(--app-surface-subtle)',
              color: input.trim() && bookId ? '#fff' : 'var(--app-text-muted)',
              border: 'none',
              cursor: input.trim() && bookId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              boxShadow: input.trim() && bookId ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            <Send size={16} />
          </button>
        </div>

        {messages.length > 0 && (
          <div style={{ padding: '6px 20px 10px', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={clearMessages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--app-radius-full)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--app-text-muted)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--app-text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={11} />
              清空对话
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
