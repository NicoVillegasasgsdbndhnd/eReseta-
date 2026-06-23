import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor libs into their own long-lived chunk. App code changes
        // far more often than these deps, so isolating them keeps the vendor bundle cached
        // across deploys (only the small app chunk re-downloads on each release).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react'
            }
            if (/[\\/]node_modules[\\/](@tanstack|axios|zustand)[\\/]/.test(id)) {
              return 'vendor-data'
            }
          }
        },
      },
    },
  },
})
