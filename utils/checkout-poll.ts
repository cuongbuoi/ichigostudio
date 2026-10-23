// Nhịp poll trang chờ thanh toán: nhanh khi đang chờ, chậm sau khi hết hạn (tiền có thể về muộn).

export const POLL_PENDING_MS = 3000
export const POLL_LATE_MS = 10_000
/** Sau `expiresAt`, server vẫn tạo đơn nếu tiền về muộn: theo dõi thêm 60 phút rồi dừng. */
export const LATE_WINDOW_MS = 60 * 60 * 1000

/**
 * Khoảng chờ tới lượt poll kế tiếp (ms), hoặc `null` để dừng.
 * `status` null = chưa tải được lần nào (lỗi mạng tạm thời) nên thử lại như đang chờ.
 * Dừng hẳn ở `paid`, `cancelled`, `needs_review`, và khi đã quá 60 phút sau hạn.
 */
export function nextPollDelay(
  status: string | null,
  expiresAt: string | number | null | undefined,
  now: number,
): number | null {
  if (status === null || status === 'pending') return POLL_PENDING_MS
  if (status !== 'expired') return null
  const exp = expiresAt == null ? NaN : new Date(expiresAt).getTime()
  if (!Number.isFinite(exp)) return null
  return now < exp + LATE_WINDOW_MS ? POLL_LATE_MS : null
}
