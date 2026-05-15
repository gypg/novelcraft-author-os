import { describe, it, expect } from 'vitest'
import { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'
import { findTextInNode } from './SearchReplace'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
  marks: {},
})

function createDoc(text: string): ProseMirrorNode {
  return schema.node('doc', null, [
    schema.node('paragraph', null, text ? [schema.text(text)] : []),
  ])
}

function createMultiParagraphDoc(paragraphs: string[]): ProseMirrorNode {
  const nodes = paragraphs.map((text) =>
    schema.node('paragraph', null, text ? [schema.text(text)] : []),
  )
  return schema.node('doc', null, nodes)
}

describe('findTextInNode', () => {
  it('在单段落中查找文本', () => {
    const doc = createDoc('你好世界，这是一个测试')
    const results: number[] = []
    findTextInNode(doc, '你好', results)
    expect(results.length).toBe(1)
    expect(results[0]).toBeGreaterThan(0)
  })

  it('查找不存在的文本返回空数组', () => {
    const doc = createDoc('你好世界')
    const results: number[] = []
    findTextInNode(doc, '不存在', results)
    expect(results).toEqual([])
  })

  it('查找多个匹配项', () => {
    const doc = createDoc('测试测试再测试')
    const results: number[] = []
    findTextInNode(doc, '测试', results)
    expect(results.length).toBe(3)
  })

  it('大小写不敏感查找', () => {
    const doc = createDoc('Hello World')
    const results: number[] = []
    findTextInNode(doc, 'hello', results)
    expect(results.length).toBe(1)
  })

  it('跨段落查找', () => {
    const doc = createMultiParagraphDoc(['第一段内容', '第二段内容', '第三段内容'])
    const results: number[] = []
    findTextInNode(doc, '内容', results)
    expect(results.length).toBe(3)
  })

  it('空查询返回空结果', () => {
    const doc = createDoc('你好世界')
    const results: number[] = []
    findTextInNode(doc, '', results)
    expect(results).toEqual([])
  })

  it('空文档查找返回空结果', () => {
    const doc = createDoc('')
    const results: number[] = []
    findTextInNode(doc, '测试', results)
    expect(results).toEqual([])
  })

  it('中文和英文混合查找', () => {
    const doc = createDoc('Hello你好World世界')
    const results: number[] = []
    findTextInNode(doc, '你好', results)
    expect(results.length).toBe(1)
  })

  it('offset 参数正确传递', () => {
    const doc = createMultiParagraphDoc(['abc', 'abc'])
    const results: number[] = []
    findTextInNode(doc, 'abc', results)
    expect(results.length).toBe(2)
    expect(results[0]).toBeLessThan(results[1])
  })
})
