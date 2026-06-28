<script setup lang="ts">
const props = defineProps<{ images: string[]; index: number; open: boolean; alt: string }>()
const emit = defineEmits<{ close: []; prev: []; next: [] }>()

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

watch(() => props.open, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh sản phẩm"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4"
      @click.self="emit('close')"
    >
      <button
        type="button"
        @click="emit('close')"
        aria-label="Đóng"
        class="absolute right-4 top-4 rounded-full p-3 text-bone/80 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <button
        type="button"
        @click="emit('prev')"
        aria-label="Ảnh trước"
        class="absolute left-4 rounded-full p-3 text-bone/80 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <NuxtImg
        :src="images[index]"
        :alt="`${alt} - ảnh ${index + 1}`"
        class="max-h-[85vh] max-w-full rounded-lg object-contain motion-safe:transition-opacity motion-safe:duration-200"
      />

      <button
        type="button"
        @click="emit('next')"
        aria-label="Ảnh sau"
        class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-3 text-bone/80 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <p class="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-bone/60 select-none">
        {{ index + 1 }} / {{ images.length }}
      </p>
    </div>
  </Teleport>
</template>
