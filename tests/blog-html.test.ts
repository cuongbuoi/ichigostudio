import { describe, it, expect } from 'vitest'
import { stripLatinRuby } from '../utils/blog-html'

const r = (base: string, rt: string) => `<ruby>${base}<rp>(</rp><rt>${rt}</rt><rp>)</rp></ruby>`

describe('stripLatinRuby', () => {
  it('gỡ chú âm khỏi chữ Việt và chèn khoảng trắng giữa các ruby liền nhau', () => {
    const html = `<h3>${r('Tên', 'な')}${r('các', 'かく')}${r('bộ', 'ぶ')}${r('phận', 'ぶん')}</h3>`
    expect(stripLatinRuby(html)).toBe('<h3>Tên các bộ phận</h3>')
  })

  it('giữ khoảng trắng sẵn có, không nhân đôi', () => {
    const html = `<h2>${r('Cách chơi', 'あそ')}${r('của', 'かた')} Hammer Born Buckle</h2>`
    expect(stripLatinRuby(html)).toBe('<h2>Cách chơi của Hammer Born Buckle</h2>')
  })

  it('chèn khoảng trắng khi ruby đứng sát chữ thường', () => {
    expect(stripLatinRuby(`<p>${r('Biến', 'へん')}thân</p>`)).toBe('<p>Biến thân</p>')
  })

  it('giữ nguyên furigana trên chữ Hán/kana', () => {
    const html = `<p>${r('仮面', 'かめん')}ライダー</p>`
    expect(stripLatinRuby(html)).toBe(html)
  })

  it('không đổi HTML không có ruby', () => {
    expect(stripLatinRuby('<p>Không có ruby</p>')).toBe('<p>Không có ruby</p>')
    expect(stripLatinRuby('')).toBe('')
  })
})
