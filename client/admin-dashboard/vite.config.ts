import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@gps-attendance/shared': path.resolve(
        import.meta.dirname,
        '../../packages/shared/src',
      ),
    },
  },

  optimizeDeps: {
    exclude: ['@gps-attendance/shared'],
  },
});