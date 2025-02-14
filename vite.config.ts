import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: '/IWAC-overview/', // Replace with your repository name
  build: {
    outDir: 'docs', // GitHub Pages will serve from /docs
    rollupOptions: {
      input: './index.html'
    }
  }
})
