<script setup lang="ts">
useHead({ title: 'Evan Becker - Software Architect & Writer' })
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
            Hello, World!
          </h1>
          <p class="mt-4 text-xl text-slate-700 dark:text-slate-300">
            Welcome to <span class="font-medium text-[#0C65E5] dark:text-[#2D95FC]">evanbecker.net</span>.
          </p>
          <p class="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            This site is built with
            <a href="https://tailwindcss.com/" class="link-underline">Tailwind CSS</a> and
            <a href="https://nuxt.com/" class="link-underline">Nuxt</a>, backed by
            <a href="https://dotnet.microsoft.com/en-us/download/dotnet/10.0" class="link-underline">.NET 10</a> with
            <a href="https://learn.microsoft.com/en-us/ef/" class="link-underline">Entity Framework</a>,
            <a href="https://www.postgresql.org/" class="link-underline">PostgreSQL</a>,
            <a href="https://traefik.io/traefik/" class="link-underline">Traefik</a>,
            <a href="https://github.com/features/actions" class="link-underline">GitHub Actions</a>,
            <a href="https://www.docker.com/" class="link-underline">Docker</a>, and self-hosted on a
            <a href="https://www.proxmox.com/" class="link-underline">Proxmox</a> homelab.
          </p>

          <div class="mt-10 flex flex-wrap gap-4">
            <NuxtLink
              to="/articles/building-evanbecker-net"
              class="rounded-xl bg-[#0C65E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D95FC]"
            >
              So, how'd you do it?
            </NuxtLink>
            <a
              href="https://github.com/evanjbecker"
              target="_blank"
              class="rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              View GitHub
            </a>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="mt-16 lg:mt-0">
          <CodeEditor />
        </div>
      </div>
    </section>

    <!-- Recent Articles Preview -->
    <section class="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div class="flex items-center justify-between">
        <h2 class="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Recent Writing
        </h2>
        <NuxtLink to="/articles" class="text-sm font-medium text-[#0C65E5] transition hover:text-[#2D95FC] dark:text-[#2D95FC] dark:hover:text-[#41A5F7]">
          View all &rarr;
        </NuxtLink>
      </div>

      <ContentList path="/articles" :query="{ limit: 3, sort: [{ date: -1 }] }" v-slot="{ list }">
        <div class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="article in list"
            :key="article._path"
            class="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-[#2D95FC]/40 hover:shadow-md dark:border-slate-800 dark:bg-[#1E293B] dark:hover:border-[#2D95FC]/40"
          >
            <time
              v-if="article.date"
              :datetime="article.date"
              class="text-xs font-medium text-slate-500 dark:text-slate-500"
            >
              {{ new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </time>
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
      </ContentList>
    </section>
  </div>
</template>
