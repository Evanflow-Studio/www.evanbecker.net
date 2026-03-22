<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-700 dark:bg-[#0B1120] dark:text-slate-300">
    <AppHeader />
    <main class="flex-1">
      <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>
