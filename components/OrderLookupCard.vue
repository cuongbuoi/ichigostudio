<script setup lang="ts">
import { CUSTOMER_STATUS_LABELS } from '~/utils/order-status'
import { formatPrice } from '~/utils/products'

export interface LookupOrder {
  code: string
  createdAt: string | number
  status: string
  paymentStatus?: string
  total: number
  items: { title: string; qty: number; unitPrice: number }[]
  carrier: string | null
  trackingCode: string | null
}

const props = defineProps<{ order: LookupOrder }>()

const statusLabel = computed(() => CUSTOMER_STATUS_LABELS[props.order.status] ?? props.order.status)
const dateLabel = computed(() => {
  const d = new Date(props.order.createdAt)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN')
})
</script>

<template>
  <article class="rounded border border-paper/10 bg-panel p-5">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-display text-xl tracking-wide text-paper">{{ order.code }}</h3>
      <span class="rounded border border-hopper/40 px-2 py-0.5 font-sans text-xs uppercase tracking-[0.1em] text-hopper-bright">{{ statusLabel }}</span>
    </header>
    <p v-if="dateLabel" class="mt-1 font-sans text-xs font-light text-silver">Ngày đặt: {{ dateLabel }}</p>
    <ul class="mt-4 divide-y divide-paper/10 border-y border-paper/10 font-sans text-sm">
      <li v-for="(it, i) in order.items" :key="i" class="flex justify-between gap-4 py-2">
        <span class="text-paper">{{ it.title }} &times; {{ it.qty }}</span>
        <span class="shrink-0 text-silver">{{ formatPrice(it.unitPrice * it.qty) }}</span>
      </li>
    </ul>
    <p class="mt-3 flex items-baseline justify-between font-sans">
      <span class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Tổng</span>
      <span class="text-lg text-paper">{{ formatPrice(order.total) }}</span>
    </p>
    <p v-if="order.carrier || order.trackingCode" class="mt-3 font-sans text-sm font-light text-silver">
      <template v-if="order.carrier">Hãng vận chuyển: <span class="text-paper">{{ order.carrier }}</span></template>
      <template v-if="order.carrier && order.trackingCode">. </template>
      <template v-if="order.trackingCode">Mã vận đơn: <span class="text-paper">{{ order.trackingCode }}</span></template>
    </p>
  </article>
</template>
