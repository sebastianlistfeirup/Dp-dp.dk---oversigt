import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/Dp-dp.dk---oversigt/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { outDir: 'dist', emptyOutDir: true, target: 'esnext' },
})
