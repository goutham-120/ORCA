import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@openmeteo/file-format-wasm', '@openmeteo/file-reader', '@openmeteo/weather-map-layer'],
  },
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
