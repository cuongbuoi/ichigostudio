<script setup lang="ts">
import { formatPrice } from '~/utils/products'
import { isValidVnPhone, normalizePhone } from '~/utils/phone'

const shop = useShop()
useSeoMeta({
  title: `Thanh toán - ${shop.name}`,
  robots: 'noindex, nofollow',
})

const { public: { apiBase } } = useRuntimeConfig()
const { entries, resolved, ready, blockedIds } = useCartView()
const { testMode, testKey } = useCheckoutConfig()
const { gtag } = useGtag()

const form = reactive({ name: '', phone: '', address: '', note: '' })
const errors = reactive({ name: '', phone: '', address: '' })
const submitting = ref(false)
const submitError = ref('')

const canSubmit = computed(() => resolved.value.lines.length > 0 && resolved.value.unavailable.length === 0)

// GA4 begin_checkout: một lần khi đã có dòng hợp lệ.
let tracked = false
watch(() => resolved.value.lines.length, (n) => {
  if (!ready.value || tracked || n === 0) return
  tracked = true
  gtag('event', 'begin_checkout', {
    currency: 'VND',
    value: resolved.value.subtotal,
    items: resolved.value.lines.map(l => ({ item_id: l.id, item_name: l.title, price: l.price, quantity: l.qty })),
  })
}, { immediate: true })

function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Vui lòng nhập họ tên.'
  errors.phone = isValidVnPhone(form.phone) ? '' : 'Số điện thoại chưa đúng, ví dụ 0901234567.'
  errors.address = form.address.trim().length >= 5 ? '' : 'Vui lòng nhập địa chỉ nhận hàng đầy đủ (ít nhất 5 ký tự).'
  return !errors.name && !errors.phone && !errors.address
}

interface CheckoutResponse { id: string }

async function onSubmit() {
  submitError.value = ''
  if (!canSubmit.value || submitting.value || !validate()) return
  submitting.value = true
  const phone = normalizePhone(form.phone)
  try {
    const res = await $fetch<CheckoutResponse>(`${apiBase}/public/checkout`, {
      method: 'POST',
      body: {
        items: entries.value,
        name: form.name.trim(),
        phone,
        address: form.address.trim(),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
        ...(testMode.value && testKey.value ? { testKey: testKey.value } : {}),
      },
    })
    try {
      localStorage.setItem('ichigo.pendingCheckout.v1', JSON.stringify({ id: res.id, phone }))
    } catch {
      // storage bị chặn: trang chờ vẫn chạy, chỉ không lưu được đơn trên máy
    }
    await navigateTo(`/thanh-toan/${res.id}`)
  } catch (err: any) {
    const status: number | undefined = err?.statusCode ?? err?.status ?? err?.response?.status
    if (status === 409) {
      const ids: string[] = err?.data?.productIds ?? []
      blockedIds.value = [...new Set([...blockedIds.value, ...ids])]
      await navigateTo('/gio-hang')
      return
    }
    submitError.value = status === 429
      ? 'Bạn thao tác hơi nhanh, thử lại sau ít phút.'
      : 'Chưa tạo được mã thanh toán. Bạn thử lại hoặc nhắn Messenger cho shop.'
  } finally {
    submitting.value = false
  }
}

const inputCls = 'mt-2 w-full rounded border border-paper/20 bg-panel px-4 py-3 font-sans text-sm text-paper placeholder:text-silver/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper'
const labelCls = 'block text-[10px] font-medium uppercase tracking-[0.15em] text-silver'
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">THANH TOÁN</h1>

    <div v-if="!ready" class="mt-8 space-y-3" aria-busy="true" aria-label="Đang tải">
      <div class="h-24 animate-pulse rounded bg-panel" />
      <div class="h-24 animate-pulse rounded bg-panel" />
    </div>

    <div v-else-if="entries.length === 0" class="mt-8">
      <p class="font-sans text-sm font-light text-silver">Giỏ hàng của bạn đang trống.</p>
      <NuxtLink
        to="/san-pham"
        class="mt-5 inline-flex rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >Xem sản phẩm</NuxtLink>
    </div>

    <div v-else class="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <form novalidate class="space-y-6" @submit.prevent="onSubmit">
        <div>
          <label for="co-name" :class="labelCls">Họ tên</label>
          <input id="co-name" v-model="form.name" maxlength="100" type="text" autocomplete="name" required :aria-invalid="!!errors.name" aria-describedby="co-name-err" :class="inputCls" />
          <p id="co-name-err" class="mt-1 font-sans text-xs text-paper" aria-live="polite">{{ errors.name }}</p>
        </div>
        <div>
          <label for="co-phone" :class="labelCls">Số điện thoại</label>
          <input id="co-phone" v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" required :aria-invalid="!!errors.phone" aria-describedby="co-phone-err" :class="inputCls" />
          <p id="co-phone-err" class="mt-1 font-sans text-xs text-paper" aria-live="polite">{{ errors.phone }}</p>
        </div>
        <div>
          <label for="co-address" :class="labelCls">Địa chỉ nhận hàng</label>
          <textarea id="co-address" v-model="form.address" maxlength="300" rows="3" autocomplete="street-address" required :aria-invalid="!!errors.address" aria-describedby="co-address-err" :class="inputCls" />
          <p id="co-address-err" class="mt-1 font-sans text-xs text-paper" aria-live="polite">{{ errors.address }}</p>
        </div>
        <div>
          <label for="co-note" :class="labelCls">Ghi chú (tùy chọn)</label>
          <textarea id="co-note" v-model="form.note" maxlength="500" rows="2" :class="inputCls" />
        </div>

        <div aria-live="polite">
          <div v-if="submitError" class="rounded border border-paper/20 bg-panel p-4">
            <p class="font-sans text-sm text-paper">{{ submitError }}</p>
            <MessengerButton class="mt-3" label="Nhắn Messenger" variant="ghost" source="checkout-error" />
          </div>
        </div>

        <p v-if="resolved.unavailable.length" class="font-sans text-sm text-paper" aria-live="polite">
          Giỏ còn sản phẩm không còn bán.
          <NuxtLink to="/gio-hang" class="text-hopper underline underline-offset-4 hover:text-hopper-bright">Quay lại giỏ</NuxtLink>
        </p>

        <button
          type="submit"
          :disabled="!canSubmit || submitting"
          class="flex w-full justify-center rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper md:w-auto"
        >{{ submitting ? 'Đang tạo mã...' : 'Thanh toán bằng QR' }}</button>
      </form>

      <aside class="h-fit rounded border border-paper/10 bg-panel p-6">
        <h2 class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Tóm tắt đơn</h2>
        <ul class="mt-4 space-y-3 font-sans text-sm">
          <li v-for="line in resolved.lines" :key="line.id" class="flex justify-between gap-4 text-paper">
            <span class="min-w-0">{{ line.title }} <span class="text-silver">x{{ line.qty }}</span></span>
            <span class="shrink-0">{{ formatPrice(line.lineTotal) }}</span>
          </li>
        </ul>
        <div class="mt-4 flex items-baseline justify-between border-t border-paper/10 pt-4 font-sans">
          <span class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Tạm tính</span>
          <span class="text-xl text-paper">{{ formatPrice(resolved.subtotal) }}</span>
        </div>
        <p class="mt-3 font-sans text-sm font-light text-silver">Giá chưa bao gồm phí vận chuyển. Phí vận chuyển được thanh toán khi nhận hàng.</p>
      </aside>
    </div>
  </section>
</template>
