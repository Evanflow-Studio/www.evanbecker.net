<script setup lang="ts">
useSeoMeta({
  title: 'Articles - Evan Becker',
  description: 'All of my long-form thoughts on programming, leadership, product design, and more.',
  ogTitle: 'Articles - Evan Becker',
  ogDescription: 'All of my long-form thoughts on programming, leadership, product design, and more.',
  twitterTitle: 'Articles - Evan Becker',
  twitterDescription: 'All of my long-form thoughts on programming, leadership, product design, and more.',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
    <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      Writing on topics ranging from software architecture, game design, physics, religion, and more.
    </h1>
    <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
      All of my long-form thoughts captured as I attempt to understand the universe, collected in chronological order and organized by subject matter.
    </p>

    <ContentList path="/articles" :query="{ sort: [{ date: -1 }] }">
      <template #default="{ list }">
      <div class="mt-16 space-y-12 border-l border-slate-200 pl-6 dark:border-slate-700">
        <article v-for="article in list" :key="article._path" class="relative">
          <!-- Timeline dot -->
          <div class="absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#2D95FC] bg-slate-50 dark:bg-[#0B1120]" />

          <time
            v-if="article.date"
            :datetime="article.date"
            class="text-sm font-medium text-slate-400 dark:text-slate-500"
          >
            {{ new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
          </time>

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
      </div>
      </template>
      <template #not-found>
        <p class="mt-16 text-slate-500 dark:text-slate-400">No articles yet.</p>
      </template>
    </ContentList>
  </div>
</template>
