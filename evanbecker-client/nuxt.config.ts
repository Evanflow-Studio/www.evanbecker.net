const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default defineNuxtConfig({
  compatibilityDate: '2024-12-01',
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt',
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
  ],

  site: {
    url: siteUrl,
    name: 'Evan Becker',
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: [
      '/account',
      '/thank-you-message',
      '/resume',
      '/sandbox',
      '/sandbox/**',
    ],
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  content: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',
      },
    },
    markdown: {
      anchorLinks: false,
    },
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts',
    cssPath: '~/assets/css/main.css',
  },

  app: {
    head: {
      title: 'Evan Becker',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Software architect, writer, and builder of things.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'RSS', href: '/feed.xml' },
      ],
    },
  },

  vite: {
    // #app-manifest is a server-only virtual import that Nuxt references inside
    // a dead `if (false)` branch of manifest.js when bundling for the client.
    // Vite's dep optimizer still tries to pre-resolve it and spams the console.
    optimizeDeps: {
      exclude: ['#app-manifest'],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl,
      indexable: process.env.NUXT_PUBLIC_INDEXABLE === 'true',
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:5002/',
      auth0Domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN || '',
      auth0ClientId: process.env.NUXT_PUBLIC_AUTH0_CLIENT_ID || '',
      auth0Audience: process.env.NUXT_PUBLIC_AUTH0_AUDIENCE || '',
      auth0RedirectUri: process.env.NUXT_PUBLIC_AUTH0_REDIRECT_URI || 'http://localhost:3000/',
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || 'dev',
    },
  },
})
