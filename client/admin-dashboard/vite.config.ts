import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
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
