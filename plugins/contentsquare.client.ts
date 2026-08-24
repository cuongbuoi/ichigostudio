import { injectContentsquareScript } from '@contentsquare/tag-sdk'

// Hậu tố `.client` giữ plugin chỉ chạy ở browser: tag của Contentsquare cần
// `document`/`window` nên tuyệt đối không được nạp trong lúc SSR.
export default defineNuxtPlugin(() => {
  injectContentsquareScript({ clientId: '462acf6f060ad' })
})
