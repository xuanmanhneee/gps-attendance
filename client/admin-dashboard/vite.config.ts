import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(import.meta.dirname, '../../node_modules/react'),
      'react-dom': path.resolve(
        import.meta.dirname,
        '../../node_modules/react-dom',
      ),
      '@gps-attendance/shared': path.resolve(
        import.meta.dirname,
        "../../packages/shared/src",
      ),
    },
  },

  optimizeDeps: {
    exclude: ["@gps-attendance/shared"],
  },
});
