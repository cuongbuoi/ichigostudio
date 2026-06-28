<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Liên hệ - ${shop.name}`,
  description: 'Liên hệ shop qua Messenger để hỏi phụ kiện in 3D cho đồ chơi DX.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="grid gap-12 md:grid-cols-2">
      <div>
        <h1 class="font-display text-4xl uppercase tracking-tight text-paper md:text-5xl">LIÊN HỆ</h1>
        <p class="mt-5 max-w-[45ch] font-sans text-sm font-light leading-relaxed text-silver">
          Cách nhanh nhất là nhắn tin Messenger. Cho shop biết bạn quan tâm mẫu nào,
          shop sẽ báo giá và tình trạng hàng.
        </p>
        <div class="mt-8">
          <MessengerButton label="Mở Messenger" />
        </div>
      </div>

      <dl class="space-y-6 border-t border-paper/10 pt-8 font-sans md:border-l md:border-t-0 md:pl-12 md:pt-0">
        <div>
          <dt class="text-[10px] uppercase tracking-[0.15em] text-silver font-medium">Facebook</dt>
          <dd class="mt-1">
            <a
              :href="shop.facebookUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
            >{{ shop.facebookUrl }}</a>
          </dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-[0.15em] text-silver font-medium">Thời gian phản hồi</dt>
          <dd class="mt-1 text-sm text-paper">{{ shop.responseTime }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-[0.15em] text-silver font-medium">Khu vực</dt>
          <dd class="mt-1 text-sm text-paper">{{ shop.area }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
