import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gps-attendance/shared-types': path.resolve(import.meta.dirname, '../../packages/shared-types/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@gps-attendance/shared-types'],
  },
})