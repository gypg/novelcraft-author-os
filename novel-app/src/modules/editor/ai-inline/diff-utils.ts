export interface DiffSegment {
  type: 'equal' | 'added' | 'removed'
  text: string
}

export function computeDiff(original: string, modified: string): DiffSegment[] {
  if (!original && !modified) return []
  if (!original) return [{ type: 'added', text: modified }]
  if (!modified) return [{ type: 'removed', text: original }]

  const segments: DiffSegment[] = []
  const oChars = [...original]
  const mChars = [...modified]
  const oLen = oChars.length
  const mLen = mChars.length

  const maxLen = Math.max(oLen, mLen)
  if (maxLen > 5000) {
    return lineLevelDiff(original, modified)
  }

  const lcs = computeLCS(oChars, mChars)
  let oi = 0
  let mi = 0
  let li = 0

  while (oi < oLen || mi < mLen) {
    if (li < lcs.length && oi < oLen && mi < mLen && oChars[oi] === lcs[li] && mChars[mi] === lcs[li]) {
      if (segments.length > 0 && segments[segments.length - 1].type === 'equal') {
        segments[segments.length - 1].text += oChars[oi]
      } else {
        segments.push({ type: 'equal', text: oChars[oi] })
      }
      oi++
      mi++
      li++
    } else {
      let removedRun = ''
      let addedRun = ''

      while (oi < oLen && (li >= lcs.length || oChars[oi] !== lcs[li])) {
        removedRun += oChars[oi]
        oi++
      }

      while (mi < mLen && (li >= lcs.length || mChars[mi] !== lcs[li])) {
        addedRun += mChars[mi]
        mi++
      }

      if (removedRun) segments.push({ type: 'removed', text: removedRun })
      if (addedRun) segments.push({ type: 'added', text: addedRun })
    }
  }

  return mergeSegments(segments)
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length

  if (m === 0 || n === 0) return []

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

function lineLevelDiff(original: string, modified: string): DiffSegment[] {
  const oLines = original.split('\n')
  const mLines = modified.split('\n')
  const segments: DiffSegment[] = []

  const lcs = computeLCS(oLines, mLines)
  let oi = 0
  let mi = 0
  let li = 0

  while (oi < oLines.length || mi < mLines.length) {
    if (li < lcs.length && oi < oLines.length && mi < mLines.length && oLines[oi] === lcs[li] && mLines[mi] === lcs[li]) {
      if (segments.length > 0 && segments[segments.length - 1].type === 'equal') {
        segments[segments.length - 1].text += '\n' + oLines[oi]
      } else {
        segments.push({ type: 'equal', text: oLines[oi] })
      }
      oi++
      mi++
      li++
    } else {
      let removedRun = ''
      let addedRun = ''

      while (oi < oLines.length && (li >= lcs.length || oLines[oi] !== lcs[li])) {
        if (removedRun) removedRun += '\n'
        removedRun += oLines[oi]
        oi++
      }

      while (mi < mLines.length && (li >= lcs.length || mLines[mi] !== lcs[li])) {
        if (addedRun) addedRun += '\n'
        addedRun += mLines[mi]
        mi++
      }

      if (removedRun) segments.push({ type: 'removed', text: removedRun })
      if (addedRun) segments.push({ type: 'added', text: addedRun })
    }
  }

  return mergeSegments(segments)
}

function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  const result: DiffSegment[] = []
  for (const seg of segments) {
    if (!seg.text) continue
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text
    } else {
      result.push({ ...seg })
    }
  }
  return result
}
