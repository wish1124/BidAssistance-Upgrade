import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  server: {
      proxy: {
          // '/api'로 시작하는 요청이 오면 8080으로 보내라!
          '/api': {
              target: 'https://aivle-tk-con.greenpond-9eab36ab.koreacentral.azurecontainerapps.io/',
              changeOrigin: true,


          },
      },
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
})