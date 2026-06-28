<script setup lang="ts">
const props = defineProps<{ images: string[]; alt: string }>()

const current = ref(0)
const lightbox = ref(false)

function select(i: number) {
  current.value = i
}
function open() {
  lightbox.value = true
}
function close() {
  lightbox.value = false
}
function prev() {
  current.value = (current.value - 1 + props.images.length) % props.images.length
}
function next() {
  current.value = (current.value + 1) % props.images.length
}
</script>

<template>
  <div>
    <button
      type="button"
      @click="open"
      aria-label="Phong to anh san pham"
      class="block w-full overflow-hidden rounded-2xl bg-ink/5 dark:bg-bone/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <NuxtImg
        :src="images[current]"
        :alt="alt"
        width="900"
        height="1125"
        class="aspect-[4/5] w-full object-cover motion-safe:transition-opacity motion-safe:duration-200"
      />
    </button>

    <div class="mt-3 flex gap-3 overflow-x-auto pb-1" role="list" aria-label="Anh san pham">
      <button
        v-for="(img, i) in images"
        :key="i"
        type="button"
        role="listitem"
        @click="select(i)"
        :aria-label="`Xem anh ${i + 1}`"
        :aria-current="i === current ? 'true' : undefined"
        :class="[
          'h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
          i === current
            ? 'border-accent'
            : 'border-transparent opacity-70 hover:opacity-100',
        ]"
      >
        <NuxtImg
          :src="img"
          :alt="`${alt} - anh ${i + 1}`"
          width="120"
          height="150"
          class="h-full w-full object-cover"
        />
      </button>
    </div>

    <Lightbox
      :images="images"
      :index="current"
      :open="lightbox"
      :alt="alt"
      @close="close"
      @prev="prev"
      @next="next"
    />
  </div>
</template>
