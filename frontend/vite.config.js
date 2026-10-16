import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

function renderNotFoundFallback() {
  return {
    name: 'render-spa-fallback',
    closeBundle() {
      const outputDirectory = resolve(process.cwd(), 'dist')
      copyFileSync(resolve(outputDirectory, 'index.html'), resolve(outputDirectory, '404.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), renderNotFoundFallback()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
