import { useState } from 'react'
import { PRESET_FORMULAS, GENRE_PROFILES, type GenreProfile } from '@/core/style/writing-formula'

const RHYTHM_LABELS: Record<string, string> = {
  'short-dense': '短句密集',
  'mixed': '长短交替',
  'long-flowing': '长句舒缓',
}

export function StylePage() {
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [refText, setRefText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [genreFilter, setGenreFilter] = useState<string>('all')

  const handleAnalyze = () => {
    if (!refText.trim()) return
    setAnalyzing(true)
    setTimeout(() => {
      const sentences = refText.split(/[。！？\n]+/).filter(Boolean)
      const words = refText.split('').filter((c) => c.trim())
      const dialogueLines = refText.split('\n').filter(
        (l) => l.trim().startsWith('"') || l.trim().startsWith('「') || l.trim().startsWith('"'),
      )
      setResult({
        sentences: sentences.length,
        words: words.length,
        dialogueRatio: (dialogueLines.length / Math.max(sentences.length, 1)).toFixed(1),
        rhythm: 'mixed',
      })
      setAnalyzing(false)
    }, 600)
  }

  const filteredFormulas = Object.entries(PRESET_FORMULAS).filter(([, f]) => {
    if (genreFilter === 'all') return true
    return f.targetGenre?.includes(genreFilter)
  })

  const genreCategories = ['all', '男频', '女频', '通用']
  const filteredGenres = genreFilter === 'all'
    ? GENRE_PROFILES
    : GENRE_PROFILES.filter((g) => g.category === genreFilter)

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--app-page-bg)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--app-text-primary)', letterSpacing: '-0.02em' }}>
            写作风格
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
            Voice Profile 文风指纹 + 写法引擎技法标签 + 题材模板
          </p>
        </div>

        {/* Genre Profiles */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              题材模板
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {genreCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGenreFilter(cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--app-radius-full)',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: genreFilter === cat ? 'var(--color-brand)' : 'var(--app-surface)',
                    color: genreFilter === cat ? 'white' : 'var(--app-text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat === 'all' ? '全部' : cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {filteredGenres.map((g: GenreProfile) => (
              <div
                key={g.id}
                onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--app-radius-xl)',
                  background: 'var(--app-surface)',
                  border: `1px solid ${selectedGenre === g.id ? 'var(--color-brand)' : 'var(--app-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)' }}>{g.name}</span>
                  <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                    {g.category}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  {g.coreElements.slice(0, 3).map((el) => (
                    <span key={el} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--app-surface-subtle)', color: 'var(--app-text-muted)' }}>
                      {el}
                    </span>
                  ))}
                </div>
                {selectedGenre === g.id && (
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--app-divider)', paddingTop: '8px', marginTop: '4px' }}>
                    <div>节奏：{g.pacing}</div>
                    <div>读者钩子：{g.readerHook}</div>
                    <div>爽点类型：{g.coolPointType}</div>
                    <div style={{ color: 'var(--color-danger)' }}>避免：{g.antiPatterns.join('、')}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Voice Profile Analysis */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '10px' }}>
            Voice Profile 分析
          </div>
          <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 'var(--app-radius-xl)', padding: '16px', boxShadow: 'var(--app-shadow-sm)' }}>
            <textarea
              value={refText}
              onChange={(e) => setRefText(e.target.value)}
              placeholder="粘贴参考文本（至少 200 字），系统将提取文风指纹..."
              style={{
                width: '100%', minHeight: '100px', padding: '0', border: 'none',
                background: 'transparent', color: 'var(--app-text-primary)', fontSize: '13px',
                fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{refText.length} 字</span>
              <button
                onClick={handleAnalyze}
                disabled={refText.length < 50 || analyzing}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--app-radius-full)',
                  background: analyzing ? 'var(--app-surface-subtle)' : 'var(--color-brand)',
                  color: analyzing ? 'var(--app-text-muted)' : 'var(--app-text-inverse)',
                  border: 'none', cursor: refText.length >= 50 && !analyzing ? 'pointer' : 'not-allowed',
                  fontSize: '12px', fontWeight: 700, transition: 'all 0.15s ease',
                  opacity: refText.length < 50 ? 0.6 : 1,
                }}
              >
                {analyzing ? '分析中...' : '提取文风指纹'}
              </button>
            </div>
          </div>
          {result && (
            <div style={{ marginTop: '12px', padding: '14px', borderRadius: 'var(--app-radius-lg)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '8px' }}>分析结果</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: '句子数', value: String(result.sentences ?? '') },
                  { label: '字符数', value: String(result.words ?? '') },
                  { label: '对话比例', value: `${(Number(result.dialogueRatio) * 100).toFixed(0)}%` },
                  { label: '节奏', value: RHYTHM_LABELS[result.rhythm as string] || '混合' },
                ].map((stat) => (
                  <div key={stat.label} style={{ padding: '8px 10px', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface-subtle)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--app-text-muted)', marginBottom: '2px' }}>{stat.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--app-text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Writing Formulas */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            写法引擎 — 26 位作者文风库
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {filteredFormulas.map(([key, f]) => (
              <div
                key={key}
                onClick={() => setSelectedFormula(selectedFormula === key ? null : key)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--app-radius-xl)',
                  background: 'var(--app-surface)',
                  border: `1px solid ${selectedFormula === key ? 'var(--color-brand)' : 'var(--app-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)' }}>{f.name}</span>
                  {f.targetGenre && (
                    <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                      {f.targetGenre}
                    </span>
                  )}
                </div>
                {selectedFormula === key && f.techniques && (
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', lineHeight: 1.7, borderTop: '1px solid var(--app-divider)', paddingTop: '8px', marginTop: '6px' }}>
                    {f.techniques.syntax && f.techniques.syntax.length > 0 && <div>句法：{f.techniques.syntax.join('、')}</div>}
                    {f.techniques.narrative && f.techniques.narrative.length > 0 && <div>叙事：{f.techniques.narrative.join('、')}</div>}
                    {f.techniques.emotion && f.techniques.emotion.length > 0 && <div>情感：{f.techniques.emotion.join('、')}</div>}
                    {f.techniques.structure && f.techniques.structure.length > 0 && <div>结构：{f.techniques.structure.join('、')}</div>}
                    {f.techniques.dialogue && f.techniques.dialogue.length > 0 && <div>对话：{f.techniques.dialogue.join('、')}</div>}
                    {f.antiPatterns && f.antiPatterns.length > 0 && <div style={{ color: 'var(--color-danger)' }}>避免：{f.antiPatterns.join('、')}</div>}
                  </div>
                )}
                {!selectedFormula || selectedFormula !== key ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
                    {[
                      ...(f.techniques?.syntax || []).slice(0, 1),
                      ...(f.techniques?.narrative || []).slice(0, 1),
                      ...(f.techniques?.emotion || []).slice(0, 1),
                    ].map((t) => (
                      <span key={t} style={{ padding: '1px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-brand-light)', color: 'var(--color-brand)', fontSize: '10px', fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
