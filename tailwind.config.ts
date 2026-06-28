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
        // nền off-white / off-black, 1 accent duy nhất (đỏ thép trầm)
        bone: '#f4f2ec',
        ink: '#16151a',
        accent: { DEFAULT: '#b4232a', soft: '#c8443b' },
      },
      fontFamily: {
        // sans display có gu cho heading, sans sạch cho body (self-host ở Task 3)
        display: ['"Clash Display"', 'system-ui', 'sans-serif'],
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '1400px' },
    },
  },
}
