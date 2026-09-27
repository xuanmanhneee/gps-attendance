<<<<<<< HEAD
import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";
=======
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
<<<<<<< HEAD
      react: path.resolve(import.meta.dirname, '../../node_modules/react'),
      'react-dom': path.resolve(
        import.meta.dirname,
        '../../node_modules/react-dom',
      ),
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
