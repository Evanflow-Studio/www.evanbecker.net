export default defineNuxtConfig({
  compatibilityDate: '2024-12-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
  ],

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
        { rel: 'alternate', type: 'application/rss+xml', title: 'RSS', href: '/feed.xml' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:5002/',
      auth0Domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN || '',
      auth0ClientId: process.env.NUXT_PUBLIC_AUTH0_CLIENT_ID || '',
      auth0Audience: process.env.NUXT_PUBLIC_AUTH0_AUDIENCE || '',
      auth0RedirectUri: process.env.NUXT_PUBLIC_AUTH0_REDIRECT_URI || 'http://localhost:3000/',
    },
  },
})
