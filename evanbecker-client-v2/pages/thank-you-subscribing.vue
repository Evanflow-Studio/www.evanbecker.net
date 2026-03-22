<script setup lang="ts">
useHead({ title: 'Subscribed! - Evan Becker' })
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-24 text-center sm:py-32">
    <h1 class="font-serif text-4xl font-semibold text-slate-900 dark:text-slate-50">
      You're subscribed!
    </h1>
    <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
      Thanks for subscribing. I'll send you an email whenever I publish something new.
    </p>
    <NuxtLink
      to="/"
      class="mt-8 inline-block rounded-xl bg-[#0C65E5] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2D95FC]"
    >
      Go back home
    </NuxtLink>
  </div>
</template>
