export function buildMessengerHref(baseUrl: string): string {
  if (!baseUrl) return ''
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl
  return `https://${baseUrl}`
}
