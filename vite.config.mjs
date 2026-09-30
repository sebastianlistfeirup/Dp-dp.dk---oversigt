import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE ?? '/Dp-dp.dk---oversigt/',
  resolve: { alias: { '@': path.resolve(root, '.compiled/src') } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
  },
})
