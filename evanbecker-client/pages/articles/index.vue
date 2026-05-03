<script setup lang="ts">
useSeoMeta({
  title: 'Articles - Evan Becker',
  description: 'All of my long-form thoughts on programming, leadership, product design, and more.',
  ogTitle: 'Articles - Evan Becker',
  ogDescription: 'All of my long-form thoughts on programming, leadership, product design, and more.',
  twitterTitle: 'Articles - Evan Becker',
  twitterDescription: 'All of my long-form thoughts on programming, leadership, product design, and more.',
})

const { data: articles } = await useAsyncData(
  'articles-index',
  () => queryContent('articles')
    .where({ _draft: { $ne: true } })
    .sort({ date: -1 })
    .find(),
)

const featured = computed(() => (articles.value || []).find((a) => a.featured))
const timeline = computed(() => {
  const all = articles.value || []
  return featured.value ? all.filter((a) => a._path !== featured.value!._path) : all
})

function readingFor(article: any): number {
  return articleReadingTime(articleWordCount(article))
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
    <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      Writing on topics ranging from software architecture, game design, physics, religion, and more.
    </h1>
    <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
      All of my long-form thoughts captured as I attempt to understand the universe, collected in chronological order and organized by subject matter.
    </p>

    <!-- Featured -->
    <section v-if="featured" aria-labelledby="featured-heading" class="mt-12">
      <h2 id="featured-heading" class="sr-only">Featured article</h2>
      <article class="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/25 to-transparent p-8 transition hover:border-[#2D95FC] dark:border-slate-700 dark:from-[#0C65E5]/5 dark:to-transparent dark:hover:border-[#2D95FC]">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
          <span class="inline-flex items-center gap-1 rounded-full bg-[#0C65E5] px-2.5 py-0.5 text-white">
            <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 0 0-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 0 0-1.176 0L5.485 17.93c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 0 0-.364-1.118L1.502 9.291c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .95-.69l1.286-3.957Z" /></svg>
            Featured
          </span>
          <time v-if="featured.date" :datetime="featured.date" class="text-slate-500 dark:text-slate-400">
            {{ formatArticleDate(featured.date) }}
          </time>
          <span class="text-slate-400 dark:text-slate-500" aria-hidden="true">·</span>
          <span class="text-slate-500 dark:text-slate-400">{{ readingFor(featured) }} min read</span>
        </div>

        <h3 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
          <NuxtLink :to="featured._path" class="transition hover:text-[#0C65E5] dark:hover:text-[#2D95FC]">
            {{ featured.title }}
          </NuxtLink>
        </h3>

        <p v-if="featured.description" class="mt-4 text-base text-slate-600 dark:text-slate-300">
          {{ featured.description }}
        </p>

        <div v-if="featured.tags" class="mt-5 flex flex-wrap gap-2">
          <span
            v-for="tag in featured.tags"
            :key="tag"
            class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
          >
            <span class="h-1 w-1 rounded-full bg-[#2D95FC]" />
            {{ tag }}
          </span>
        </div>

        <NuxtLink :to="featured._path" class="mt-6 inline-block text-sm font-medium text-[#0C65E5] dark:text-[#2D95FC]">
          Read article &rarr;
        </NuxtLink>
      </article>
    </section>

    <!-- Timeline -->
    <div class="mt-16 space-y-12 border-l border-slate-200 pl-6 dark:border-slate-700">
      <article v-for="article in timeline" :key="article._path" class="relative">
        <div class="absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#2D95FC] bg-slate-50 dark:bg-[#0B1120]" />

        <div class="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-400 dark:text-slate-500">
          <time v-if="article.date" :datetime="article.date">
            {{ formatArticleDate(article.date) }}
          </time>
          <span aria-hidden="true">·</span>
          <span>{{ readingFor(article) }} min read</span>
        </div>

        <h2 class="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          <NuxtLink :to="article._path" class="transition hover:text-[#0C65E5] dark:hover:text-[#2D95FC]">
            {{ article.title }}
          </NuxtLink>
        </h2>

        <p v-if="article.description" class="mt-2 text-slate-500 dark:text-slate-400">
          {{ article.description }}
        </p>

        <div v-if="article.tags" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
          >
            <span class="h-1 w-1 rounded-full bg-[#2D95FC]" />
            {{ tag }}
          </span>
        </div>

        <NuxtLink :to="article._path" class="mt-3 inline-block text-sm font-medium text-[#0C65E5] dark:text-[#2D95FC]">
          Read article &rarr;
        </NuxtLink>
      </article>
      <p v-if="!featured && timeline.length === 0" class="mt-16 text-slate-500 dark:text-slate-400">
        No articles yet.
      </p>
    </div>
  </div>
</template>
