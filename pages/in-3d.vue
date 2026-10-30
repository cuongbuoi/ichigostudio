<script setup lang="ts">
import {
  usePrintConfig,
  createQuote,
  fetchQuote,
  estimateStl,
  formatVnd,
  formatDuration,
  type QuoteJob,
  type StlEstimate,
} from '~/composables/usePrintQuote'

const shop = useShop()
const config = usePrintConfig()

interface Item {
  key: number
  file: File
  estimate: StlEstimate | null
  qty: number
}

// ---- form state ----
const items = ref<Item[]>([])
const materialId = ref('')
const qualityId = ref('')
const customerName = ref('')
const customerPhone = ref('')
const dragging = ref(false)
const selectedKey = ref<number | null>(null)
let keySeq = 0

const selectedFile = computed<File | null>(() => {
  const it = items.value.find((x) => x.key === selectedKey.value) ?? items.value[0]
  return it?.file ?? null
})

// ---- flow state ----
const step = ref<'idle' | 'ready' | 'submitting' | 'analyzing' | 'quoted' | 'failed'>('idle')
const errorMsg = ref('')
const job = ref<QuoteJob | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const maxFiles = computed(() => config.value?.maxFiles ?? 20)
const maxMb = computed(() => config.value?.maxFileMb ?? 60)
const ACCEPT = '.stl,.3mf,.obj'

watchEffect(() => {
  const c = config.value
  if (c && !materialId.value && c.materials.length) materialId.value = c.materials[0].id
  if (c && !qualityId.value && c.qualities.length) qualityId.value = c.qualities[0].id
})

// Báo giá cũ hết hiệu lực khi đổi danh sách file / số lượng / vật liệu / chất lượng.
function invalidateQuote() {
  if (step.value === 'quoted' || step.value === 'failed') {
    stopPoll()
    job.value = null
    errorMsg.value = ''
    step.value = items.value.length ? 'ready' : 'idle'
  }
}
watch(items, invalidateQuote, { deep: true })
watch([materialId, qualityId], invalidateQuote)

const selectedMaterial = computed(() =>
  config.value?.materials.find((m) => m.id === materialId.value) ?? null,
)
const density = computed(() => (/petg/i.test(selectedMaterial.value?.label ?? '') ? 1.27 : 1.24))

function itemGrams(it: Item): number | null {
  if (!it.estimate) return null
  return it.estimate.volumeCm3 * density.value * 0.35 * it.qty
}
// Tổng nhựa ước lượng (chỉ cộng các file .stl parse được).
const estTotalGrams = computed(() => {
  let g = 0
  let known = false
  for (const it of items.value) {
    const v = itemGrams(it)
    if (v != null) { g += v; known = true }
  }
  return known ? g : null
})

async function addFiles(list: FileList | null) {
  if (!list) return
  errorMsg.value = ''
  for (const f of Array.from(list)) {
    if (items.value.length >= maxFiles.value) { errorMsg.value = `Tối đa ${maxFiles.value} file.`; break }
    if (f.size > maxMb.value * 1024 * 1024) { errorMsg.value = `"${f.name}" quá ${maxMb.value}MB.`; continue }
    const lower = f.name.toLowerCase()
    if (!['.stl', '.3mf', '.obj'].some((e) => lower.endsWith(e))) { errorMsg.value = `"${f.name}" không đúng định dạng.`; continue }
    let est: StlEstimate | null = null
    if (lower.endsWith('.stl')) {
      try { est = estimateStl(await f.arrayBuffer()) } catch { est = null }
    }
    const key = keySeq++
    items.value.push({ key, file: f, estimate: est, qty: 1 })
    if (selectedKey.value === null) selectedKey.value = key
  }
  if (items.value.length) step.value = 'ready'
}

function onInputChange(e: Event) {
  const el = e.target as HTMLInputElement
  addFiles(el.files)
  el.value = ''
}
function onDrop(e: DragEvent) {
  dragging.value = false
  addFiles(e.dataTransfer?.files ?? null)
}
function removeItem(i: number) {
  const removed = items.value[i]
  items.value.splice(i, 1)
  if (removed && selectedKey.value === removed.key) selectedKey.value = items.value[0]?.key ?? null
  if (!items.value.length) step.value = 'idle'
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function submit() {
  if (!items.value.length || !materialId.value || !qualityId.value) return
  step.value = 'submitting'
  errorMsg.value = ''
  try {
    const fd = new FormData()
    for (const it of items.value) {
      fd.append('file', it.file)
      fd.append('qty', String(it.qty))
      const g = itemGrams(it)
      fd.append('estGrams', g != null ? g.toFixed(2) : '')
    }
    fd.append('materialId', materialId.value)
    fd.append('qualityId', qualityId.value)
    if (customerName.value.trim()) fd.append('customerName', customerName.value.trim())
    if (customerPhone.value.trim()) fd.append('customerPhone', customerPhone.value.trim())
    const { id } = await createQuote(fd)
    step.value = 'analyzing'
    pollTimer = setInterval(() => poll(id), 2500)
    poll(id)
  } catch (e: any) {
    errorMsg.value = mapError(e?.data?.error)
    step.value = 'failed'
  }
}

async function poll(id: string) {
  try {
    const j = await fetchQuote(id)
    job.value = j
    if (j.status === 'quoted') { stopPoll(); step.value = 'quoted' }
    else if (j.status === 'failed' || j.status === 'expired') {
      stopPoll()
      errorMsg.value = j.errorMsg || 'Không phân tích được file.'
      step.value = 'failed'
    }
  } catch { /* giữ polling */ }
}

const doneCount = computed(() => job.value?.files.filter((f) => f.status === 'done').length ?? 0)

function mapError(code?: string): string {
  const map: Record<string, string> = {
    disabled: 'Tính năng đặt in đang tạm đóng.',
    file_required: 'Vui lòng chọn ít nhất 1 file.',
    too_many_files: `Tối đa ${maxFiles.value} file.`,
    file_too_large: `File quá lớn (tối đa ${maxMb.value}MB).`,
    bad_file_type: 'Chỉ nhận .stl, .3mf hoặc .obj.',
    bad_material: 'Vật liệu không hợp lệ.',
    bad_quality: 'Chất lượng không hợp lệ.',
  }
  return map[code ?? ''] || 'Có lỗi xảy ra, thử lại nhé.'
}

function reset() {
  stopPoll()
  items.value = []
  selectedKey.value = null
  job.value = null
  errorMsg.value = ''
  step.value = 'idle'
}

onBeforeUnmount(stopPoll)

// Meta + schema bám theo trạng thái thật: khi báo giá online tắt thì không hứa "báo giá tự động".
const quoteOnline = computed(() => config.value?.enabled === true)

useSeoMeta({
  title: () => quoteOnline.value
    ? `In 3D theo yêu cầu - Báo giá tự động từ file STL | ${shop.name}`
    : `In 3D theo yêu cầu | ${shop.name}`,
  description: () => quoteOnline.value
    ? 'Tải file STL/3MF lên, hệ thống tự phân tích và báo giá in 3D ngay. Gộp nhiều file vào một đơn, chọn vật liệu PLA/PETG, độ mịn, số lượng. In 3D chất lượng cao tại TP.HCM.'
    : 'Gửi file STL/3MF/OBJ qua Messenger để Ichigo Studio báo giá in 3D. Dịch vụ đặt in online đang được chuẩn bị.',
  ogTitle: () => quoteOnline.value ? 'In 3D theo yêu cầu - Báo giá tự động từ file STL' : 'In 3D theo yêu cầu',
  ogDescription: () => quoteOnline.value
    ? 'Tải nhiều file STL/3MF lên để nhận báo giá in 3D tự động.'
    : 'Gửi file STL/3MF/OBJ qua Messenger để Ichigo Studio báo giá in 3D.',
  ogType: 'website',
})

const { public: { siteUrl } } = useRuntimeConfig()
useJsonLd(
  () => [
    {
      '@type': 'Service',
      name: 'In 3D theo yêu cầu từ file STL',
      serviceType: 'Dịch vụ in 3D',
      provider: { '@type': 'Organization', name: shop.name, url: siteUrl },
      areaServed: 'VN',
      description: quoteOnline.value
        ? 'Nhận file STL/3MF/OBJ của khách, phân tích tự động và báo giá in 3D ngay trên website.'
        : 'Nhận file STL/3MF/OBJ của khách và báo giá in 3D qua Messenger.',
      url: `${siteUrl}/in-3d`,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'In 3D theo yêu cầu', item: `${siteUrl}/in-3d` },
      ],
    },
  ],
  'in-3d',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <header class="max-w-[60ch]">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">
        In 3D theo yêu cầu
      </h1>
      <p v-if="quoteOnline" class="mt-5 font-sans text-sm font-light leading-relaxed text-silver">
        Có sẵn file 3D? Tải lên, hệ thống tự phân tích và báo giá in ngay. Gộp được
        nhiều file vào một đơn. Hỗ trợ <span class="text-paper">.stl / .3mf / .obj</span>, tối đa {{ maxMb }}MB mỗi file.
      </p>
      <p v-else class="mt-5 font-sans text-sm font-light leading-relaxed text-silver">
        Có sẵn file 3D? Gửi file <span class="text-paper">.stl / .3mf / .obj</span> qua Messenger, shop sẽ báo giá.
      </p>
    </header>

    <div v-if="config && !config.enabled" class="mt-10 rounded-xl border border-paper/10 bg-panel p-8 text-center">
      <p class="font-sans text-silver">Dịch vụ đặt in online đang được chuẩn bị. Bạn có thể gửi file qua Messenger để shop báo giá.</p>
      <a :href="shop.messengerUrl" target="_blank" rel="noopener noreferrer"
         class="mt-5 inline-block rounded-lg bg-hopper px-5 py-2.5 font-sans text-sm font-medium text-night transition hover:bg-hopper-bright">
        Gửi file qua Messenger
      </a>
    </div>

    <div v-else class="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <!-- Cột trái -->
      <div class="space-y-6">
        <!-- Upload -->
        <div
          class="relative rounded-xl border-2 border-dashed p-8 text-center transition"
          :class="dragging ? 'border-hopper bg-hopper/5' : 'border-paper/15 bg-panel'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input :accept="ACCEPT" type="file" multiple class="absolute inset-0 cursor-pointer opacity-0" @change="onInputChange" />
          <div class="pointer-events-none">
            <p class="font-sans text-paper">
              <span class="font-medium text-hopper-bright">Chọn file</span> hoặc kéo-thả vào đây
            </p>
            <p class="mt-1 font-sans text-xs text-silver">Nhiều file được. .stl / .3mf / .obj · tối đa {{ maxMb }}MB mỗi file</p>
          </div>
        </div>

        <!-- Danh sách file -->
        <div v-if="items.length" class="space-y-2">
          <div
            v-for="(it, i) in items"
            :key="it.key"
            class="flex cursor-pointer items-center gap-3 rounded-lg border bg-panel2 p-3 transition"
            :class="it.key === selectedKey ? 'border-hopper' : 'border-paper/10 hover:border-paper/25'"
            @click="selectedKey = it.key"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate font-sans text-sm text-paper">📄 {{ it.file.name }}</p>
              <p class="mt-0.5 font-sans text-xs text-silver">
                <template v-if="it.estimate">
                  {{ it.estimate.dims.x.toFixed(0) }}×{{ it.estimate.dims.y.toFixed(0) }}×{{ it.estimate.dims.z.toFixed(0) }} mm
                  <span v-if="itemGrams(it)"> · ~{{ itemGrams(it)!.toFixed(0) }}g</span>
                </template>
                <template v-else>{{ (it.file.size / 1024 / 1024).toFixed(1) }}MB · phân tích sau khi gửi</template>
              </p>
            </div>
            <label class="flex items-center gap-1.5" @click.stop>
              <span class="font-sans text-xs text-silver">SL</span>
              <input v-model.number="it.qty" type="number" min="1" max="100" class="w-16 rounded-md border border-paper/15 bg-panel px-2 py-1.5 text-center font-sans text-sm text-paper outline-none focus:border-hopper" />
            </label>
            <button class="shrink-0 rounded-md p-1.5 text-silver transition hover:bg-paper/5 hover:text-rose-400" aria-label="Xóa file" @click.stop="removeItem(i)">✕</button>
          </div>
          <p v-if="estTotalGrams" class="px-1 font-sans text-xs text-silver/70">
            Tổng nhựa ước lượng sơ bộ: ~{{ estTotalGrams.toFixed(0) }}g. Giá chính xác tính sau khi phân tích.
          </p>
        </div>

        <!-- Tùy chọn -->
        <div v-if="config" class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block font-sans text-xs uppercase tracking-wide text-silver">Vật liệu</span>
            <select v-model="materialId" class="w-full rounded-lg border border-paper/15 bg-panel px-3 py-2.5 font-sans text-sm text-paper outline-none focus:border-hopper">
              <option v-for="m in config.materials" :key="m.id" :value="m.id">{{ m.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block font-sans text-xs uppercase tracking-wide text-silver">Chất lượng</span>
            <select v-model="qualityId" class="w-full rounded-lg border border-paper/15 bg-panel px-3 py-2.5 font-sans text-sm text-paper outline-none focus:border-hopper">
              <option v-for="q in config.qualities" :key="q.id" :value="q.id">{{ q.label }}</option>
            </select>
          </label>
        </div>
        <p class="font-sans text-xs text-silver/60">Tất cả file trong đơn sẽ in cùng vật liệu và chất lượng.</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <input v-model="customerName" placeholder="Tên của bạn (không bắt buộc)" class="w-full rounded-lg border border-paper/15 bg-panel px-3 py-2.5 font-sans text-sm text-paper outline-none focus:border-hopper placeholder:text-silver/50" />
          <input v-model="customerPhone" placeholder="SĐT / liên hệ (không bắt buộc)" class="w-full rounded-lg border border-paper/15 bg-panel px-3 py-2.5 font-sans text-sm text-paper outline-none focus:border-hopper placeholder:text-silver/50" />
        </div>

        <p v-if="errorMsg && step !== 'failed'" class="font-sans text-sm text-rose-400">{{ errorMsg }}</p>

        <button
          :disabled="!items.length || step === 'submitting' || step === 'analyzing'"
          class="w-full rounded-lg bg-hopper px-5 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-night transition hover:bg-hopper-bright disabled:cursor-not-allowed disabled:opacity-50"
          @click="submit"
        >
          {{ step === 'submitting' ? 'Đang tải lên...' : step === 'analyzing' ? 'Đang phân tích...' : 'Báo giá ngay' }}
        </button>
      </div>

      <!-- Cột phải: preview + kết quả -->
      <aside class="space-y-4 lg:sticky lg:top-24 lg:h-fit">
        <ModelPreview v-if="selectedFile" :file="selectedFile" />

        <div class="rounded-xl border border-paper/10 bg-panel p-6">
          <h2 class="font-display text-lg uppercase tracking-tight text-paper">Báo giá</h2>

          <div v-if="step === 'idle' || step === 'ready'" class="mt-4 font-sans text-sm text-silver">
            Thêm file và bấm <span class="text-paper">Báo giá ngay</span> để nhận giá tự động.
          </div>

          <div v-else-if="step === 'submitting' || step === 'analyzing'" class="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <div class="size-8 animate-spin rounded-full border-2 border-hopper/30 border-t-hopper"></div>
            <p class="font-sans text-sm text-silver">
              Đang phân tích & slice...<br />
              <span v-if="job && job.files.length" class="text-xs text-silver/70">{{ doneCount }}/{{ job.files.length }} file xong</span>
              <span v-else class="text-xs text-silver/70">Nếu máy đang bận, shop sẽ báo giá lại sớm.</span>
            </p>
          </div>

          <div v-else-if="step === 'quoted' && job" class="mt-4 font-sans">
            <div class="rounded-lg bg-panel2 p-4">
              <div class="flex items-baseline justify-between">
                <span class="text-sm text-silver">Tổng đơn</span>
                <span class="text-2xl font-semibold text-hopper-bright">{{ formatVnd(job.total || 0) }}</span>
              </div>
            </div>
            <ul class="mt-4 space-y-2 text-sm">
              <li v-for="f in job.files" :key="f.id" class="border-b border-paper/5 pb-2">
                <div class="flex justify-between gap-2">
                  <span class="truncate text-paper">{{ f.fileName }}</span>
                  <span class="shrink-0 text-silver">×{{ f.qty }}</span>
                </div>
                <div class="mt-0.5 text-xs text-silver">
                  {{ f.grams?.toFixed(0) }}g · {{ f.printSeconds ? formatDuration(f.printSeconds) : 'N/A' }}
                  <span v-if="f.plateCount && f.plateCount > 1"> · {{ f.plateCount }} khay</span>
                </div>
              </li>
            </ul>
            <dl class="mt-3 space-y-1.5 border-t border-paper/10 pt-3 text-sm text-silver">
              <div class="flex justify-between"><dt>Tổng nhựa</dt><dd class="text-paper">{{ job.grams?.toFixed(0) }} g</dd></div>
              <div class="flex justify-between"><dt>Tổng thời gian in</dt><dd class="text-paper">{{ job.printSeconds ? formatDuration(job.printSeconds) : 'N/A' }}</dd></div>
            </dl>
            <a :href="shop.messengerUrl" target="_blank" rel="noopener noreferrer"
               class="mt-5 block rounded-lg bg-hopper px-5 py-3 text-center text-sm font-semibold uppercase tracking-wide text-night transition hover:bg-hopper-bright">
              Đặt in ngay
            </a>
            <button class="mt-2 w-full rounded-lg border border-paper/15 px-5 py-2.5 text-center text-sm text-silver transition hover:text-paper" @click="reset">
              Báo giá đơn khác
            </button>
            <p class="mt-3 text-xs text-silver/60">Thanh toán online sẽ sớm được bổ sung. Hiện tại bấm "Đặt in ngay" để chốt đơn qua Messenger.</p>
          </div>

          <div v-else-if="step === 'failed'" class="mt-4 font-sans text-sm">
            <p class="rounded-lg bg-rose-500/10 p-4 text-rose-300">{{ errorMsg }}</p>
            <button class="mt-4 w-full rounded-lg border border-paper/15 px-5 py-2.5 text-silver transition hover:text-paper" @click="reset">Thử lại</button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
