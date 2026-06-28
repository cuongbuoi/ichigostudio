<script setup lang="ts">
const colorMode = useColorMode()
function toggle() { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }
</script>

<template>
  <button
    type="button" @click="toggle"
    class="rounded-full p-2 text-ink/70 transition hover:text-ink dark:text-bone/70 dark:hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    :aria-label="colorMode.value === 'dark' ? 'Chuyen nen sang' : 'Chuyen nen toi'"
  >
    <span v-if="colorMode.value === 'dark'">&#9675;</span>
    <span v-else>&#9679;</span>
  </button>
</template>
