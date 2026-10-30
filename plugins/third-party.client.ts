import { injectContentsquareScript } from '@contentsquare/tag-sdk'

// Contentsquare + gtag.js (~350 KB, ~0,5s CPU trên mobile) nạp sau khi trang tải xong
// và trình duyệt rảnh, hoặc ngay khi khách tương tác đầu tiên, để không tranh CPU
// với hydration. Lệnh gtag() gọi trước đó nằm chờ trong dataLayer, gtag.js đọc lại khi nạp.
// Hậu tố `.client`: tag cần `document`/`window`, không chạy lúc SSR.
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
const AFTER_LOAD_DELAY_MS = 3000

export default defineNuxtPlugin((nuxtApp) => {
  const { initialize } = useGtag()
  let loaded = false

  const load = () => {
    if (loaded) return
    loaded = true
    for (const name of INTERACTION_EVENTS) window.removeEventListener(name, load)
    // initialize() gọi useHead nên cần ngữ cảnh Nuxt.
    nuxtApp.runWithContext(() => initialize())
    injectContentsquareScript({ clientId: '462acf6f060ad' })
  }

  for (const name of INTERACTION_EVENTS) window.addEventListener(name, load, { once: true, passive: true })

  const scheduleIdle = () =>
    setTimeout(() => {
      if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 })
      else load()
    }, AFTER_LOAD_DELAY_MS)
  if (document.readyState === 'complete') scheduleIdle()
  else window.addEventListener('load', scheduleIdle, { once: true })
})
