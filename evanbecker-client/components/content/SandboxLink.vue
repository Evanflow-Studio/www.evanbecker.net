<script setup lang="ts">
const props = withDefaults(defineProps<{
  to: string
  label?: string
  description?: string
}>(), {
  label: 'Open in Sandbox',
  description: '',
})
</script>

<template>
  <div class="not-prose my-4">
    <NuxtLink
      :to="to"
      class="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 transition-colors hover:border-[#0C65E5]/50 hover:bg-slate-50 group dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-[#2D95FC]/50 dark:hover:bg-slate-800/80"
    >
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0C65E5]/20 text-[#0C65E5] group-hover:bg-[#0C65E5]/30 transition-colors dark:text-[#2D95FC]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ label }}</p>
        <p v-if="description" class="text-xs text-slate-500 dark:text-slate-500">{{ description }}</p>
      </div>
    </NuxtLink>
  </div>
</template>
