<script setup lang="ts">
const props = defineProps<{ images: string[]; index: number; open: boolean; alt: string }>()
const emit = defineEmits<{ close: []; prev: []; next: [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)
const prevBtn = ref<HTMLButtonElement | null>(null)
const nextBtn = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'ArrowLeft') { emit('prev'); return }
  if (e.key === 'ArrowRight') { emit('next'); return }
  if (e.key === 'Tab') {
    const focusable = [prevBtn.value, nextBtn.value, closeBtn.value].filter(Boolean) as HTMLElement[]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
}

watch(() => props.open, async (v) => {
  if (import.meta.client) {
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) {
      previousFocus = document.activeElement as HTMLElement
      await nextTick()
      closeBtn.value?.focus()
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  }
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      role="dialog"
      aria-modal="true"
      :aria-label="`Xem ảnh ${alt}`"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-night/95 p-4"
      @click.self="emit('close')"
    >
      <!-- Close -->
      <button
        ref="closeBtn"
        type="button"
        @click="emit('close')"
        aria-label="Đóng hộp xem ảnh"
        class="absolute right-4 top-4 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Prev -->
      <button
        ref="prevBtn"
        type="button"
        @click="emit('prev')"
        aria-label="Ảnh trước"
        class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <!-- Image -->
      <NuxtImg
        :src="images[index]"
        :alt="`${alt} - ảnh ${index + 1}`"
        class="max-h-[85vh] max-w-full rounded object-contain motion-safe:transition-opacity motion-safe:duration-200"
      />

      <!-- Next -->
      <button
        ref="nextBtn"
        type="button"
        @click="emit('next')"
        aria-label="Ảnh sau"
        class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <!-- Counter -->
      <p class="absolute bottom-4 left-1/2 -translate-x-1/2 select-none font-sans text-xs tracking-[0.12em] text-silver/60">
        {{ index + 1 }} / {{ images.length }}
      </p>
    </div>
  </Teleport>
</template>
