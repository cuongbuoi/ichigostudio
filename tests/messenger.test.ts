import { describe, it, expect } from 'vitest'
import { buildMessengerHref } from '../utils/messenger'

describe('buildMessengerHref', () => {
  it('giữ nguyên url đã có https', () => {
    expect(buildMessengerHref('https://m.me/abc')).toBe('https://m.me/abc')
  })
  it('thêm https nếu thiếu', () => {
    expect(buildMessengerHref('m.me/abc')).toBe('https://m.me/abc')
  })
  it('trả chuỗi rỗng an toàn nếu input rỗng', () => {
    expect(buildMessengerHref('')).toBe('')
  })
})
