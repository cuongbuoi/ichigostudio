<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Gioi thieu - ${shop.name}`,
  description: 'Cau chuyen xuong figure in FDM tokusatsu va quy trinh lam san pham.',
})
const steps = [
  { t: 'Dung va tinh chinh model', d: 'Chon loc va xu ly file 3D, can chinh tung chi tiet truoc khi in.' },
  { t: 'In FDM (PLA+) tung phan', d: 'In tren may FDM, xu ly van lop va rap ghep can than tung manh.' },
  { t: 'Son thu cong nhieu lop', d: 'Len mau, to bong va phu lop bao ve de figure ben mau khi trung bay.' },
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl uppercase tracking-tight text-paper md:text-5xl">
        LAM FIGURE VI ME TOKUSATSU
      </h1>
      <p class="mt-6 font-sans text-sm font-light leading-relaxed text-silver">
        {{ shop.name }} la xuong nho chuyen figure in FDM cac nhan vat tokusatsu.
        So luong gioi han, tap trung vao do chi tiet va nuoc son.
      </p>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-3">
      <NuxtImg
        v-for="n in 3"
        :key="n"
        :src="`https://picsum.photos/seed/about-fdm-${n}/800/600`"
        :alt="`Xuong in FDM figure tokusatsu - hinh ${n}`"
        width="800"
        height="600"
        loading="lazy"
        class="aspect-[4/3] w-full rounded object-cover border border-paper/10"
      />
    </div>

    <!-- QUY TRINH section: FDM layer-line texture background -->
    <div class="mt-20">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">QUY TRINH</h2>
      <div class="grid gap-px overflow-hidden rounded bg-panel border border-paper/10 md:grid-cols-3" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92,138,36,0.03) 3px, rgba(92,138,36,0.03) 4px);">
        <div v-for="(s, i) in steps" :key="i" class="bg-panel p-8">
          <p class="font-display text-4xl text-hopper">{{ i + 1 }}</p>
          <h3 class="mt-3 font-sans text-base font-semibold text-paper">{{ s.t }}</h3>
          <p class="mt-2 font-sans text-sm font-light leading-relaxed text-silver">{{ s.d }}</p>
        </div>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-start gap-4">
      <p class="font-display text-2xl uppercase text-paper">Muon mau theo yeu cau?</p>
      <MessengerButton label="Trao doi voi shop" />
    </div>
  </section>
</template>
