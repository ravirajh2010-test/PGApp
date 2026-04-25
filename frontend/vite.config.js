import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-intl': ['react-intl'],
        },
      },
    },
  },
})