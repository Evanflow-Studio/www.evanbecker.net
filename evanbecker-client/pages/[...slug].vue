<script setup lang="ts">
useHead({ title: '404 - Evan Becker' })

definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-24 text-center sm:py-32">
    <p class="text-base font-semibold text-[#2D95FC]">404</p>
    <h1 class="mt-4 font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      Page not found
    </h1>
    <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
      Sorry, I couldn't find the page you're looking for.
    </p>
    <NuxtLink
      to="/"
      class="mt-8 inline-block rounded-xl bg-[#0C65E5] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2D95FC]"
    >
      Go back home
    </NuxtLink>
  </div>
</template>
