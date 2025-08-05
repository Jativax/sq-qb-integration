import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          tanstack: ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1200, // Increase threshold to reduce noise
  },
});
