<script setup lang="ts">
const config = useRuntimeConfig()

const navLinks = [
  { name: 'Privacy', href: '/privacy-policy' },
]

const socialLinks = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/evanbeckerdotnet/',
  },
  {
    name: 'GitLab',
    href: 'https://gitlab.com/evanbecker',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/evanjbecker',
  },
]
</script>

<template>
  <footer class="border-t border-slate-200 dark:border-slate-700/50">
    <div class="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8">
      <nav class="flex flex-wrap justify-center gap-x-8 gap-y-2" aria-label="Footer">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.href"
          class="text-sm text-slate-500 transition hover:text-[#0C65E5] dark:text-slate-400 dark:hover:text-[#41A5F7]"
        >
          {{ link.name }}
        </NuxtLink>
      </nav>

      <div class="mt-8 flex justify-center gap-x-6">
        <a
          v-for="link in socialLinks"
          :key="link.name"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="text-slate-400 transition hover:text-[#0C65E5] dark:text-slate-500 dark:hover:text-[#41A5F7]"
        >
          <span class="sr-only">{{ link.name }}</span>
          <IconLinkedIn v-if="link.name === 'LinkedIn'" class="h-5 w-5" />
          <IconGitLab v-if="link.name === 'GitLab'" class="h-5 w-5" />
          <IconGitHub v-if="link.name === 'GitHub'" class="h-5 w-5" />
        </a>
      </div>

      <p class="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        &copy; {{ new Date().getFullYear() }} Evanflow LLC. All rights reserved.
        <span v-if="config.public.appVersion !== 'dev'" class="ml-2 text-slate-500/50">
          v{{ config.public.appVersion }}
        </span>
      </p>
    </div>
  </footer>
</template>
