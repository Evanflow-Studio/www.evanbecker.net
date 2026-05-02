<script setup lang="ts">
const props = defineProps<{
  currentPath: string
  currentTags?: string[]
}>()

const { data: candidates } = await useAsyncData(
  `related-${props.currentPath}`,
  () => queryContent('articles')
    .where({ _draft: { $ne: true } })
    .sort({ date: -1 })
    .find(),
)

const related = computed(() => {
  const all = candidates.value || []
  const tags = new Set(props.currentTags || [])

  const scored = all
    .filter((a) => a._path !== props.currentPath)
    .map((a) => {
      const overlap = (a.tags || []).filter((t: string) => tags.has(t)).length
      return { article: a, overlap }
    })

  // If we have tags, prefer overlap-then-date. Otherwise just take recent.
  if (tags.size > 0) {
    scored.sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      return (b.article.date || '').localeCompare(a.article.date || '')
    })
  }

  return scored.slice(0, 3).map((s) => s.article)
})
</script>

<template>
  <section v-if="related.length > 0" aria-labelledby="related-heading">
    <h2 id="related-heading" class="font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      Related articles
    </h2>
    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="article in related"
        :key="article._path"
        class="group rounded-2xl border border-slate-200 p-5 transition hover:border-[#2D95FC] dark:border-slate-700 dark:hover:border-[#2D95FC]"
      >
        <NuxtLink :to="article._path" class="block">
          <time
            v-if="article.date"
            :datetime="article.date"
            class="text-xs font-medium text-slate-400 dark:text-slate-500"
          >
            {{ formatArticleDate(article.date) }}
          </time>
          <h3 class="mt-2 font-serif text-lg font-semibold text-slate-800 transition group-hover:text-[#0C65E5] dark:text-slate-100 dark:group-hover:text-[#2D95FC]">
            {{ article.title }}
          </h3>
          <p v-if="article.description" class="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
            {{ article.description }}
          </p>
          <div v-if="article.tags?.length" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="tag in article.tags.slice(0, 3)"
              :key="tag"
              class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]"
            >
              {{ tag }}
            </span>
          </div>
        </NuxtLink>
      </article>
    </div>
  </section>
</template>
