import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

export interface TimelineEvent {
  id: string
  chapterNumber: number
  title: string
  description: string
  importance: 'major' | 'minor'
}

export function buildTimelineFromFacts(facts: TemporalFactRow[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const fact of facts) {
    events.push({
      id: fact.id,
      chapterNumber: fact.valid_from_chapter,
      title: `${fact.subject} ${fact.predicate}`,
      description: fact.object,
      importance: estimateImportance(fact),
    })
  }

  return events.sort((a, b) => a.chapterNumber - b.chapterNumber)
}

function estimateImportance(fact: TemporalFactRow): 'major' | 'minor' {
  const text = `${fact.predicate} ${fact.object}`.toLowerCase()
  const majorKeywords = ['死', '杀', '结婚', '背叛', '离开', '到达', '获得', '失去', '发现', '揭示']
  for (const kw of majorKeywords) {
    if (text.includes(kw)) return 'major'
  }
  return 'minor'
}

export function detectTimelineContradictions(events: TimelineEvent[]): string[] {
  const contradictions: string[] = []

  // Check for events in wrong order (e.g., character dies then appears later)
  const characterEvents = new Map<string, Array<{ chapter: number; event: string }>>()

  for (const evt of events) {
    const match = evt.title.match(/^(.+?)\s/)
    if (match) {
      const charName = match[1]
      if (!characterEvents.has(charName)) characterEvents.set(charName, [])
      characterEvents.get(charName)!.push({ chapter: evt.chapterNumber, event: evt.description })
    }
  }

  for (const [char, evts] of characterEvents) {
    const deathEvent = evts.find((e) => e.event.includes('死') || e.event.includes('亡'))
    if (deathEvent) {
      const laterEvents = evts.filter((e) => e.chapter > deathEvent.chapter)
      if (laterEvents.length > 0) {
        contradictions.push(`${char} 在第 ${deathEvent.chapter} 章后仍有活动`)
      }
    }
  }

  return contradictions
}
