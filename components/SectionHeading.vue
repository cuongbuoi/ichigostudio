<script setup lang="ts">
// as="h1" khi đây là tiêu đề chính của trang (listing); mặc định h2 cho các section.
withDefaults(defineProps<{ title: string; subtitle?: string; as?: 'h1' | 'h2' }>(), { as: 'h2' })
</script>

<template>
  <div class="mb-10 max-w-content">
    <component :is="as" class="font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">{{ title }}</component>
    <p v-if="subtitle" class="mt-3 max-w-[60ch] font-sans text-sm font-light text-silver">{{ subtitle }}</p>
  </div>
</template>
