import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3100',
      // Server Attendance (mặc định cổng 3000); bỏ tiền tố /attendance-api khi chuyển tiếp.
      '/attendance-api': {
        target: process.env.ATTENDANCE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/attendance-api/, ''),
      },
    },
  },
});
