<script setup lang="ts">
import { nextPollDelay } from '~/utils/checkout-poll'

const shop = useShop()
useSeoMeta({
  title: `Chờ thanh toán - ${shop.name}`,
  robots: 'noindex, nofollow',
})

type Status = 'pending' | 'paid' | 'expired' | 'cancelled' | 'needs_review'
interface CheckoutState {
  id: string
  status: Status
  amount: number
  paymentCode: string
  qrUrl: string
  bank: { bankName: string; account: string; accountName: string }
  expiresAt: string | number
  orderCode: string | null
  isTest: boolean
}

const PENDING_KEY = 'ichigo.pendingCheckout.v1'

const route = useRoute()
const id = String(route.params.id)
const { public: { apiBase } } = useRuntimeConfig()
const { orders, save } = useSavedOrders()
const { clear } = useCart()
const { gtag } = useGtag()

const state = ref<CheckoutState | null>(null)
const notFound = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let stopped = false
let handledPaid = false
/** Đã hết hạn nhưng vẫn đang theo dõi tiền về muộn (hiện dòng báo trên màn hết hạn). */
const watchingLate = ref(false)

function readPending(): { id: string; phone: string } | null {
  try {
    const data = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null')
    return data && typeof data.id === 'string' && typeof data.phone === 'string' ? data : null
  } catch {
    return null
  }
}

// Lần đầu thấy `paid` trên thiết bị đã đặt đơn: lưu đơn, xoá giỏ, bắn purchase.
function onPaid(s: CheckoutState) {
  if (handledPaid) return
  handledPaid = true
  const pending = readPending()
  if (!pending || pending.id !== id || !s.orderCode) return
  if (orders.value.some(o => o.code === s.orderCode)) return
  save({ code: s.orderCode, phone: pending.phone, savedAt: Date.now() })
  clear()
  try { localStorage.removeItem(PENDING_KEY) } catch { /* bỏ qua */ }
  if (!s.isTest) {
    gtag('event', 'purchase', { transaction_id: s.orderCode, currency: 'VND', value: s.amount })
  }
}

async function fetchState() {
  try {
    state.value = await $fetch<CheckoutState>(`${apiBase}/public/checkout/${encodeURIComponent(id)}`)
    notFound.value = false
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status
    if (status === 404 || status === 400) {
      notFound.value = true
      stopped = true
    }
    // lỗi mạng tạm thời: giữ trạng thái cũ, thử lại ở lượt poll sau
  }
  // Tiền về muộn sau khi hết hạn: server vẫn tạo đơn, poll chậm có thể bắt được `paid` ở đây.
  if (state.value?.status === 'paid') onPaid(state.value)
}

function schedule() {
  const delay = stopped ? null : nextPollDelay(state.value?.status ?? null, state.value?.expiresAt, Date.now())
  watchingLate.value = delay !== null && state.value?.status === 'expired'
  if (delay === null) return
  timer = setTimeout(async () => {
    await fetchState()
    schedule()
  }, delay)
}

onMounted(async () => {
  await fetchState()
  schedule()
})
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(timer)
  timer = undefined
})

const btnPrimary = 'inline-flex rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper'
const btnSecondary = 'inline-flex rounded border border-silver/30 px-6 py-3 font-sans text-sm font-medium tracking-wide text-silver transition hover:border-silver/60 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper'
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div v-if="notFound" class="font-sans">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">KHÔNG TÌM THẤY</h1>
      <p class="mt-5 text-sm font-light text-silver">Không tìm thấy đơn này. Bạn kiểm tra lại đường dẫn hoặc nhắn Messenger cho shop.</p>
      <MessengerButton class="mt-5" label="Nhắn Messenger" source="checkout-notfound" />
    </div>

    <div v-else-if="!state" aria-busy="true" aria-label="Đang tải">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">CHỜ THANH TOÁN</h1>
      <div class="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
        <div class="h-[296px] w-full max-w-[296px] animate-pulse rounded bg-panel" />
        <div class="space-y-3">
          <div class="h-6 animate-pulse rounded bg-panel" />
          <div class="h-40 animate-pulse rounded bg-panel" />
        </div>
      </div>
    </div>

    <div v-else-if="state.status === 'pending'">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">CHỜ THANH TOÁN</h1>
      <BankTransferInfo
        class="mt-8"
        :qr-url="state.qrUrl"
        :bank="state.bank"
        :amount="state.amount"
        :payment-code="state.paymentCode"
        :expires-at="state.expiresAt"
      />
    </div>

    <div v-else-if="state.status === 'paid'" class="font-sans" role="status">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">ĐẶT HÀNG THÀNH CÔNG</h1>
      <p class="mt-5 text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Mã đơn</p>
      <p class="mt-1 font-display text-5xl tracking-wide text-hopper-bright md:text-6xl">{{ state.orderCode }}</p>
      <p class="mt-6 text-sm text-paper">Ichigo Studio đã nhận được thanh toán của bạn.</p>
      <p class="mt-2 text-sm text-paper">Shop sẽ liên hệ qua số điện thoại bạn đã để lại để xác nhận đơn và thời gian giao hàng.</p>
      <p class="mt-2 text-sm font-light text-silver">Phí vận chuyển được thanh toán trực tiếp cho đơn vị giao hàng khi bạn nhận hàng.</p>
      <NuxtLink to="/don-hang" :class="[btnPrimary, 'mt-6']">Theo dõi đơn hàng</NuxtLink>
    </div>

    <div v-else-if="state.status === 'needs_review'" class="font-sans" role="status">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">ĐANG KIỂM TRA</h1>
      <p class="mt-5 text-sm font-light text-silver">Shop đã nhận được khoản chuyển và đang kiểm tra đơn của bạn. Cần hỗ trợ, nhắn Messenger cho shop kèm mã này.</p>
      <p class="mt-5 text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Nội dung chuyển khoản</p>
      <p class="mt-1 font-display text-3xl tracking-wide text-hopper-bright md:text-4xl">{{ state.paymentCode }}</p>
      <MessengerButton class="mt-6" label="Nhắn Messenger" source="checkout-review" />
    </div>

    <div v-else class="font-sans" role="status">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">MÃ QR ĐÃ HẾT HẠN</h1>
      <p class="mt-5 text-sm text-paper">Mã QR đã hết hạn.</p>
      <p class="mt-5 max-w-[60ch] text-sm font-light text-silver">
        Nếu bạn đã chuyển khoản đúng nội dung <span class="text-paper">{{ state.paymentCode }}</span>, đơn vẫn được ghi nhận. Cần hỗ trợ, nhắn Messenger cho shop kèm mã này.
      </p>
      <p v-if="watchingLate" class="mt-2 text-sm font-light text-silver">Trang vẫn tự cập nhật nếu tiền về muộn.</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink to="/thanh-toan" :class="btnSecondary">Tạo mã mới</NuxtLink>
        <MessengerButton label="Nhắn Messenger" variant="ghost" source="checkout-expired" />
      </div>
    </div>
  </section>
</template>
