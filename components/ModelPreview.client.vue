<script setup lang="ts">
// Xem trước 3D model khách upload (.stl/.obj/.3mf). Client-only (.client.vue) —
// three.js nạp động, không vào bundle các trang khác, không chạy SSR.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ file: File | null }>()

const container = ref<HTMLDivElement | null>(null)
const loading = ref(false)
const error = ref('')

// Giữ ngoài reactivity (three tự quản state nội bộ).
let THREE: typeof import('three')
let renderer: any = null
let scene: any = null
let camera: any = null
let controls: any = null
let currentObj: any = null
let raf = 0
let ro: ResizeObserver | null = null
let token = 0 // chống race khi đổi file liên tục

async function ensureThree() {
  if (THREE) return
  THREE = await import('three')
}

function sizeToContainer() {
  if (!renderer || !camera || !container.value) return
  const w = container.value.clientWidth
  const h = container.value.clientHeight || 360
  renderer.setSize(w, h, false)
  camera.aspect = w / Math.max(1, h)
  camera.updateProjectionMatrix()
}

async function init() {
  await ensureThree()
  if (!container.value) return
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  container.value.appendChild(renderer.domElement)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d22, 1.1))
  const dir = new THREE.DirectionalLight(0xffffff, 1.6)
  dir.position.set(1, 1.5, 1)
  scene.add(dir)
  const dir2 = new THREE.DirectionalLight(0x9fd6b4, 0.5)
  dir2.position.set(-1, -0.5, -1)
  scene.add(dir2)

  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.2

  sizeToContainer()
  ro = new ResizeObserver(sizeToContainer)
  ro.observe(container.value)

  const loop = () => {
    raf = requestAnimationFrame(loop)
    controls?.update()
    renderer?.render(scene, camera)
  }
  loop()
}

function disposeObj() {
  if (!currentObj) return
  scene?.remove(currentObj)
  currentObj.traverse?.((o: any) => {
    o.geometry?.dispose?.()
    if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.())
    else o.material?.dispose?.()
  })
  currentObj.geometry?.dispose?.()
  currentObj.material?.dispose?.()
  currentObj = null
}

async function parseFile(file: File): Promise<any> {
  const ext = file.name.toLowerCase().split('.').pop()
  const mat = () => new THREE.MeshStandardMaterial({ color: 0x43b877, metalness: 0.05, roughness: 0.75, flatShading: true })
  if (ext === 'stl') {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
    const geo = new STLLoader().parse(await file.arrayBuffer())
    const mesh = new THREE.Mesh(geo, mat())
    mesh.rotation.x = -Math.PI / 2 // STL thường Z-up → dựng đứng
    return mesh
  }
  if (ext === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    const grp = new OBJLoader().parse(await file.text())
    grp.traverse((o: any) => { if (o.isMesh) o.material = mat() })
    return grp
  }
  if (ext === '3mf') {
    const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js')
    const grp = new ThreeMFLoader().parse(await file.arrayBuffer())
    grp.traverse((o: any) => { if (o.isMesh) o.material = mat() })
    grp.rotation.x = -Math.PI / 2
    return grp
  }
  throw new Error('unsupported')
}

function fit(obj: any) {
  const box = new THREE.Box3().setFromObject(obj)
  if (box.isEmpty()) throw new Error('empty')
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  obj.position.sub(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const fov = (camera.fov * Math.PI) / 180
  const dist = (maxDim / (2 * Math.tan(fov / 2))) * 1.7
  camera.position.set(dist * 0.9, dist * 0.7, dist)
  camera.near = dist / 100
  camera.far = dist * 100
  camera.updateProjectionMatrix()
  controls.target.set(0, 0, 0)
  controls.update()
}

async function load() {
  const my = ++token
  error.value = ''
  if (!props.file) { disposeObj(); return }
  loading.value = true
  try {
    if (!renderer) await init()
    const obj = await parseFile(props.file)
    if (my !== token) { // file đã đổi trong lúc parse
      obj.traverse?.((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.() })
      return
    }
    disposeObj()
    currentObj = obj
    scene.add(obj)
    fit(obj)
  } catch (e) {
    if (my === token) error.value = 'Không xem trước được file này (vẫn báo giá bình thường).'
  } finally {
    if (my === token) loading.value = false
  }
}

onMounted(load)
watch(() => props.file, load)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  disposeObj()
  controls?.dispose?.()
  renderer?.dispose?.()
  if (renderer?.domElement && container.value?.contains(renderer.domElement)) {
    container.value.removeChild(renderer.domElement)
  }
  renderer = scene = camera = controls = null
})
</script>

<template>
  <div class="relative h-[320px] w-full overflow-hidden rounded-xl border border-paper/10 bg-panel2">
    <div ref="container" class="h-full w-full" />
    <div v-if="loading" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="size-7 animate-spin rounded-full border-2 border-hopper/30 border-t-hopper" />
    </div>
    <p v-if="error" class="pointer-events-none absolute inset-x-0 bottom-0 bg-night/70 p-2 text-center font-sans text-xs text-silver">
      {{ error }}
    </p>
    <p v-else-if="!loading" class="pointer-events-none absolute bottom-2 right-3 font-sans text-[10px] uppercase tracking-wide text-silver/50">
      Kéo để xoay · lăn để zoom
    </p>
  </div>
</template>
