// Chuẩn hoá và kiểm tra số điện thoại Việt Nam (giữ y hệt ở API và store).

/** Bỏ mọi ký tự không phải số; `84` + 9 số hoặc `840` + 9 số (thừa số 0) → `0` + 9 số. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (/^84\d{9}$/.test(digits)) return '0' + digits.slice(2)
  if (/^840\d{9}$/.test(digits)) return '0' + digits.slice(3)
  return digits
}

export function isValidVnPhone(raw: string): boolean {
  return /^0[35789]\d{8}$/.test(normalizePhone(raw))
}
