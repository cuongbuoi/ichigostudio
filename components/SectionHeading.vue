<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mb-10 max-w-content">
    <h2 class="font-display text-3xl md:text-4xl tracking-tight leading-tight">{{ title }}</h2>
    <p v-if="subtitle" class="mt-3 max-w-[60ch] text-ink/60 dark:text-bone/60">{{ subtitle }}</p>
  </div>
</template>
