<script setup lang="ts">
const props = defineProps<{ images: string[]; alt: string }>()
const { shop } = useAppConfig()

const current = ref(0)
const lightbox = ref(false)

function select(i: number) { current.value = i }
function open() { lightbox.value = true }
function close() { lightbox.value = false }
function prev() { current.value = (current.value - 1 + props.images.length) % props.images.length }
function next() { current.value = (current.value + 1) % props.images.length }
</script>

<template>
  <div>
    <!-- Main image / placeholder -->
    <button
      type="button"
      @click="open"
      aria-label="Phóng to ảnh sản phẩm"
      class="block w-full overflow-hidden rounded bg-panel border border-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
    >
      <template v-if="shop.hasPhotos">
        <NuxtImg
          :src="images[current]"
          :alt="`${alt} - phụ kiện in 3D`"
          width="900"
          class="aspect-square w-full object-contain motion-safe:transition-opacity motion-safe:duration-200"
        />
      </template>
      <template v-else>
        <FigurePlaceholder
          :label="alt"
          ratio="1/1"
          :seed="current"
        />
      </template>
    </button>

    <!-- Thumbnails -->
    <div class="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" :aria-label="`Ảnh ${alt}`">
      <button
        v-for="(img, i) in images"
        :key="i"
        type="button"
        role="listitem"
        @click="select(i)"
        :aria-label="`Xem ảnh ${i + 1} của ${alt}`"
        :aria-current="i === current ? 'true' : undefined"
        :class="[
          'h-16 w-16 shrink-0 overflow-hidden rounded border-2 bg-panel transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-hopper',
          i === current
            ? 'border-hopper'
            : 'border-transparent opacity-60 hover:opacity-90',
        ]"
      >
        <template v-if="shop.hasPhotos">
          <NuxtImg
            :src="img"
            :alt="`${alt} - ảnh ${i + 1}`"
            width="120"
            class="h-full w-full object-contain"
          />
        </template>
        <template v-else>
          <FigurePlaceholder
            :label="`${i + 1}`"
            ratio="1/1"
            :seed="i"
          />
        </template>
      </button>
    </div>

    <Lightbox
      :images="images"
      :index="current"
      :open="lightbox"
      :alt="alt"
      :has-photos="shop.hasPhotos"
      @close="close"
      @prev="prev"
      @next="next"
    />
  </div>
</template>
