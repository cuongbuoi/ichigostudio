const RUBY_RE = /<ruby>([\s\S]*?)<\/ruby>/g
const ANNOTATION_RE = /<(rt|rp)>[\s\S]*?<\/\1>/g
const JAPANESE_RE = /[぀-ヿ㐀-鿿]/
const WORD_START_RE = /^(<ruby>|[\p{L}\p{N}])/u

/**
 * Gỡ `<ruby>` khi chữ gốc không phải tiếng Nhật (lỗi từ bước clone guide Bandai:
 * furigana bị gắn lên chữ Việt, các ruby liền nhau làm chữ dính "Têncácbộphận").
 * Furigana trên chữ Hán/kana thật được giữ nguyên.
 */
export function stripLatinRuby(html: string): string {
  return html.replace(RUBY_RE, (match, inner: string, offset: number, full: string) => {
    const base = inner.replace(ANNOTATION_RE, '')
    if (JAPANESE_RE.test(base)) return match
    const next = full.slice(offset + match.length)
    return WORD_START_RE.test(next) ? `${base} ` : base
  })
}
