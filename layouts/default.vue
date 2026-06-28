<template>
  <div class="flex min-h-[100dvh] flex-col bg-night">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <FloatingContact />
    <div class="grain-overlay" aria-hidden="true" />
  </div>
</template>

<style scoped>
.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
  user-select: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 3px
  );
  opacity: 1;
}
@media (prefers-reduced-transparency: reduce) {
  .grain-overlay { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .grain-overlay { display: none; }
}
</style>
