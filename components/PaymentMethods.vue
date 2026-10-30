<script setup lang="ts">
// Hiển thị phương thức thanh toán shop nhận (giảm ma sát "trả trước").
withDefaults(defineProps<{ label?: string }>(), { label: 'Thanh toán' })
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="font-sans text-[10px] uppercase tracking-[0.12em] text-silver/70">{{ label }}</span>
    <!-- MoMo -->
    <span class="inline-flex items-center gap-1.5 rounded border border-paper/10 bg-panel/60 px-2.5 py-1 font-sans text-xs text-paper">
      <span class="inline-block h-3.5 w-3.5 rounded-[4px] bg-[#a50064]" aria-hidden="true" />
      MoMo
    </span>
    <!-- Chuyển khoản QR -->
    <span class="inline-flex items-center gap-1.5 rounded border border-paper/10 bg-panel/60 px-2.5 py-1 font-sans text-xs text-paper">
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-hopper" fill="currentColor" aria-hidden="true">
        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v5h-5v-2h3v-3zm-6 0h2v2h-2v-2z"/>
      </svg>
      Chuyển khoản QR
    </span>
  </div>
</template>
