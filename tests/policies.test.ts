import { describe, it, expect } from 'vitest'
import { POLICIES, getPolicy } from '../utils/policies'

const len = (s: string) => [...s].length

describe('POLICIES', () => {
  it('slug kebab-case không dấu, không trùng', () => {
    const slugs = POLICIES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  it.each(POLICIES.map((p) => [p.slug, p]))('%s: title 50-60, description 130-150 ký tự', (_slug, p) => {
    expect(len(p.title)).toBeGreaterThanOrEqual(50)
    expect(len(p.title)).toBeLessThanOrEqual(60)
    expect(len(p.description)).toBeGreaterThanOrEqual(130)
    expect(len(p.description)).toBeLessThanOrEqual(150)
  })

  it('không dùng em-dash trong nội dung (quy ước brand)', () => {
    for (const p of POLICIES) {
      const all = [p.h1, p.title, p.description, p.intro, ...p.sections.flatMap((s) => [s.heading, s.body])].join('\n')
      expect(all).not.toContain('—')
    }
  })

  it('updated là ngày ISO', () => {
    for (const p of POLICIES) expect(p.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('getPolicy', () => {
    expect(getPolicy('doi-tra')?.h1).toBe('Chính sách đổi trả và bảo hành')
    expect(getPolicy('khong-co')).toBeUndefined()
  })
})
