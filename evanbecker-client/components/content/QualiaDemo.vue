<script setup lang="ts">
defineProps<{
  /** Any valid CSS color — displayed as a swatch alongside the caption. */
  color: string
}>()
</script>

<template>
  <div class="not-prose my-6 flex items-center gap-4 rounded-xl border border-slate-300 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800/40">
    <div class="h-14 w-14 shrink-0 rounded-md ring-1 ring-slate-300 dark:ring-slate-700" :style="{ background: color }" />
    <div class="text-sm italic leading-relaxed text-slate-700 dark:text-slate-300">
      <slot />
    </div>
  </div>
</template>
