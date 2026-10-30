<script setup lang="ts">
import type { CategoryRef } from '~/utils/products'
const props = defineProps<{ categories: CategoryRef[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const options = computed(() => [{ name: 'Tất cả', slug: 'all' }, ...props.categories])
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="c in options"
      :key="c.slug"
      type="button"
      @click="emit('update:modelValue', c.slug)"
      :aria-pressed="modelValue === c.slug"
      :class="[
        'font-sans text-xs font-medium uppercase tracking-[0.1em] border px-4 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded-sm',
        modelValue === c.slug
          ? 'border-hopper bg-hopper text-night'
          : 'border-silver/20 text-silver hover:border-silver/50 hover:text-paper',
      ]"
    >{{ c.name }}</button>
  </div>
</template>
