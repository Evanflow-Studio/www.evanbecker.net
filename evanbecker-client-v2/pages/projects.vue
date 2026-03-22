<script setup lang="ts">
useHead({ title: 'Projects - Evan Becker' })

const projects = [
  {
    name: 'Planetaria',
    description: 'Creating technology to empower civilians to explore space on their own terms.',
    link: { href: 'http://planetaria.tech', label: 'planetaria.tech' },
  },
  {
    name: 'Animaginary',
    description: 'High performance web animation library, hand-written in optimized WASM.',
    link: { href: '#', label: 'github.com' },
  },
  {
    name: 'HelioStream',
    description: 'Real-time video streaming library, optimized for interstellar transmission.',
    link: { href: '#', label: 'github.com' },
  },
  {
    name: 'cosmOS',
    description: 'The operating system that powers our Planetaria space shuttles.',
    link: { href: '#', label: 'github.com' },
  },
  {
    name: 'OpenShuttle',
    description: 'The schematics for the first rocket I designed that successfully made it to orbit.',
    link: { href: '#', label: 'github.com' },
  },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
    <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      Things I've made trying to put my dent in the universe.
    </h1>
    <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
      I've worked on tons of little projects over the years but these are the ones that I'm most proud of.
      Many of them are open-source, so if you see something that piques your interest, check out the code
      and contribute if you have ideas for how it can be improved.
    </p>

    <ul class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="project in projects"
        :key="project.name"
        class="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-[#2D95FC]/40 hover:shadow-md dark:border-slate-800 dark:bg-[#1E293B] dark:hover:border-[#2D95FC]/40"
      >
        <!-- Initial circle -->
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-[#0C65E5] dark:bg-[#0C65E5]/10 dark:text-[#41A5F7]">
          {{ project.name[0] }}
        </div>

        <h2 class="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
          <a :href="project.link.href" class="transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]">
            {{ project.name }}
          </a>
        </h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {{ project.description }}
        </p>
        <p class="mt-4 flex items-center gap-2 text-sm text-slate-400 transition group-hover:text-[#0C65E5] dark:text-slate-500 dark:group-hover:text-[#2D95FC]">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.712 11.823a.75.75 0 1 0 1.06 1.06l-1.06-1.06Zm-4.95 1.768a.75.75 0 0 0 1.06-1.06l-1.06 1.06Zm-2.475-1.414a.75.75 0 1 0-1.06-1.06l1.06 1.06Zm4.95-1.768a.75.75 0 1 0-1.06 1.06l1.06-1.06Zm3.359.53-.884.884 1.06 1.06.885-.883-1.061-1.06Zm-4.95-2.12 1.414-1.415L12 6.344l-1.415 1.413 1.061 1.061Zm0 3.535a2.5 2.5 0 0 1 0-3.536l-1.06-1.06a4 4 0 0 0 0 5.656l1.06-1.06Zm4.95-4.95a2.5 2.5 0 0 1 0 3.535L17.656 12a4 4 0 0 0 0-5.657l-1.06 1.06Zm1.06-1.06a4 4 0 0 0-5.656 0l1.06 1.06a2.5 2.5 0 0 1 3.536 0l1.06-1.06Zm-7.07 7.07.176.177 1.06-1.06-.176-.177-1.06 1.06Zm-3.183-.353.884-.884-1.06-1.06-.884.883 1.06 1.06Zm4.95 2.121-1.414 1.414 1.06 1.06 1.415-1.413-1.06-1.061Zm0-3.536a2.5 2.5 0 0 1 0 3.536l1.06 1.06a4 4 0 0 0 0-5.656l-1.06 1.06Zm-4.95 4.95a2.5 2.5 0 0 1 0-3.535L6.344 12a4 4 0 0 0 0 5.656l1.06-1.06Zm-1.06 1.06a4 4 0 0 0 5.657 0l-1.061-1.06a2.5 2.5 0 0 1-3.535 0l-1.061 1.06Zm7.07-7.07-.176-.177-1.06 1.06.176.178 1.06-1.061Z" />
          </svg>
          {{ project.link.label }}
        </p>
      </li>
    </ul>
  </div>
</template>
