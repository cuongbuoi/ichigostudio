<script setup lang="ts">
import type { LookupOrder } from '~/components/OrderLookupCard.vue'
import { isValidVnPhone, normalizePhone } from '~/utils/phone'

const shop = useShop()
useSeoMeta({
  title: `Đơn của bạn - ${shop.name}`,
  robots: 'noindex, nofollow',
})

type LookupResult =
  | { kind: 'ok'; order: LookupOrder }
  | { kind: 'not_found' }
  | { kind: 'rate_limited' }
  | { kind: 'error' }

const RATE_LIMIT_MSG = 'Bạn thử quá nhiều lần. Vui lòng thử lại sau ít phút.'

const { public: { apiBase } } = useRuntimeConfig()
const { orders, save, remove } = useSavedOrders()

async function lookup(code: string, phone: string): Promise<LookupResult> {
  try {
    const order = await $fetch<LookupOrder>(`${apiBase}/public/orders/lookup`, {
      method: 'POST',
      body: { code, phone },
    })
    return { kind: 'ok', order }
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    if (status === 404) return { kind: 'not_found' }
    if (status === 429) return { kind: 'rate_limited' }
    return { kind: 'error' }
  }
}

// Đơn đã lưu: tra tuần tự, gặp 429 thì dừng hẳn.
const savedResults = ref<Record<string, LookupResult | 'loading'>>({})
const rateLimited = ref(false)
const loadingSaved = ref(false)

async function loadSaved() {
  loadingSaved.value = true
  for (const o of [...orders.value]) {
    if (rateLimited.value) break
    if (savedResults.value[o.code]) continue
    savedResults.value[o.code] = 'loading'
    const res = await lookup(o.code, o.phone)
    if (res.kind === 'rate_limited') {
      rateLimited.value = true
      delete savedResults.value[o.code]
      break
    }
    savedResults.value[o.code] = res
  }
  loadingSaved.value = false
}

// Đăng ký sau useSavedOrders nên orders đã nạp từ localStorage lúc chạy.
onMounted(loadSaved)

function removeSaved(code: string) {
  remove(code)
  delete savedResults.value[code]
}

// Form tra cứu
const code = ref('')
const phone = ref('')
const submitting = ref(false)
const formError = ref('')
const result = ref<LookupOrder | null>(null)

async function onSubmit() {
  formError.value = ''
  result.value = null
  const c = code.value.trim().toUpperCase()
  if (!c) { formError.value = 'Vui lòng nhập mã đơn.'; return }
  if (!isValidVnPhone(phone.value)) { formError.value = 'Số điện thoại chưa đúng.'; return }
  const p = normalizePhone(phone.value)
  submitting.value = true
  const res = await lookup(c, p)
  submitting.value = false
  if (res.kind === 'ok') {
    result.value = res.order
    savedResults.value[res.order.code] = res
    save({ code: res.order.code, phone: p, savedAt: Date.now() })
  } else if (res.kind === 'not_found') {
    formError.value = 'Không tìm thấy đơn khớp mã và số điện thoại.'
  } else if (res.kind === 'rate_limited') {
    formError.value = RATE_LIMIT_MSG
  } else {
    formError.value = 'Không tra cứu được lúc này. Vui lòng thử lại sau.'
  }
}

const inputClass = 'mt-2 w-full rounded border border-paper/20 bg-panel2 px-4 py-3 font-sans text-sm text-paper placeholder:text-silver/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper'
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">ĐƠN CỦA BẠN</h1>

    <div class="mt-8">
      <p v-if="rateLimited" class="font-sans text-sm text-paper" role="status">{{ RATE_LIMIT_MSG }}</p>
      <p v-if="!orders.length" class="font-sans text-sm font-light text-silver">Chưa có đơn nào trên thiết bị này. Bạn có thể tra cứu bằng mã đơn và số điện thoại bên dưới.</p>
      <ul v-else class="mt-4 grid gap-4 md:grid-cols-2">
        <li v-for="o in orders" :key="o.code">
          <div v-if="savedResults[o.code] === 'loading'" class="h-40 animate-pulse rounded bg-panel" aria-busy="true" :aria-label="`Đang tải đơn ${o.code}`" />
          <OrderLookupCard v-else-if="savedResults[o.code] && (savedResults[o.code] as LookupResult).kind === 'ok'" :order="(savedResults[o.code] as any).order" />
          <div v-else-if="savedResults[o.code]" class="rounded border border-paper/10 bg-panel p-5">
            <h3 class="font-display text-xl tracking-wide text-paper">{{ o.code }}</h3>
            <p class="mt-2 font-sans text-sm text-silver">Không tải được</p>
            <button
              type="button"
              class="mt-3 rounded border border-paper/30 px-4 py-2 font-sans text-xs uppercase tracking-[0.1em] text-paper transition hover:border-paper/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
              @click="removeSaved(o.code)"
            >Bỏ khỏi danh sách</button>
          </div>
          <div v-else class="rounded border border-paper/10 bg-panel p-5">
            <h3 class="font-display text-xl tracking-wide text-paper">{{ o.code }}</h3>
            <p class="mt-2 font-sans text-sm text-silver">Chưa tải</p>
          </div>
        </li>
      </ul>
    </div>

    <div class="mt-14 max-w-xl">
      <h2 class="font-display text-2xl uppercase leading-[1.5] tracking-tight text-paper">TRA CỨU ĐƠN</h2>
      <form class="mt-4" novalidate @submit.prevent="onSubmit">
        <label class="block font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-silver">
          Mã đơn
          <input v-model="code" type="text" autocomplete="off" autocapitalize="characters" placeholder="VD: DH-0001" :class="inputClass" />
        </label>
        <label class="mt-4 block font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-silver">
          Số điện thoại đặt hàng
          <input v-model="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0901 234 567" :class="inputClass" />
        </label>
        <p v-if="formError" class="mt-3 font-sans text-sm text-paper" role="alert">{{ formError }}</p>
        <button
          type="submit"
          :disabled="submitting"
          class="mt-5 inline-flex rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >{{ submitting ? 'Đang tra cứu...' : 'Tra cứu' }}</button>
      </form>
      <div v-if="result" class="mt-6" aria-live="polite">
        <OrderLookupCard :order="result" />
      </div>
    </div>

    <div class="mt-14">
      <p class="font-sans text-sm font-light text-silver">Cần hỗ trợ về đơn hàng?</p>
      <div class="mt-3"><MessengerButton variant="ghost" label="Nhắn tin cho shop" source="orders" /></div>
    </div>
  </section>
</template>
