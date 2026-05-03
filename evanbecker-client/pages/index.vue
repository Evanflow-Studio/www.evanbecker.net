<script setup lang="ts">
useSeoMeta({
  title: 'Evan Becker - Software Architect, Writer, & Builder',
  description: 'I design scalable systems for energy, manufacturing, and chemicals — and write about software architecture, game design, and physics. Self-hosted on a Proxmox homelab.',
  ogTitle: 'Evan Becker - Software Architect, Writer, & Builder',
  ogDescription: 'I design scalable systems for energy, manufacturing, and chemicals — and write about software architecture, game design, and physics. Self-hosted on a Proxmox homelab.',
  twitterTitle: 'Evan Becker - Software Architect, Writer, & Builder',
  twitterDescription: 'I design scalable systems for energy, manufacturing, and chemicals — and write about software architecture, game design, and physics.',
})

const { data: articles } = await useAsyncData('home-articles', () =>
  queryContent('articles').where({ _draft: { $ne: true } }).sort({ date: -1 }).find()
)
const articleCount = computed(() => articles.value?.length ?? 0)

const featured = computed(() => (articles.value || []).find((a) => a.featured))
const recent = computed(() => {
  const all = articles.value || []
  const filtered = featured.value ? all.filter((a) => a._path !== featured.value!._path) : all
  return filtered.slice(0, 3)
})

function readingFor(article: any): number {
  return articleReadingTime(articleWordCount(article))
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#0C65E5]/5" />

      <div class="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:px-8 lg:py-40">
        <!-- Text -->
        <div class="lg:pr-8">
          <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-50">
            Evan Becker
          </h1>
          <p class="mt-4 text-xl text-slate-700 dark:text-slate-300">
            Software Architect, Writer, <span class="text-[#0C65E5] dark:text-[#2D95FC]">&amp;</span> Builder
          </p>
          <p class="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            I design scalable systems and solve complex problems for enterprises across
            energy, manufacturing, and chemicals. I write about
            software architecture, game design, physics, and whatever else I'm exploring.
            This site is self-hosted on a
            <a href="https://www.proxmox.com/" class="link-underline">Proxmox</a> homelab.
          </p>

          <div class="mt-10 flex flex-wrap items-center gap-4">
            <NuxtLink
              to="/about-me"
              class="rounded-xl bg-[#0C65E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D95FC]"
            >
              About Me
            </NuxtLink>
            <NuxtLink
              to="/articles"
              class="rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Read the Blog
            </NuxtLink>
          </div>

          <!-- Stats -->
          <div class="mt-12 grid grid-cols-3 gap-4">
            <div class="rounded-xl border border-slate-200/60 bg-white/50 px-4 py-3 dark:border-slate-700/40 dark:bg-slate-800/30">
              <p class="text-2xl font-bold text-slate-900 dark:text-slate-50">10<span class="text-[#2D95FC]">+</span></p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Years of experience</p>
            </div>
            <div class="rounded-xl border border-slate-200/60 bg-white/50 px-4 py-3 dark:border-slate-700/40 dark:bg-slate-800/30">
              <p class="text-2xl font-bold text-slate-900 dark:text-slate-50">{{ articleCount }}<span class="text-[#2D95FC]"></span></p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ articleCount === 1 ? 'Blog post' : 'Blog posts' }}</p>
            </div>
            <div class="rounded-xl border border-slate-200/60 bg-white/50 px-4 py-3 dark:border-slate-700/40 dark:bg-slate-800/30">
              <p class="text-2xl font-bold text-slate-900 dark:text-slate-50">5<span class="text-[#2D95FC]">+</span></p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Industries served</p>
            </div>
          </div>

          <!-- Tech stack -->
          <div class="mt-6">
            <p class="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Core stack</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="tech in ['C# / .NET', 'TypeScript', 'Vue / Nuxt', 'PostgreSQL', 'Docker', 'Proxmox', 'Traefik', 'GitHub Actions']"
                :key="tech"
                class="rounded-md border border-slate-200/60 bg-white/40 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400"
              >
                {{ tech }}
              </span>
            </div>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="mt-16 lg:mt-0">
          <CodeEditor />
        </div>
      </div>
    </section>

    <!-- Featured + Recent -->
    <section class="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <!-- Featured -->
      <article
        v-if="featured"
        class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/25 to-transparent p-8 transition hover:border-[#2D95FC] dark:border-slate-700 dark:from-[#0C65E5]/5 dark:to-transparent dark:hover:border-[#2D95FC]"
      >
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

        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
          <NuxtLink :to="featured._path" class="transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]">
            {{ featured.title }}
          </NuxtLink>
        </h2>

        <p v-if="featured.description" class="mt-4 max-w-3xl text-base text-slate-600 dark:text-slate-300">
          {{ featured.description }}
        </p>

        <div v-if="featured.tags" class="mt-5 flex flex-wrap gap-2">
          <span
            v-for="tag in featured.tags"
            :key="tag"
            class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
          >
            {{ tag }}
          </span>
        </div>

        <NuxtLink :to="featured._path" class="mt-6 inline-block text-sm font-medium text-[#0C65E5] dark:text-[#2D95FC]">
          Read article &rarr;
        </NuxtLink>
      </article>

      <!-- Recent -->
      <div :class="featured ? 'mt-16' : ''">
        <div class="flex items-center justify-between">
          <h2 class="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Recent Writing
          </h2>
          <NuxtLink to="/articles" class="text-sm font-medium text-[#0C65E5] transition hover:text-[#2D95FC] dark:text-[#2D95FC] dark:hover:text-[#41A5F7]">
            View all &rarr;
          </NuxtLink>
        </div>

        <div v-if="recent.length > 0" class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="article in recent"
            :key="article._path"
            class="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-[#2D95FC]/40 hover:shadow-md dark:border-slate-800 dark:bg-[#1E293B] dark:hover:border-[#2D95FC]/40"
          >
            <div class="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500 dark:text-slate-500">
              <time v-if="article.date" :datetime="article.date">
                {{ formatArticleDate(article.date) }}
              </time>
              <span aria-hidden="true">·</span>
              <span>{{ readingFor(article) }} min read</span>
            </div>
            <h3 class="mt-2 text-lg font-semibold text-slate-800 group-hover:text-[#0C65E5] dark:text-slate-100 dark:group-hover:text-[#2D95FC]">
              <NuxtLink :to="article._path">{{ article.title }}</NuxtLink>
            </h3>
            <p v-if="article.description" class="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
              {{ article.description }}
            </p>
            <div v-if="article.tags" class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="tag in article.tags"
                :key="tag"
                class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
              >
                {{ tag }}
              </span>
            </div>
          </article>
        </div>
        <p v-else class="mt-8 text-sm text-slate-500 dark:text-slate-400">No articles yet.</p>
      </div>
    </section>
  </div>
</template>
