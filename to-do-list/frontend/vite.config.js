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
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "@testing-library/react": path.resolve(__dirname, "./node_modules/@testing-library/react"),
      "@testing-library/jest-dom/vitest": path.resolve(__dirname, "./node_modules/@testing-library/jest-dom/vitest"),
      "lucide-react": path.resolve(__dirname, "./node_modules/lucide-react"),
      "sonner": path.resolve(__dirname, "./node_modules/sonner"),
      "react-speech-recognition": path.resolve(__dirname, "./node_modules/react-speech-recognition"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
      "axios": path.resolve(__dirname, "./node_modules/axios"),
      "@base-ui/react": path.resolve(__dirname, "./node_modules/@base-ui/react"),
      "class-variance-authority": path.resolve(__dirname, "./node_modules/class-variance-authority"),
      "clsx": path.resolve(__dirname, "./node_modules/clsx"),
      "tailwind-merge": path.resolve(__dirname, "./node_modules/tailwind-merge"),
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
    include: [path.resolve(__dirname, "../../tests/frontend/**/*.test.{js,jsx}").replace(/\\/g, "/")],
    setupFiles: [path.resolve(__dirname, "../../tests/frontend/setupTests.js").replace(/\\/g, "/")],
    deps: {
      inline: [/@testing-library/],
    },
  },
})
