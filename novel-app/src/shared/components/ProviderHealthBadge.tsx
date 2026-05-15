import { useState, useEffect } from 'react'
import { testProvider, type CreateProviderInput } from '@/core/ai-engine'

interface ProviderHealthBadgeProps {
  provider: CreateProviderInput
}

export function ProviderHealthBadge({ provider }: ProviderHealthBadgeProps) {
  const [status, setStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown')
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const start = Date.now()
      try {
        const result = await testProvider(provider)
        if (cancelled) return
        if (typeof result === 'string') {
          setStatus('healthy')
          setLatency(Date.now() - start)
        } else {
          setStatus('unhealthy')
          setLatency(null)
        }
      } catch {
        if (!cancelled) {
          setStatus('unhealthy')
          setLatency(null)
        }
      }
    }

    const timer = setTimeout(() => { check() }, 500)

    const interval = setInterval(() => { check() }, 60000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      clearInterval(interval)
    }
    // 故意只依赖三个稳定字段，而不是整个 provider 对象。
    // provider 是父组件每次渲染重新创建的引用 — 放进依赖会导致 useEffect 重跑 → setState → 父级重渲染 → 新对象 → 死循环。
    // 选这三个字段是因为它们才是真正决定健康状态的输入；name 之外的字段变化（如 models）不需要重新探测。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.name, provider.base_url, provider.api_key])

  const colors = {
    unknown: 'var(--app-text-muted)',
    healthy: 'var(--color-success)',
    unhealthy: 'var(--color-danger)',
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
      <span
        style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', backgroundColor: colors[status] }}
      />
      <span style={{ color: colors[status] }}>
        {status === 'healthy' && latency !== null ? `${latency}ms` :
         status === 'healthy' ? '正常' :
         status === 'unhealthy' ? '不可用' : '检测中'}
      </span>
    </span>
  )
}
