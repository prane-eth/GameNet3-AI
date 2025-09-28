import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
// Preact is faster than React and has a smaller bundle size.

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
})
