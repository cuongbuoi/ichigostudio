const TEST_KEY_STORAGE = 'ichigo.testKey'

/** Cấu hình checkout: chỉ fetch phía client, lỗi nào cũng coi như tắt (ẩn giỏ). */
export function useCheckoutConfig() {
  const { public: { apiBase } } = useRuntimeConfig()
  const enabled = useState<boolean>('checkout-enabled', () => false)
  const testMode = useState<boolean>('checkout-test-mode', () => false)
  const testKey = useState<string>('checkout-test-key', () => '')
  const loaded = useState<boolean>('checkout-config-loaded', () => false)

  /** Refetch config với testKey hiện tại; lỗi nào cũng coi như tắt. */
  async function refresh(): Promise<void> {
    if (!import.meta.client) return
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
  }

  /** Đặt test key (lưu sessionStorage), rồi refetch để hiện giỏ ngay không cần reload. */
  async function setTestKey(key: string): Promise<void> {
    try {
      sessionStorage.setItem(TEST_KEY_STORAGE, key)
    } catch {
      // storage bị chặn: key chỉ sống trong state
    }
    testKey.value = key
    await refresh()
  }

  if (import.meta.client) {
    onMounted(async () => {
      if (loaded.value) return
      loaded.value = true
      try {
        testKey.value = sessionStorage.getItem(TEST_KEY_STORAGE) ?? ''
      } catch {
        testKey.value = ''
      }
      await refresh()
    })
  }

  const cartVisible = computed(() => enabled.value || testMode.value)
  return { enabled, testMode, testKey, cartVisible, setTestKey, refresh }
}
