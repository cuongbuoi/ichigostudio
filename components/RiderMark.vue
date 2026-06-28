<script setup lang="ts">
// Logo: mũ Kamen Rider Ichigo nhìn ngang (mặt hướng trái).
// Motif châu chấu: 2 râu kép cong về sau, mắt kép lớn nghiêng, miệng crusher.
// Mắt dùng accent hopper để khớp bảng màu.
withDefaults(defineProps<{ title?: string }>(), {
  title: 'Mũ Kamen Rider Ichigo - logo Ichigo Studio',
})
</script>

<template>
  <svg viewBox="0 0 60 52" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="title">
    <!-- Râu châu chấu (antennae): 2 feeler dài cong lên và ra sau -->
    <path d="M21 14 C 25 5 34 1 43 3" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" />
    <path d="M24 16 C 29 8 37 6 46 8" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" />
    <!-- Vòm mũ (helmet): trán nhô phía trước (trái), gáy bo phía sau -->
    <path
      d="M19 42
         C 12.5 37 12.5 24 19.5 17
         C 25 11 38 11 45 19
         C 50 25 48.5 37 41 42
         C 38 44 33 44 29 44
         L 22 44
         C 20.4 44 19.7 43.5 19 42 Z"
      fill="currentColor"
    />
    <!-- Mắt kép (compound eye): lớn, nghiêng về trước -->
    <path d="M18.5 28 C 20.5 21 30 19.5 34.5 26 C 31.5 32 21 32 18.5 28 Z" fill="#76b02f" />
    <path d="M21.5 25 C 23.5 22.8 27 22.6 29.5 24" stroke="#0e0f0c" stroke-width="1.1" stroke-linecap="round" opacity="0.4" />
    <!-- Sống mày (brow) tạo khối mũ -->
    <path d="M17.5 21 C 22 17.5 30 17 35.5 20.5" stroke="#0e0f0c" stroke-width="1.4" stroke-linecap="round" opacity="0.28" />
    <!-- Miệng crusher (mouth grille) phía trước dưới -->
    <g stroke="#0e0f0c" stroke-width="1.4" stroke-linecap="round">
      <line x1="18" y1="35" x2="18" y2="42.5" />
      <line x1="20.6" y1="36" x2="20.6" y2="43.4" />
      <line x1="23.2" y1="36.2" x2="23.2" y2="43.6" />
    </g>
  </svg>
</template>
