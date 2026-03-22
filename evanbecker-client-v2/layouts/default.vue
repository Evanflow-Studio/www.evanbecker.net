<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-700 dark:bg-[#0B1120] dark:text-slate-300">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
