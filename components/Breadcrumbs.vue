<script setup lang="ts">
// Breadcrumb hiển thị; JSON-LD BreadcrumbList do trang tự khai (cùng danh sách items).
// Mục cuối là trang hiện tại (không link, aria-current).
defineProps<{ items: { name: string; to?: string }[] }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-sm text-silver">
      <li v-for="(item, i) in items" :key="i" class="inline-flex min-w-0 items-center gap-1.5">
        <svg v-if="i > 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3 shrink-0 text-silver/50" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        <NuxtLink
          v-if="item.to && i < items.length - 1"
          :to="item.to"
          class="rounded transition hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >{{ item.name }}</NuxtLink>
        <span v-else aria-current="page" class="truncate text-silver/70">{{ item.name }}</span>
      </li>
    </ol>
  </nav>
</template>
