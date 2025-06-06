import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Fallback proxy for development without environment variables
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      }
    }
  }
})

