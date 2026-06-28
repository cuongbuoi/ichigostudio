import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './content/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        night: '#0e0f0c',
        panel: '#15160f',
        panel2: '#1d1f15',
        // accent đồng bộ tông xanh forest của logo (hue ~147°), sáng vừa đủ để đạt AA trên nền tối
        hopper: { DEFAULT: '#2e945c', bright: '#43b877' },
        ichigo: '#1b5e3a', // xanh logo gốc (deep), dùng cho mảng lớn / nền sáng
        silver: '#c8ccc4',
        paper: '#eef0e8',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['Oswald', '"Arial Narrow"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '1400px' },
    },
  },
}
