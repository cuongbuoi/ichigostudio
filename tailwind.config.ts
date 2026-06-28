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
        hopper: { DEFAULT: '#5c8a24', bright: '#76b02f' },
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
