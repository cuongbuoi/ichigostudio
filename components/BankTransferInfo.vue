<script setup lang="ts">
import { formatPrice } from '~/utils/products'

const props = defineProps<{
  qrUrl: string
  bank: { bankName: string; account: string; accountName: string }
  amount: number
  paymentCode: string
  expiresAt: string | number
}>()

// Chỉ tính đồng hồ sau khi mount để SSR và client không lệch giờ.
const mounted = ref(false)
const now = ref(0)
let tick: ReturnType<typeof setInterval> | undefined

const remainingMs = computed(() => Math.max(0, new Date(props.expiresAt).getTime() - now.value))
const countdown = computed(() => {
  if (!mounted.value) return '--:--'
  const total = Math.floor(remainingMs.value / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
})
const expiredLocal = computed(() => mounted.value && remainingMs.value <= 0)

onMounted(() => {
  now.value = Date.now()
  mounted.value = true
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})

const copied = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = null }, 2000)
  } catch {
    // trình duyệt chặn clipboard: khách tự chép tay
  }
}

onBeforeUnmount(() => {
  clearInterval(tick)
  clearTimeout(copiedTimer)
})

const copyBtn = 'shrink-0 rounded border border-paper/30 px-3 py-1 font-sans text-xs uppercase tracking-[0.1em] text-paper transition hover:border-paper/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper'
</script>

<template>
  <div class="grid gap-8 md:grid-cols-[280px_1fr]">
    <div>
      <div class="inline-block rounded bg-paper p-2">
        <img :src="qrUrl" alt="Mã QR chuyển khoản" width="280" height="280" class="block h-auto w-[280px] max-w-full" />
      </div>
      <p class="mt-3 font-sans text-sm text-silver">
        Còn lại:
        <span class="text-paper" :class="expiredLocal ? 'opacity-60' : ''">{{ countdown }}</span>
      </p>
      <p v-if="expiredLocal" class="mt-1 font-sans text-xs font-light text-silver" aria-live="polite">
        Mã QR đã quá hạn hiển thị. Nếu bạn đã chuyển khoản đúng nội dung, đơn vẫn được ghi nhận.
      </p>
    </div>

    <div>
      <p class="font-sans text-sm font-light leading-relaxed text-silver">
        Mở app ngân hàng, quét mã. Nếu chuyển tay, ghi đúng nội dung <span class="text-paper">{{ paymentCode }}</span>, không thêm bớt.
      </p>

      <dl class="mt-6 divide-y divide-paper/10 border-y border-paper/10 font-sans">
        <div class="flex items-center justify-between gap-4 py-3">
          <dt class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Ngân hàng</dt>
          <dd class="text-sm text-paper">{{ bank.bankName }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <dt class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Số tài khoản</dt>
          <dd class="flex items-center gap-3 text-sm text-paper">
            {{ bank.account }}
            <button type="button" :class="copyBtn" aria-label="Sao chép số tài khoản" @click="copy('account', bank.account)">{{ copied === 'account' ? 'Đã chép' : 'Sao chép' }}</button>
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <dt class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Chủ tài khoản</dt>
          <dd class="text-sm text-paper">{{ bank.accountName }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-3">
          <dt class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Số tiền</dt>
          <dd class="flex items-center gap-3 text-sm text-paper">
            {{ formatPrice(amount) }}
            <button type="button" :class="copyBtn" aria-label="Sao chép số tiền" @click="copy('amount', String(amount))">{{ copied === 'amount' ? 'Đã chép' : 'Sao chép' }}</button>
          </dd>
        </div>
        <div class="py-4">
          <dt class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Nội dung chuyển khoản</dt>
          <dd class="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span class="font-display text-3xl tracking-wide text-hopper-bright md:text-4xl">{{ paymentCode }}</span>
            <button type="button" :class="copyBtn" aria-label="Sao chép nội dung chuyển khoản" @click="copy('code', paymentCode)">{{ copied === 'code' ? 'Đã chép' : 'Sao chép' }}</button>
          </dd>
        </div>
      </dl>

      <p class="mt-4 font-sans text-sm font-light text-silver">Giá chưa bao gồm phí vận chuyển. Phí vận chuyển được thanh toán khi nhận hàng.</p>
      <p class="mt-2 font-sans text-sm font-light text-silver">Trang tự cập nhật khi shop nhận được tiền.</p>
      <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Đã chép' : '' }}</span>
    </div>
  </div>
</template>
