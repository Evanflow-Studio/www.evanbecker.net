<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

const isProduction = config.public.indexable

const canonicalUrl = computed(() => {
  const base = config.public.siteUrl.replace(/\/$/, '')
  const path = route.path === '/' ? '' : route.path.replace(/\/$/, '')
  return `${base}${path}`
})

const ogImageUrl = computed(() => `${config.public.siteUrl.replace(/\/$/, '')}/og-image.png`)

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:site_name', content: 'Evan Becker' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: ogImageUrl },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Evan Becker - Software Architect, Writer, & Builder' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: ogImageUrl },
    ...(isProduction ? [] : [{ name: 'robots', content: 'noindex, nofollow' }]),
  ],
})

useWebSiteSchema()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
