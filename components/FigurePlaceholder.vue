<!-- components/FigurePlaceholder.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  ratio?: string
  seed?: string | number
}>(), {
  ratio: '4/5',
  seed: 0,
})

// Vary the compound-eye position/rotation slightly per seed.
// Hash seed to a stable number so it works for both string and number seeds.
const seedNum = computed(() => {
  if (typeof props.seed === 'number') return props.seed
  let h = 0
  for (let i = 0; i < props.seed.length; i++) {
    h = (Math.imul(31, h) + props.seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
})

const eyeTranslateX = computed(() => ((seedNum.value % 7) - 3) * 3)  // -9 to +9 px
const eyeTranslateY = computed(() => (((seedNum.value >> 4) % 7) - 3) * 3)
const eyeRotate    = computed(() => ((seedNum.value >> 8) % 30) - 15)  // -15 to +15 deg
</script>

<template>
  <div
    class="relative w-full overflow-hidden rounded border border-paper/10 bg-panel2"
    :style="{
      aspectRatio: ratio,
      backgroundImage: `
        radial-gradient(circle, rgba(92,138,36,0.08) 1px, transparent 1px),
        repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 28px,
          rgba(200,204,196,0.025) 28px,
          rgba(200,204,196,0.025) 29px
        )
      `,
      backgroundSize: '10px 10px, 100% 100%',
    }"
    aria-hidden="true"
  >
    <!-- Compound-eye SVG motif (faceted hexagonal insect-eye) -->
    <svg
      class="pointer-events-none"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :style="{
        width: '40%',
        height: '40%',
        top: '30%',
        left: '30%',
        position: 'absolute',
        opacity: 0.18,
        transform: `translate(${eyeTranslateX}px, ${eyeTranslateY}px) rotate(${eyeRotate}deg)`,
      }"
      aria-hidden="true"
    >
      <g fill="#5c8a24">
        <!-- Center column -->
        <polygon points="60,10 73,17 73,33 60,40 47,33 47,17"/>
        <polygon points="60,42 73,49 73,65 60,72 47,65 47,49"/>
        <polygon points="60,74 73,81 73,97 60,104 47,97 47,81"/>
        <!-- Left column -->
        <polygon points="28,26 41,33 41,49 28,56 15,49 15,33"/>
        <polygon points="28,58 41,65 41,81 28,88 15,81 15,65"/>
        <!-- Right column -->
        <polygon points="92,26 105,33 105,49 92,56 79,49 79,33"/>
        <polygon points="92,58 105,65 105,81 92,88 79,81 79,65"/>
      </g>
    </svg>

    <!-- Caption area -->
    <div class="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2">
      <p class="font-sans text-[9px] font-medium uppercase tracking-[0.18em] text-silver/50">ẢNH FIGURE</p>
      <p v-if="label" class="mt-0.5 font-sans text-[9px] font-light uppercase tracking-[0.12em] text-silver/40 truncate">{{ label }}</p>
    </div>
  </div>
</template>
