// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  srcDir: '.',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n', 'lucide-nuxt', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      meta: [
        { name: 'theme-color', content: '#0f172a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/icon-512.png' },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'Listly - Gemeinsam einkaufen',
      short_name: 'Listly',
      description: 'Gemeinsame Einkaufsliste für die ganze Familie',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      lang: 'de',
      categories: ['shopping', 'productivity'],
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          // Cache most API calls, but EXCLUDE auth, users, and events (SSE)
          urlPattern: /^https?:\/\/.*\/api\/(?!(auth|users|events)).*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300, // 5 min
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'de',
    locales: [
      { code: 'de', file: 'de.json' },
      { code: 'en', file: 'en.json' },
      { code: 'pl', file: 'pl.json' },
    ],
    langDir: 'locales',
    lazy: false,
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
    },
  },
  routeRules: {
    '/comments/**': { ssr: false },
  },
  nitro: {
    serverAssets: [{
      baseName: 'migrations',
      dir: './server/database/migrations'
    }]
  },
  runtimeConfig: {
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    dbUrl: 'sqlite.db',
    authSecret: 'super-secret-key',
    adminPassword: 'admin',
    baseUrl: 'http://localhost:3000',
    public: {}
  }
})
