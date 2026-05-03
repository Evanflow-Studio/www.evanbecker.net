// Average adult reading speed for non-technical prose. The Wall comes out
// to roughly 23 minutes at 225 wpm, which matches a careful read.
const WORDS_PER_MINUTE = 225

function flattenText(node: unknown): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(flattenText).join(' ')
  if (typeof node === 'object') {
    const n = node as { type?: string; value?: string; children?: unknown }
    if (n.type === 'text' && typeof n.value === 'string') return n.value
    if (n.children) return flattenText(n.children)
  }
  return ''
}

export function articleWordCount(article: unknown): number {
  const body = (article as { body?: unknown })?.body
  const text = flattenText(body)
  return text.split(/\s+/).filter(Boolean).length
}

export function articleReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
}
