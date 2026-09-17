import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@gps-attendance/shared': path.resolve(
        import.meta.dirname,
        '../../packages/shared/src',
      ),
    },

    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    exclude: ['@gps-attendance/shared'],
  },
});
