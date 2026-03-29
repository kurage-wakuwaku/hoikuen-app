import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/hoikuen-note/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192-v2.png', 'icon-512-v2.png'],
      manifest: {
        name: '保育園見学ノート',
        short_name: '見学ノート',
        description: '保育園の比較・見学管理アプリ',
        theme_color: '#fb7185',
        background_color: '#fffbfa',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
}))
