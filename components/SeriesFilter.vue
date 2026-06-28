<script setup lang="ts">
const props = defineProps<{ series: string[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const options = computed(() => ['all', ...props.series])
function label(s: string) { return s === 'all' ? 'Tất cả' : s }
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button v-for="s in options" :key="s" type="button"
      @click="emit('update:modelValue', s)"
      :aria-pressed="modelValue === s"
      :class="[
        'rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        modelValue === s
          ? 'border-accent bg-accent text-white'
          : 'border-ink/15 text-ink/70 hover:border-ink/40 dark:border-bone/20 dark:text-bone/70',
      ]">
      {{ label(s) }}
    </button>
  </div>
</template>
