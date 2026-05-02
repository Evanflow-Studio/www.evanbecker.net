<script setup lang="ts">
definePageMeta({ layout: 'article' })

const route = useRoute()

const { data: article } = await useAsyncData(
  `article-${route.path}`,
  () => queryContent(route.path).findOne()
)

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const config = useRuntimeConfig()
const articleTitle = `${article.value.title} - Evan Becker`
const articleDescription = article.value.description || ''
const articleImage = article.value.image
  ? `${config.public.siteUrl.replace(/\/$/, '')}${article.value.image}`
  : `${config.public.siteUrl.replace(/\/$/, '')}/og-image.png`
const articleModified = article.value.dateModified || article.value.date

useSeoMeta({
  title: articleTitle,
  description: articleDescription,
  ogType: 'article',
  ogTitle: articleTitle,
  ogDescription: articleDescription,
  ogImage: articleImage,
  twitterCard: 'summary_large_image',
  twitterTitle: articleTitle,
  twitterDescription: articleDescription,
  twitterImage: articleImage,
  articlePublishedTime: article.value.date,
  articleModifiedTime: articleModified,
  articleAuthor: ['Evan Becker'],
  articleTag: article.value.tags,
})

useArticleSchema({
  title: article.value.title,
  description: article.value.description,
  date: article.value.date,
  dateModified: article.value.dateModified,
  image: article.value.image,
  tags: article.value.tags,
  path: route.path,
})
</script>

<template>
  <article v-if="article">
    <!-- Back link -->
    <NuxtLink
      to="/articles"
      class="group mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-[#0C65E5] dark:text-slate-500 dark:hover:text-[#2D95FC]"
    >
      <svg class="h-4 w-4 transition group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back to articles
    </NuxtLink>

    <!-- Header -->
    <header>
      <time
        v-if="article.date"
        :datetime="article.date"
        class="text-sm font-medium text-slate-400 dark:text-slate-500"
      >
        {{ formatArticleDate(article.date) }}
      </time>
      <h1 class="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
        {{ article.title }}
      </h1>
      <div v-if="article.tags" class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="tag in article.tags"
          :key="tag"
          class="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
        >
          {{ tag }}
        </span>
      </div>
    </header>

    <!-- Content -->
    <div class="mt-10">
      <ContentRenderer
        :value="article"
        class="prose prose-lg dark:prose-invert max-w-none"
      />
    </div>

    <!-- Comments -->
    <div class="mt-16 border-t border-slate-200 dark:border-slate-700">
      <ClientOnly>
        <CommentSection />
      </ClientOnly>
    </div>
  </article>
</template>
