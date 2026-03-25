<script setup lang="ts">
import { ref } from 'vue'
import { useArchGraphTests } from '~/composables/useDemoTests'

useHead({ title: 'Architecture Graph - Sandbox - Evan Becker', meta: [{ name: 'robots', content: 'noindex' }] })

const archGraphRef = ref<any>(null)
const tests = useArchGraphTests(() => archGraphRef.value)

function statusIcon(status: string): string {
  switch (status) {
    case 'pass': return 'PASS'
    case 'fail': return 'FAIL'
    case 'running': return '...'
    default: return '---'
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/sandbox" class="text-sm text-slate-400 hover:text-slate-200 transition">← Sandbox</NuxtLink>
      <span class="text-slate-600">/</span>
      <h1 class="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-50">Architecture Graph</h1>
    </div>

    <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
      3D force-directed knowledge graph of architecture patterns, quality attributes, and technologies.
    </p>

    <ClientOnly>
      <ArchGraphDemo ref="archGraphRef" />
      <template #fallback>
        <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
          <div class="text-center">
            <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
            <p class="mt-3 text-sm text-slate-400">Loading architecture graph...</p>
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
      <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Architecture decisions form a connected graph, not a linear list. A force-directed 3D layout naturally
        clusters related concepts and separates conflicting ones — the spatial structure itself communicates
        architectural tradeoffs. The JSON-LD format makes this graph consumable by AI systems and knowledge bases.
      </p>
    </div>

    <!-- Tests -->
    <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#0f1729]">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tests</h3>
        <div class="flex items-center gap-3">
          <span v-if="tests.passCount.value > 0 || tests.failCount.value > 0" class="text-xs text-slate-500">
            <span class="text-green-500">{{ tests.passCount.value }} passed</span>
            <span v-if="tests.failCount.value > 0" class="ml-2 text-red-500">{{ tests.failCount.value }} failed</span>
          </span>
          <button @click="tests.run()" :disabled="tests.running.value" class="rounded-lg bg-[#0C65E5] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-50 disabled:cursor-not-allowed">
            {{ tests.running.value ? 'Running...' : 'Run Tests' }}
          </button>
        </div>
      </div>
      <div class="mt-3 space-y-1">
        <div v-for="result in tests.results.value" :key="result.name" class="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
          :class="{ 'bg-green-500/5': result.status === 'pass', 'bg-red-500/5': result.status === 'fail', 'bg-slate-500/5': result.status === 'pending' || result.status === 'running' }"
        >
          <div class="flex items-center gap-2">
            <span class="w-10 rounded px-1 py-0.5 text-center font-mono text-[10px] font-bold"
              :class="{ 'bg-green-500/20 text-green-400': result.status === 'pass', 'bg-red-500/20 text-red-400': result.status === 'fail', 'bg-amber-500/20 text-amber-400': result.status === 'running', 'bg-slate-500/10 text-slate-500': result.status === 'pending' }"
            >{{ statusIcon(result.status) }}</span>
            <span class="text-slate-600 dark:text-slate-300">{{ result.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="result.error" class="max-w-[200px] truncate text-red-400" :title="result.error">{{ result.error }}</span>
            <span v-if="result.duration > 0" class="font-mono text-slate-500">{{ result.duration }}ms</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
