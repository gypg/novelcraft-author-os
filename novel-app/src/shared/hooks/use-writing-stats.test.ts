import { describe, it, expect, beforeEach } from 'vitest'
import { loadTodayWords } from './use-writing-stats'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('loadTodayWords', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无存储数据时返回 0', () => {
    expect(loadTodayWords()).toBe(0)
  })

  it('今日有数据时返回对应字数', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: 1234 }))
    expect(loadTodayWords()).toBe(1234)
  })

  it('非今日数据时返回 0', () => {
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: '2020-01-01', todayWords: 5000 }))
    expect(loadTodayWords()).toBe(0)
  })

  it('损坏的 JSON 数据时返回 0', () => {
    localStorage.setItem('novelcraft-writing-stats', 'not-json')
    expect(loadTodayWords()).toBe(0)
  })

  it('缺少 date 字段时返回 0', () => {
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ todayWords: 100 }))
    expect(loadTodayWords()).toBe(0)
  })

  it('todayWords 为 0 时返回 0', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: 0 }))
    expect(loadTodayWords()).toBe(0)
  })
})

describe('saveTodayWords 持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存后能正确读取', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: 2500 }))
    expect(loadTodayWords()).toBe(2500)
  })

  it('多次保存覆盖旧值', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: 100 }))
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: 200 }))
    expect(loadTodayWords()).toBe(200)
  })
})
