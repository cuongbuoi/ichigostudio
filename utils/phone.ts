// Cùng quy tắc với API: bỏ ký tự không phải số, 84 + 9 số thành 0 + 9 số.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return /^84\d{9}$/.test(digits) ? `0${digits.slice(2)}` : digits
}

export function isValidVnPhone(raw: string): boolean {
  return /^0[35789]\d{8}$/.test(normalizePhone(raw))
}
