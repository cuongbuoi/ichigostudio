<script setup lang="ts">
const props = defineProps<{ series: string[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const options = computed(() => ['all', ...props.series])
function label(s: string) { return s === 'all' ? 'Tat ca' : s }
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="s in options"
      :key="s"
      type="button"
      @click="emit('update:modelValue', s)"
      :aria-pressed="modelValue === s"
      :class="[
        'font-sans text-xs font-medium uppercase tracking-[0.1em] border px-4 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded-sm',
        modelValue === s
          ? 'border-hopper bg-hopper text-night'
          : 'border-silver/20 text-silver hover:border-silver/50 hover:text-paper',
      ]"
    >{{ label(s) }}</button>
  </div>
</template>
