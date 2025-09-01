import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // 完全禁用Vue DevTools以避免弹窗
    // vueDevTools(),
    // 暂时注释掉PWA插件，解决构建问题
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
    //   manifest: {
    //     name: 'Linode Manager',
    //     short_name: 'Linode',
    //     description: '管理您的Linode云服务器',
    //     theme_color: '#3b82f6',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     scope: '/',
    //     start_url: '/',
    //     orientation: 'portrait-primary',
    //     icons: [
    //       {
    //         src: 'icon-192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'icon-512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\.linode\.com/,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           networkTimeoutSeconds: 5,
    //           cacheableResponse: {
    //             statuses: [0, 200]
    //           }
    //         }
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 18080,
    open: false, // 禁用自动打开浏览器
    hmr: {
      overlay: false // 禁用HMR错误覆盖层
    },
    cors: true, // 启用CORS
    proxy: {
      '/api': {
        target: 'https://api.linode.com/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
        headers: {
          'User-Agent': 'Linode PWA Client'
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 18080
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          api: ['axios']
        }
      }
    }
  }
})
