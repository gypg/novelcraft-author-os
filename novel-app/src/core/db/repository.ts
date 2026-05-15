import { isTauri } from '@/shared/utils/tauri-env'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export interface BookRow {
  id: string
  title: string
  author: string
  synopsis: string
  cover: string | null
  status: 'ongoing' | 'completed' | 'paused'
  word_count: number
  target_daily_words: number | null
  genre: string | null
  tags: string | null
  created_at: number
  updated_at: number
}

export interface ChapterRow {
  id: string
  book_id: string
  volume_id: string | null
  title: string
  order_index: number
  content: string
  word_count: number
  status: 'draft' | 'reviewed' | 'final' | 'ai-generated'
  ai_audit_score: number | null
  created_at: number
  updated_at: number
}

export interface CreateBookInput {
  id: string
  title: string
  author?: string
  synopsis?: string
  status?: string
  target_daily_words?: number
  genre?: string
  tags?: string
}

export interface UpdateBookInput {
  title?: string
  author?: string
  synopsis?: string
  cover?: string
  status?: string
  target_daily_words?: number
  genre?: string
  tags?: string
}

export interface CreateChapterInput {
  id: string
  book_id: string
  volume_id?: string
  title: string
  order_index?: number
}

const MOCK_BOOKS: BookRow[] = [
  {
    id: 'demo-book-1',
    title: '星辰大海',
    author: '示例作者',
    synopsis: '一个关于探索未知星际的冒险故事。主角在偶然间发现了一张古老的星图，由此踏上了一段跨越银河系的旅程。',
    cover: null,
    status: 'ongoing',
    word_count: 12580,
    target_daily_words: 2000,
    genre: '科幻',
    tags: '星际,冒险',
    created_at: Date.now() - 86400000 * 30,
    updated_at: Date.now() - 86400000,
  },
  {
    id: 'demo-book-2',
    title: '山间清风',
    author: '示例作者',
    synopsis: '一个隐居山间的老人，与一只受伤的狐狸之间的温暖故事。在四季更替中，他们共同经历了生命的起伏。',
    cover: null,
    status: 'completed',
    word_count: 45200,
    target_daily_words: null,
    genre: '文学',
    tags: '治愈,自然',
    created_at: Date.now() - 86400000 * 60,
    updated_at: Date.now() - 86400000 * 10,
  },
]

const MOCK_CHAPTERS: Record<string, ChapterRow[]> = {
  'demo-book-1': [
    {
      id: 'ch-1',
      book_id: 'demo-book-1',
      volume_id: null,
      title: '第一章 星图的秘密',
      order_index: 0,
      content: '<p>夜幕降临，林远站在天文台的穹顶之下，仰望着那片他研究了十五年的星空。</p><p>今天不一样。屏幕上闪烁的数据告诉他，那个被编号为 X-7749 的信号源，正在以一种不可能的方式移动。</p><p>"这不对……"他喃喃自语，手指在键盘上飞速敲击，调出了过去三个月的观测记录。</p>',
      word_count: 1520,
      status: 'draft',
      ai_audit_score: null,
      created_at: Date.now() - 86400000 * 25,
      updated_at: Date.now() - 86400000 * 2,
    },
    {
      id: 'ch-2',
      book_id: 'demo-book-1',
      volume_id: null,
      title: '第二章 启程',
      order_index: 1,
      content: '<p>三天后，林远做出了一个所有人都认为疯狂的决定。</p><p>他要亲自去追踪那个信号源。</p>',
      word_count: 890,
      status: 'draft',
      ai_audit_score: null,
      created_at: Date.now() - 86400000 * 20,
      updated_at: Date.now() - 86400000,
    },
  ],
  'demo-book-2': [
    {
      id: 'ch-3',
      book_id: 'demo-book-2',
      volume_id: null,
      title: '第一章 初遇',
      order_index: 0,
      content: '<p>老陈在山间住了二十年，从未见过这样的眼神。</p><p>那只狐狸蜷缩在岩石下面，后腿上缠着一截断裂的猎夹。它的眼睛里没有恐惧，只有一种平静的、近乎人类般的凝视。</p>',
      word_count: 2100,
      status: 'reviewed',
      ai_audit_score: null,
      created_at: Date.now() - 86400000 * 50,
      updated_at: Date.now() - 86400000 * 15,
    },
  ],
}

export async function createBook(input: CreateBookInput): Promise<BookRow> {
  const inv = await getInvoke()
  if (!inv) {
    const book: BookRow = {
      ...input,
      author: input.author || '',
      synopsis: input.synopsis || '',
      cover: null,
      status: (input.status as BookRow['status']) || 'ongoing',
      word_count: 0,
      target_daily_words: input.target_daily_words ?? null,
      genre: input.genre ?? null,
      tags: input.tags ?? null,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    MOCK_BOOKS.push(book)
    return book
  }
  return inv<BookRow>('create_book', { input })
}

export async function listBooks(): Promise<BookRow[]> {
  const inv = await getInvoke()
  if (!inv) return MOCK_BOOKS
  return inv<BookRow[]>('list_books')
}

export async function updateBook(id: string, input: UpdateBookInput): Promise<BookRow> {
  const inv = await getInvoke()
  if (!inv) {
    const idx = MOCK_BOOKS.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error('Book not found')
    const filtered = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
    MOCK_BOOKS[idx] = { ...MOCK_BOOKS[idx], ...filtered, updated_at: Date.now() }
    return MOCK_BOOKS[idx]
  }
  return inv<BookRow>('update_book', { id, input })
}

export async function deleteBook(id: string): Promise<void> {
  const inv = await getInvoke()
  if (!inv) {
    const idx = MOCK_BOOKS.findIndex((b) => b.id === id)
    if (idx !== -1) MOCK_BOOKS.splice(idx, 1)
    return
  }
  return inv<void>('delete_book', { id })
}

export async function createChapter(input: CreateChapterInput): Promise<ChapterRow> {
  const inv = await getInvoke()
  if (!inv) {
    const chapter: ChapterRow = {
      id: input.id,
      book_id: input.book_id,
      volume_id: input.volume_id ?? null,
      title: input.title,
      order_index: input.order_index ?? 0,
      content: '',
      word_count: 0,
      status: 'draft',
      ai_audit_score: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    const list = MOCK_CHAPTERS[input.book_id] || []
    list.push(chapter)
    MOCK_CHAPTERS[input.book_id] = list
    return chapter
  }
  return inv<ChapterRow>('create_chapter', { input })
}

export async function listChapters(bookId: string): Promise<ChapterRow[]> {
  const inv = await getInvoke()
  if (!inv) return MOCK_CHAPTERS[bookId] || []
  return inv<ChapterRow[]>('list_chapters', { bookId })
}

export async function updateChapterContent(
  chapterId: string,
  content: string | { title?: string },
): Promise<ChapterRow> {
  const inv = await getInvoke()
  if (!inv) {
    for (const list of Object.values(MOCK_CHAPTERS)) {
      const idx = list.findIndex((c) => c.id === chapterId)
      if (idx !== -1) {
        if (typeof content === 'string') {
          list[idx].content = content
        } else {
          if (content.title) list[idx].title = content.title
        }
        list[idx].updated_at = Date.now()
        return list[idx]
      }
    }
    throw new Error('Chapter not found')
  }
  return inv<ChapterRow>('update_chapter_content', { chapterId, content })
}

export async function updateChapterStatus(
  chapterId: string,
  status: string,
): Promise<ChapterRow> {
  const inv = await getInvoke()
  if (!inv) {
    for (const list of Object.values(MOCK_CHAPTERS)) {
      const idx = list.findIndex((c) => c.id === chapterId)
      if (idx !== -1) {
        list[idx].status = status as ChapterRow['status']
        list[idx].updated_at = Date.now()
        return list[idx]
      }
    }
    throw new Error('Chapter not found')
  }
  return inv<ChapterRow>('update_chapter_status', { chapterId, status })
}

export async function deleteChapter(chapterId: string): Promise<void> {
  const inv = await getInvoke()
  if (!inv) {
    for (const [bookId, list] of Object.entries(MOCK_CHAPTERS)) {
      const idx = list.findIndex((c) => c.id === chapterId)
      if (idx !== -1) {
        list.splice(idx, 1)
        MOCK_CHAPTERS[bookId] = list
        return
      }
    }
    return
  }
  return inv<void>('delete_chapter', { chapterId })
}

export async function reorderChapters(chapterIds: string[]): Promise<void> {
  const inv = await getInvoke()
  if (!inv) return
  return inv<void>('reorder_chapters', { chapterIds })
}

export async function exportBookData(bookId: string): Promise<string> {
  const inv = await getInvoke()
  if (!inv) return JSON.stringify({ bookId, chapters: MOCK_CHAPTERS[bookId] || [] })
  return inv<string>('export_book_data', { bookId })
}

export async function importBookData(jsonData: string, overwrite: boolean): Promise<string> {
  const inv = await getInvoke()
  if (!inv) return 'mock-import-id'
  return inv<string>('import_book_data', { input: { jsonData, overwrite } })
}

export function generateId(): string {
  return crypto.randomUUID()
}
