// One image serves test and prod: environment-specific public config is read at
// runtime, never baked in at build. Nuxt overrides each runtimeConfig.public key
// below from its NUXT_PUBLIC_* env var when the server starts (siteUrl from
// NUXT_PUBLIC_SITE_URL, indexable from NUXT_PUBLIC_INDEXABLE, ...), and the site
// config used by the sitemap reads NUXT_PUBLIC_SITE_URL the same way. The values
// here are local-dev defaults; indexable stays false unless set, so a misconfigured
// deploy is never indexed. Per-environment values: env/test.env and env/prod.env.
const siteUrl = 'http://localhost:3000'

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
    // Server-only (NUXT_API_BASE_SERVER): the API's address on the host's own network, for
    // calls made while rendering on the server. Empty means use the public API URL.
    apiBaseServer: '',
    public: {
      siteUrl,
      indexable: false,
      apiUrl: 'http://localhost:5002/',
      auth0Domain: '',
      auth0ClientId: '',
      auth0Audience: '',
      auth0RedirectUri: 'http://localhost:3000/',
      recaptchaSiteKey: '',
      // The one build-time value: it names the build, so it's the same in every environment.
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || 'dev',
    },
  },
})
