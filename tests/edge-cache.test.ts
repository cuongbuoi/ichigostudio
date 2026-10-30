import { describe, it, expect } from 'vitest'
import { isEdgeCacheablePath, edgeCacheKey, isFresh, canonicalPath } from '../server/utils/edge-cache'

describe('isEdgeCacheablePath', () => {
  it.each(['/', '/san-pham', '/san-pham/khay-x-egg', '/danh-muc', '/danh-muc/kamen-rider', '/blog', '/blog/bai-viet',
    '/feedback', '/in-3d', '/3d-models', '/gioi-thieu', '/lien-he', '/sitemap.xml', '/llms.txt', '/robots.txt'])(
    'cache %s', (p) => expect(isEdgeCacheablePath(p)).toBe(true),
  )
  it.each(['/gio-hang', '/thanh-toan', '/thanh-toan/abc', '/don-hang', '/dat-thu', '/san-pham/a/b', '/_nuxt/x.js'])(
    'không cache %s', (p) => expect(isEdgeCacheablePath(p)).toBe(false),
  )
})

describe('edgeCacheKey', () => {
  it('bỏ tham số tracking, giữ tham số thật và sắp xếp', () => {
    expect(edgeCacheKey(new URL('https://ichigostudio.vn/san-pham?utm_source=fb&fbclid=1&danh-muc=x&gclid=2')))
      .toBe('https://ichigostudio.vn/san-pham?danh-muc=x')
    expect(edgeCacheKey(new URL('https://ichigostudio.vn/?b=2&a=1'))).toBe('https://ichigostudio.vn/?a=1&b=2')
  })
  it('không có query thì không có dấu ?', () => {
    expect(edgeCacheKey(new URL('https://ichigostudio.vn/blog?utm_medium=x'))).toBe('https://ichigostudio.vn/blog')
  })
})

describe('isFresh', () => {
  it('trong 60 giây là còn mới', () => {
    expect(isFresh('1000', 1000 + 59_000)).toBe(true)
    expect(isFresh('1000', 1000 + 61_000)).toBe(false)
  })
  it('thiếu hoặc sai mốc thời gian coi như cũ', () => {
    expect(isFresh(null, 5000)).toBe(false)
    expect(isFresh('abc', 5000)).toBe(false)
  })
})

describe('canonicalPath', () => {
  it('bỏ dấu / cuối', () => {
    expect(canonicalPath('/san-pham/')).toBe('/san-pham')
    expect(canonicalPath('/blog//')).toBe('/blog')
    expect(canonicalPath('/')).toBe('/')
  })
  it('chữ thường cho các mục nội dung', () => {
    expect(canonicalPath('/San-Pham/Khay-X')).toBe('/san-pham/khay-x')
    expect(canonicalPath('/BLOG/')).toBe('/blog')
  })
  it('giữ nguyên mã percent-encoding', () => {
    expect(canonicalPath('/Blog/%C3%A1')).toBe('/blog/%C3%A1')
  })
  it('không đổi hoa thường ở route có id (thanh toán) và file', () => {
    expect(canonicalPath('/thanh-toan/AbC123')).toBe('/thanh-toan/AbC123')
    expect(canonicalPath('/_nuxt/BgCjQfzL.js')).toBe('/_nuxt/BgCjQfzL.js')
  })
})
