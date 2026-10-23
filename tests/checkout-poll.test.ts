import { describe, it, expect } from 'vitest'
import { nextPollDelay, POLL_PENDING_MS, POLL_LATE_MS, LATE_WINDOW_MS } from '../utils/checkout-poll'

const EXP = 1_800_000_000_000

describe('nextPollDelay', () => {
  it('poll nhanh khi đang chờ hoặc chưa tải được', () => {
    expect(nextPollDelay('pending', EXP, EXP - 1000)).toBe(POLL_PENDING_MS)
    expect(nextPollDelay(null, null, EXP)).toBe(POLL_PENDING_MS)
  })

  it('hết hạn: poll chậm 10s trong 60 phút sau hạn rồi dừng', () => {
    expect(POLL_LATE_MS).toBe(10_000)
    expect(nextPollDelay('expired', EXP, EXP + 1)).toBe(POLL_LATE_MS)
    expect(nextPollDelay('expired', EXP, EXP + LATE_WINDOW_MS - 1)).toBe(POLL_LATE_MS)
    expect(nextPollDelay('expired', EXP, EXP + LATE_WINDOW_MS)).toBeNull()
    expect(nextPollDelay('expired', EXP, EXP + 2 * LATE_WINDOW_MS)).toBeNull()
  })

  it('nhận expiresAt dạng chuỗi ISO', () => {
    expect(nextPollDelay('expired', new Date(EXP).toISOString(), EXP + 5000)).toBe(POLL_LATE_MS)
  })

  it('hết hạn mà không có expiresAt hợp lệ thì dừng', () => {
    expect(nextPollDelay('expired', null, EXP)).toBeNull()
    expect(nextPollDelay('expired', 'abc', EXP)).toBeNull()
  })

  it('dừng ở paid, cancelled, needs_review', () => {
    for (const s of ['paid', 'cancelled', 'needs_review']) expect(nextPollDelay(s, EXP, EXP - 1000)).toBeNull()
  })
})
