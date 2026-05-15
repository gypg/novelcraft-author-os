import { describe, it, expect, beforeEach } from 'vitest'
import { TruthFileManager } from '@/core/truth-files/manager'

describe('TruthFileManager', () => {
  let manager: TruthFileManager

  beforeEach(() => {
    manager = new TruthFileManager()
  })

  it('初始化后所有 truth file 有默认值', () => {
    const names = [
      'current_state', 'hooks', 'summaries', 'subplots',
      'emotional_arcs', 'character_matrix', 'particle_ledger',
    ] as const
    for (const name of names) {
      const data = manager.get(name)
      expect(data).toBeDefined()
    }
  })

  it('set + get 往返正确', () => {
    const result = manager.set('current_state', {
      location: '北京',
      time: '夜晚',
      weather: '下雨',
      conditions: { mood: '紧张' },
    })
    expect(result.valid).toBe(true)
    const data = manager.get('current_state') as Record<string, unknown>
    expect(data.location).toBe('北京')
    expect(data.time).toBe('夜晚')
  })

  it('set 无效数据返回校验失败', () => {
    const result = manager.set('hooks', {
      hooks: [{ id: 123, name: false }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).not.toBeNull()
  })

  it('validate 不修改内部状态', () => {
    const before = manager.get('hooks')
    const result = manager.validate('hooks', {
      hooks: [{ id: 123, name: false }],
    })
    expect(result.valid).toBe(false)
    const after = manager.get('hooks')
    expect(after).toEqual(before)
  })

  it('reset 恢复默认值', () => {
    manager.set('current_state', {
      location: '测试',
      time: '白天',
      weather: '晴',
      conditions: {},
    })
    manager.reset()
    const data = manager.get('current_state') as Record<string, unknown>
    expect(data.location).toBe('')
  })

  it('validateAll 返回所有文件校验结果', () => {
    const results = manager.validateAll()
    const names = Object.keys(results)
    expect(names.length).toBe(7)
    for (const name of names) {
      expect(results[name as keyof typeof results]).toHaveProperty('valid')
    }
  })

  it('exportAll 返回所有文件的 JSON 字符串', () => {
    const exported = manager.exportAll()
    expect(Object.keys(exported).length).toBe(7)
    for (const [_name, json] of Object.entries(exported)) {
      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    }
  })

  it('getJson 返回格式化 JSON', () => {
    const json = manager.getJson('current_state')
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed).toBeDefined()
  })
})
