import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600, // Nới lỏng giới hạn cảnh báo lên 1.6MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Gom mớ thư viện nặng nề trong node_modules ra một file riêng tên là 'vendor'
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})