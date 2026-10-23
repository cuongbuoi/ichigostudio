const TEST_KEY_STORAGE = 'ichigo.testKey'

/** Cấu hình checkout: chỉ fetch phía client, lỗi nào cũng coi như tắt (ẩn giỏ). */
export function useCheckoutConfig() {
  const { public: { apiBase } } = useRuntimeConfig()
  const enabled = useState<boolean>('checkout-enabled', () => false)
  const testMode = useState<boolean>('checkout-test-mode', () => false)
  const testKey = useState<string>('checkout-test-key', () => '')
  const loaded = useState<boolean>('checkout-config-loaded', () => false)

  if (import.meta.client) {
    onMounted(async () => {
      if (loaded.value) return
      loaded.value = true
      try {
        testKey.value = sessionStorage.getItem(TEST_KEY_STORAGE) ?? ''
      } catch {
        testKey.value = ''
      }
      try {
        const res = await $fetch<{ enabled?: boolean; testMode?: boolean }>(
          `${apiBase}/public/checkout/config`,
          { query: testKey.value ? { key: testKey.value } : {} },
        )
        enabled.value = res?.enabled === true
        testMode.value = res?.testMode === true
      } catch {
        enabled.value = false
        testMode.value = false
      }
    })
  }

  const cartVisible = computed(() => enabled.value || testMode.value)
  return { enabled, testMode, testKey, cartVisible }
}
