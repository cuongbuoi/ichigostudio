<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'

const shop = useShop()
const href = computed(() => buildMessengerHref(shop.messengerUrl))

// GA4: click nút nổi / bong bóng = lead.
const { gtag } = useGtag()
function track(source: string) {
  gtag('event', 'generate_lead', { method: 'messenger', source })
}

// Bong bóng lời chào: tự hiện sau vài giây, bấm mở Messenger, có nút đóng.
const greeting = `Chat với ${shop.name} nhé!`
const DISMISS_KEY = 'ichigo:greeting-dismissed'
const showBubble = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  // Đã đóng trong phiên này thì không làm phiền lại.
  try {
    if (sessionStorage.getItem(DISMISS_KEY)) return
  } catch {
    // sessionStorage bị chặn -> vẫn hiện bình thường.
  }
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  timer = setTimeout(() => { showBubble.value = true }, reduceMotion ? 0 : 1800)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

function dismiss() {
  showBubble.value = false
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // bỏ qua nếu storage không khả dụng
  }
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
    <Transition name="bubble">
      <div
        v-if="showBubble"
        class="greeting relative max-w-[16rem] rounded-2xl rounded-br-sm border border-silver/15 bg-panel px-4 py-3 pr-9 font-sans text-sm text-paper shadow-lg"
      >
        <a
          :href="href"
          target="_blank"
          rel="noopener noreferrer"
          @click="track('floating-bubble')"
          class="block leading-snug hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright"
        >
          {{ greeting }}
        </a>
        <button
          type="button"
          aria-label="Đóng lời chào"
          class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-silver/70 transition hover:bg-panel2 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright"
          @click="dismiss"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </Transition>

    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Liên hệ qua Messenger"
      @click="track('floating')"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-hopper text-night shadow-lg transition hover:bg-hopper-bright active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright"
    >
      <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/>
      </svg>
    </a>
  </div>
</template>

<style scoped>
/* Đuôi nhỏ chỉ xuống nút chat. */
.greeting::after {
  content: '';
  position: absolute;
  right: 18px;
  bottom: -6px;
  width: 12px;
  height: 12px;
  background: inherit;
  border-right: inherit;
  border-bottom: inherit;
  transform: rotate(45deg);
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .bubble-enter-active,
  .bubble-leave-active {
    transition: none;
  }
}
</style>
