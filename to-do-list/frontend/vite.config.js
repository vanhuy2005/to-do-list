import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
    fs: {
      allow: ["..", "../../tests"],
    },
  },
  test: {
    root: path.resolve(__dirname, "../../"),
    globals: true,
    environment: "jsdom",
    include: [path.resolve(__dirname, "../../tests/frontend/**/*.test.js")],
    setupFiles: [path.resolve(__dirname, "../../tests/frontend/setupTests.js")],
    deps: {
      inline: [/@testing-library/],
    },
  },
})
