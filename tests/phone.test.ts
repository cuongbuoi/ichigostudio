import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidVnPhone } from '../utils/phone'

describe('normalizePhone', () => {
  it('bỏ ký tự không phải số', () => {
    expect(normalizePhone('0912 345-678')).toBe('0912345678')
  })
  it('84 + 9 số thành 0 + 9 số', () => {
    expect(normalizePhone('+84 912 345 678')).toBe('0912345678')
  })
  it('840 + 9 số (thừa số 0 sau 84) thành 0 + 9 số', () => {
    expect(normalizePhone('+84 0912 345 678')).toBe('0912345678')
    expect(isValidVnPhone('+84 0912 345 678')).toBe(true)
  })
})

describe('isValidVnPhone', () => {
  it('hợp lệ', () => {
    expect(isValidVnPhone('0912345678')).toBe(true)
    expect(isValidVnPhone('+84912345678')).toBe(true)
  })
  it('không hợp lệ', () => {
    expect(isValidVnPhone('0212345678')).toBe(false)
    expect(isValidVnPhone('091234567')).toBe(false)
    expect(isValidVnPhone('abc')).toBe(false)
  })
})
