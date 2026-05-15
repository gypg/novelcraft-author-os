import { describe, it, expect, beforeEach } from 'vitest'
import { eventBus } from '@/core/events'

describe('TypedEventBus', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  it('on/emit 基本收发', () => {
    let received = ''
    eventBus.on('editor:content-changed', (data) => {
      received = data.content
    })
    eventBus.emit('editor:content-changed', { bookId: 'b1', chapterId: 'c1', content: 'hello' })
    expect(received).toBe('hello')
  })

  it('once 只触发一次', () => {
    let count = 0
    eventBus.once('pipeline:status', () => { count++ })
    eventBus.emit('pipeline:status', { status: 'running', iteration: 0 })
    eventBus.emit('pipeline:status', { status: 'completed', iteration: 1 })
    expect(count).toBe(1)
  })

  it('off 取消订阅', () => {
    let count = 0
    const handler = () => { count++ }
    eventBus.on('editor:content-changed', handler)
    eventBus.emit('editor:content-changed', { bookId: 'b1', chapterId: 'c1', content: 'a' })
    eventBus.off('editor:content-changed', handler)
    eventBus.emit('editor:content-changed', { bookId: 'b1', chapterId: 'c1', content: 'b' })
    expect(count).toBe(1)
  })

  it('on 返回 unsubscribe 函数', () => {
    let count = 0
    const unsub = eventBus.on('pipeline:status', () => { count++ })
    eventBus.emit('pipeline:status', { status: 'running', iteration: 0 })
    unsub()
    eventBus.emit('pipeline:status', { status: 'idle', iteration: 0 })
    expect(count).toBe(1)
  })

  it('多个监听器同时工作', () => {
    let a = ''
    let b = ''
    eventBus.on('editor:content-changed', (data) => { a = data.content })
    eventBus.on('editor:content-changed', (data) => { b = data.content })
    eventBus.emit('editor:content-changed', { bookId: 'b1', chapterId: 'c1', content: 'multi' })
    expect(a).toBe('multi')
    expect(b).toBe('multi')
  })

  it('不同事件互不干扰', () => {
    let editorReceived = ''
    let pipelineReceived: string | undefined
    eventBus.on('editor:content-changed', (data) => { editorReceived = data.content })
    eventBus.on('pipeline:status', (data) => { pipelineReceived = data.status })
    eventBus.emit('editor:content-changed', { bookId: 'b1', chapterId: 'c1', content: 'text' })
    expect(editorReceived).toBe('text')
    expect(pipelineReceived).toBeUndefined()
  })

  it('pipeline:status 只接受合法状态值', () => {
    const validStatuses: Array<'idle' | 'running' | 'audit' | 'revise' | 'completed' | 'paused'> = [
      'idle', 'running', 'audit', 'revise', 'completed', 'paused',
    ]
    for (const status of validStatuses) {
      let received = ''
      eventBus.on('pipeline:status', (data) => { received = data.status })
      eventBus.emit('pipeline:status', { status, iteration: 0 })
      expect(received).toBe(status)
      eventBus.off('pipeline:status')
    }
  })
})
