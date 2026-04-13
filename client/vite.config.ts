import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SmartCampus — Frontend-only build (no backend required)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // No proxy needed — all data is handled by mockApi.ts (localStorage)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});
