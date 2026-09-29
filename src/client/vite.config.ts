import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // in dev, forward API calls to the Express server
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
