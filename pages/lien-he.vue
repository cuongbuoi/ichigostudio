<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Liên hệ - ${shop.name}`,
  description: 'Liên hệ shop qua Messenger để hỏi sản phẩm figure tokusatsu in 3D.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="grid gap-12 md:grid-cols-2">
      <div>
        <h1 class="font-display text-4xl tracking-tight md:text-5xl">Liên hệ</h1>
        <p class="mt-5 max-w-[45ch] text-lg text-ink/65 dark:text-bone/65">
          Cách nhanh nhất là nhắn tin Messenger. Cho shop biết bạn quan tâm mẫu nào,
          shop sẽ báo giá và tình trạng hàng.
        </p>
        <div class="mt-8"><MessengerButton label="Mở Messenger" /></div>
      </div>

      <dl class="space-y-6 border-t border-ink/10 pt-8 dark:border-bone/10 md:border-l md:border-t-0 md:pl-12 md:pt-0">
        <div>
          <dt class="text-sm text-ink/65 dark:text-bone/65">Facebook</dt>
          <dd><a :href="shop.facebookUrl" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{{ shop.facebookUrl }}</a></dd>
        </div>
        <div>
          <dt class="text-sm text-ink/65 dark:text-bone/65">Thời gian phản hồi</dt>
          <dd>{{ shop.responseTime }}</dd>
        </div>
        <div>
          <dt class="text-sm text-ink/65 dark:text-bone/65">Khu vực</dt>
          <dd>{{ shop.area }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
