<template>
  <div class="flex min-h-[100dvh] flex-col">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <FloatingContact />
  </div>
</template>
