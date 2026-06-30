import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Dexscreener API to avoid CORS
      '/api/dex': {
        target: 'https://api.dexscreener.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dex/, ''),
      },
      // Proxy Binance API to avoid CORS
      '/api/cex': {
        target: 'https://data-api.binance.vision',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cex/, ''),
      },
      // Proxy Telegram Bot API for real alerts
      '/api/telegram': {
        target: 'https://api.telegram.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/telegram/, ''),
      },
      // Proxy CallMeBot WhatsApp API
      '/api/whatsapp': {
        target: 'https://api.callmebot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whatsapp/, ''),
      },
    },
  },
})
