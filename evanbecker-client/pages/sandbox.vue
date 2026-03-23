<script setup lang="ts">
import { ref } from 'vue'
import { useRayMarchTests, useHomelabTests, useArchGraphTests, type DemoTestSuite } from '~/composables/useDemoTests'

useHead({ title: 'Sandbox - Evan Becker', meta: [{ name: 'robots', content: 'noindex' }] })

interface DemoTab {
  id: string
  label: string
  description: string
  caseText: string
}

const tabs: DemoTab[] = [
  {
    id: 'raymarcher',
    label: 'Ray Marcher',
    description: 'WebGL2 Mandelbulb fractal with real-time ray marching, soft shadows, and ambient occlusion.',
    caseText: 'Ray marching is the best approach for rendering complex fractals in real-time. Unlike polygonal rendering, it evaluates distance functions directly in the fragment shader, enabling infinite geometric detail without mesh complexity. The Mandelbulb demonstrates how a simple iterative formula in 3D polar coordinates produces staggering organic complexity — each iteration revealing finer self-similar structures while the GPU cost stays bounded by the fixed march step count. Soft shadows and ambient occlusion add physical plausibility without requiring a separate render pass. This runs entirely on the GPU with zero JavaScript per-frame overhead beyond uniform uploads.',
  },
  {
    id: 'homelab',
    label: 'Homelab Viewer',
    description: 'Interactive 3D topology of the Proxmox homelab — LXC containers, connections, and live status.',
    caseText: 'A 3D topology view communicates infrastructure relationships far more effectively than flat diagrams. Spatial positioning encodes logical grouping (databases together, external services at the periphery), while animated connection pulses show data flow direction at a glance. The click-to-inspect pattern lets viewers drill into any node without cluttering the overview. Three.js provides hardware-accelerated rendering with orbit controls, making the diagram feel like an interactive model rather than a static image. This directly represents the actual Proxmox homelab described in the infrastructure docs.',
  },
  {
    id: 'archgraph',
    label: 'Architecture Graph',
    description: '3D force-directed knowledge graph of architecture patterns, quality attributes, and technologies.',
    caseText: 'Architecture decisions form a connected graph, not a linear list. Patterns enable certain qualities while conflicting with others; technologies require or enhance specific patterns. A force-directed 3D layout naturally clusters related concepts and separates conflicting ones — the spatial structure itself communicates architectural tradeoffs. The JSON-LD format makes this graph consumable by AI systems and knowledge bases. Search and category filtering let you explore specific dimensions without losing the full context. The export feature enables downstream analysis and integration with ADR tooling.',
  },
]

const activeTab = ref('raymarcher')

// Component refs for test access
const rayMarchRef = ref<any>(null)
const homelabRef = ref<any>(null)
const archGraphRef = ref<any>(null)

// Test suites
const rayMarchTests = useRayMarchTests(() => rayMarchRef.value)
const homelabTests = useHomelabTests(() => homelabRef.value)
const archGraphTests = useArchGraphTests(() => archGraphRef.value)

function getTestSuite(tabId: string): DemoTestSuite {
  switch (tabId) {
    case 'raymarcher': return rayMarchTests
    case 'homelab': return homelabTests
    case 'archgraph': return archGraphTests
    default: return rayMarchTests
  }
}

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
    <h1 class="font-serif text-3xl font-semibold text-slate-900 dark:text-slate-50">Sandbox</h1>
    <p class="mt-2 text-slate-600 dark:text-slate-400">Experiments, demos, and interactive proofs of concept.</p>

    <!-- Tab bar -->
    <div class="mt-8 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#1E293B]">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === tab.id
          ? 'bg-white text-slate-900 shadow-sm dark:bg-[#0B1120] dark:text-slate-50'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Ray Marcher -->
    <div v-show="activeTab === 'raymarcher'" class="mt-6">
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ tabs[0].description }}</p>
      <ClientOnly>
        <RayMarchDemo ref="rayMarchRef" />
        <template #fallback>
          <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
            <p class="text-sm text-slate-400">Loading ray marcher...</p>
          </div>
        </template>
      </ClientOnly>

      <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ tabs[0].caseText }}</p>
      </div>

      <!-- Tests -->
      <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#0f1729]">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tests</h3>
          <div class="flex items-center gap-3">
            <span v-if="rayMarchTests.passCount.value > 0 || rayMarchTests.failCount.value > 0" class="text-xs text-slate-500">
              <span class="text-green-500">{{ rayMarchTests.passCount.value }} passed</span>
              <span v-if="rayMarchTests.failCount.value > 0" class="ml-2 text-red-500">{{ rayMarchTests.failCount.value }} failed</span>
            </span>
            <button @click="rayMarchTests.run()" :disabled="rayMarchTests.running.value" class="rounded-lg bg-[#0C65E5] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-50 disabled:cursor-not-allowed">
              {{ rayMarchTests.running.value ? 'Running...' : 'Run Tests' }}
            </button>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <div v-for="result in rayMarchTests.results.value" :key="result.name" class="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
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

    <!-- Homelab Viewer -->
    <div v-show="activeTab === 'homelab'" class="mt-6">
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ tabs[1].description }}</p>
      <ClientOnly>
        <HomelabDemo ref="homelabRef" />
        <template #fallback>
          <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
            <p class="text-sm text-slate-400">Loading homelab viewer...</p>
          </div>
        </template>
      </ClientOnly>

      <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ tabs[1].caseText }}</p>
      </div>

      <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#0f1729]">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tests</h3>
          <div class="flex items-center gap-3">
            <span v-if="homelabTests.passCount.value > 0 || homelabTests.failCount.value > 0" class="text-xs text-slate-500">
              <span class="text-green-500">{{ homelabTests.passCount.value }} passed</span>
              <span v-if="homelabTests.failCount.value > 0" class="ml-2 text-red-500">{{ homelabTests.failCount.value }} failed</span>
            </span>
            <button @click="homelabTests.run()" :disabled="homelabTests.running.value" class="rounded-lg bg-[#0C65E5] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-50 disabled:cursor-not-allowed">
              {{ homelabTests.running.value ? 'Running...' : 'Run Tests' }}
            </button>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <div v-for="result in homelabTests.results.value" :key="result.name" class="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
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

    <!-- Architecture Graph -->
    <div v-show="activeTab === 'archgraph'" class="mt-6">
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ tabs[2].description }}</p>
      <ClientOnly>
        <ArchGraphDemo ref="archGraphRef" />
        <template #fallback>
          <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
            <p class="text-sm text-slate-400">Loading architecture graph...</p>
          </div>
        </template>
      </ClientOnly>

      <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ tabs[2].caseText }}</p>
      </div>

      <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#0f1729]">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tests</h3>
          <div class="flex items-center gap-3">
            <span v-if="archGraphTests.passCount.value > 0 || archGraphTests.failCount.value > 0" class="text-xs text-slate-500">
              <span class="text-green-500">{{ archGraphTests.passCount.value }} passed</span>
              <span v-if="archGraphTests.failCount.value > 0" class="ml-2 text-red-500">{{ archGraphTests.failCount.value }} failed</span>
            </span>
            <button @click="archGraphTests.run()" :disabled="archGraphTests.running.value" class="rounded-lg bg-[#0C65E5] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-50 disabled:cursor-not-allowed">
              {{ archGraphTests.running.value ? 'Running...' : 'Run Tests' }}
            </button>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <div v-for="result in archGraphTests.results.value" :key="result.name" class="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
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
  </div>
</template>
