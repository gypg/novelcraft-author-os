import { useCallback, useRef, useState } from 'react'

interface SSEOptions {
  url: string
  headers?: Record<string, string>
  onMessage?: (data: string) => void
  onDelta?: (delta: string) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
}

interface UseSSEReturn {
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: (body?: unknown) => void
  disconnect: () => void
  accumulatedText: string
}

export function useSSE(options: SSEOptions): UseSSEReturn {
  const { url, headers = {}, onMessage, onDelta, onError, onOpen, onClose } = options

  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accumulatedText, setAccumulatedText] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  const disconnect = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const connect = useCallback(
    (body?: unknown) => {
      disconnect()
      setIsConnecting(true)
      setError(null)
      setAccumulatedText('')

      const controller = new AbortController()
      abortRef.current = controller

      fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          setIsConnecting(false)
          setIsConnected(true)
          onOpen?.()

          const reader = response.body?.getReader()
          if (!reader) return

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') break

                try {
                  const parsed = JSON.parse(data)
                  const text = parsed.choices?.[0]?.delta?.content || parsed.text || ''
                  if (text) {
                    setAccumulatedText((prev) => prev + text)
                    onDelta?.(text)
                  }
                } catch {
                  setAccumulatedText((prev) => prev + data)
                  onDelta?.(data)
                }

                onMessage?.(data)
              }
            }
          }

          setIsConnected(false)
          onClose?.()
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setError(err.message)
          setIsConnected(false)
          setIsConnecting(false)
          onError?.(err)
        })
    },
    [url, headers, onMessage, onDelta, onError, onOpen, onClose, disconnect]
  )

  return { isConnecting, isConnected, error, connect, disconnect, accumulatedText }
}
