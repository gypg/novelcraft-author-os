import { describe, it, expect } from 'vitest'
import { renameEntityInTruthFiles } from '@/core/truth-files/entity-rename'
import type { TruthFileManager } from '@/core/truth-files/manager'

function createMockManager(data: Record<string, unknown>): TruthFileManager {
  return { get: (name: string) => data[name] } as unknown as TruthFileManager
}

describe('renameEntityInTruthFiles', () => {
  it('在 character_matrix 中重命名 character_a', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '李四', type: 'ally' },
        { character_a: '王五', character_b: '赵六', type: 'enemy' },
      ],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(1)
    const matrix = manager.get('character_matrix') as Record<string, string>[]
    expect(matrix[0].character_a).toBe('张三丰')
    expect(matrix[0].character_b).toBe('李四')
    expect(matrix[1].character_a).toBe('王五')
  })

  it('在 character_matrix 中重命名 character_b', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '李四', type: 'ally' },
      ],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '李四', '李四光')
    expect(changes).toBe(1)
    const matrix = manager.get('character_matrix') as Record<string, string>[]
    expect(matrix[0].character_b).toBe('李四光')
  })

  it('在 character_matrix 中同时重命名 character_a 和 character_b', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '张三', type: 'self' },
      ],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(2)
    const matrix = manager.get('character_matrix') as Record<string, string>[]
    expect(matrix[0].character_a).toBe('张三丰')
    expect(matrix[0].character_b).toBe('张三丰')
  })

  it('在 emotional_arcs 中重命名键', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: { '张三': { emotions: [] }, '李四': { emotions: [] } },
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(1)
    const arcs = manager.get('emotional_arcs') as Record<string, unknown>
    expect(arcs['张三']).toBeUndefined()
    expect(arcs['张三丰']).toBeDefined()
    expect(arcs['李四']).toBeDefined()
  })

  it('在 hooks 中替换 description 中的角色名', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [
        { description: '张三发现了秘密' },
        { description: '李四帮助了张三' },
        { description: '王五独自行动' },
      ],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(2)
    const hooks = manager.get('hooks') as Record<string, unknown>[]
    expect(hooks[0].description).toBe('张三丰发现了秘密')
    expect(hooks[1].description).toBe('李四帮助了张三丰')
    expect(hooks[2].description).toBe('王五独自行动')
  })

  it('在 hooks 中替换 description 中多次出现的角色名', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [
        { description: '张三对张三说：张三你好' },
      ],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(1)
    const hooks = manager.get('hooks') as Record<string, unknown>[]
    expect(hooks[0].description).toBe('张三丰对张三丰说：张三丰你好')
  })

  it('在 subplots 的 related_characters 中重命名', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [],
      subplots: [
        { related_characters: ['张三', '李四', '王五'] },
        { related_characters: ['赵六'] },
      ],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(1)
    const subplots = manager.get('subplots') as Record<string, unknown>[]
    expect((subplots[0] as Record<string, unknown>).related_characters).toEqual(['张三丰', '李四', '王五'])
    expect((subplots[1] as Record<string, unknown>).related_characters).toEqual(['赵六'])
  })

  it('在 particle_ledger 中重命名 owner', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [
        { owner: '张三', name: '宝剑' },
        { owner: '李四', name: '秘籍' },
        { owner: '张三', name: '令牌' },
      ],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(2)
    const ledger = manager.get('particle_ledger') as Record<string, unknown>[]
    expect(ledger[0].owner).toBe('张三丰')
    expect(ledger[1].owner).toBe('李四')
    expect(ledger[2].owner).toBe('张三丰')
  })

  it('跨所有 truth file 统计总变更数', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '李四' },
      ],
      emotional_arcs: { '张三': { emotions: [] } },
      hooks: [
        { description: '张三出场' },
      ],
      subplots: [
        { related_characters: ['张三'] },
      ],
      particle_ledger: [
        { owner: '张三' },
      ],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(5)
  })

  it('角色名不存在时返回 0 且不修改数据', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '李四' },
      ],
      emotional_arcs: { '王五': { emotions: [] } },
      hooks: [
        { description: '赵六出场' },
      ],
      subplots: [
        { related_characters: ['钱七'] },
      ],
      particle_ledger: [
        { owner: '孙八' },
      ],
    })
    const changes = renameEntityInTruthFiles(manager, '不存在', '新名字')
    expect(changes).toBe(0)
    const matrix = manager.get('character_matrix') as Record<string, string>[]
    expect(matrix[0].character_a).toBe('张三')
  })

  it('character_matrix 为空数组时正常处理', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(0)
  })

  it('character_matrix 为非数组时跳过', () => {
    const manager = createMockManager({
      character_matrix: { relationships: [] },
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(0)
  })

  it('hooks 中 description 为非字符串时跳过', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [
        { description: 123 },
        { description: null },
        { description: undefined },
      ],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(0)
  })

  it('subplots 中 related_characters 为非数组时跳过', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: {},
      hooks: [],
      subplots: [
        { related_characters: '张三' },
        { related_characters: null },
      ],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(0)
  })

  it('emotional_arcs 为 null 时跳过', () => {
    const manager = createMockManager({
      character_matrix: [],
      emotional_arcs: null,
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三丰')
    expect(changes).toBe(0)
  })

  it('oldName 与 newName 相同时仍执行替换', () => {
    const manager = createMockManager({
      character_matrix: [
        { character_a: '张三', character_b: '李四' },
      ],
      emotional_arcs: {},
      hooks: [],
      subplots: [],
      particle_ledger: [],
    })
    const changes = renameEntityInTruthFiles(manager, '张三', '张三')
    expect(changes).toBe(1)
    const matrix = manager.get('character_matrix') as Record<string, string>[]
    expect(matrix[0].character_a).toBe('张三')
  })
})
