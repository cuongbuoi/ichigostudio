<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mb-10 max-w-content">
    <h2 class="font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">{{ title }}</h2>
    <p v-if="subtitle" class="mt-3 max-w-[60ch] font-sans text-sm font-light text-silver">{{ subtitle }}</p>
  </div>
</template>
