export interface Hook {
  id: string
  type: 'foreshadowing' | 'mystery' | 'promise' | 'tension'
  description: string
  plantedChapter: number
  status: 'planted' | 'developing' | 'payoff' | 'abandoned'
  payoffChapter?: number
  relatedChapters: number[]
  createdAt: number
}

const STALE_THRESHOLD_CHAPTERS = 20

export function parseHooksFromJson(json: string): Hook[] {
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) return []

    return data.map((item: Record<string, unknown>, i: number) => ({
      id: (item.id as string) || `hook-${i}`,
      type: (item.type as Hook['type']) || 'foreshadowing',
      description: (item.description as string) || (item.text as string) || '',
      plantedChapter: (item.planted_chapter as number) || (item.plantedChapter as number) || 0,
      status: (item.status as Hook['status']) || 'planted',
      payoffChapter: (item.payoff_chapter as number) || (item.payoffChapter as number),
      relatedChapters: (item.related_chapters as number[]) || (item.relatedChapters as number[]) || [],
      createdAt: (item.created_at as number) || Date.now(),
    }))
  } catch {
    return []
  }
}

export function detectStaleHooks(hooks: Hook[], currentChapter: number): Hook[] {
  return hooks.filter(
    (h) =>
      h.status === 'planted' &&
      currentChapter - h.plantedChapter > STALE_THRESHOLD_CHAPTERS,
  )
}

export function getHookStats(hooks: Hook[]): {
  total: number
  planted: number
  developing: number
  payoff: number
  abandoned: number
  stale: number
} {
  const currentChapter = Math.max(...hooks.map((h) => h.plantedChapter), 0)
  const stale = detectStaleHooks(hooks, currentChapter + 1)

  return {
    total: hooks.length,
    planted: hooks.filter((h) => h.status === 'planted').length,
    developing: hooks.filter((h) => h.status === 'developing').length,
    payoff: hooks.filter((h) => h.status === 'payoff').length,
    abandoned: hooks.filter((h) => h.status === 'abandoned').length,
    stale: stale.length,
  }
}

export function suggestHookClosure(hook: Hook, currentChapter: number): string {
  const age = currentChapter - hook.plantedChapter

  if (hook.type === 'foreshadowing') {
    return `伏笔"${hook.description.slice(0, 30)}"已埋设 ${age} 章，建议在接下来 3-5 章内回收。可考虑通过角色行动或场景揭示来自然回收。`
  }
  if (hook.type === 'mystery') {
    return `悬念"${hook.description.slice(0, 30)}"已持续 ${age} 章，读者期待解答。建议设置一个揭示场景。`
  }
  if (hook.type === 'promise') {
    return `承诺"${hook.description.slice(0, 30)}"已等待 ${age} 章，需要兑现以维持读者信任。`
  }
  return `张力钩"${hook.description.slice(0, 30)}"已持续 ${age} 章。`
}
