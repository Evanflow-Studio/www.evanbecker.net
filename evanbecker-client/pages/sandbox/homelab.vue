<script setup lang="ts">
import { ref } from 'vue'

useSeoMeta({
  title: 'Homelab Viewer - Sandbox - Evan Becker',
  description: 'Interactive 3D topology of the Proxmox homelab — LXC containers, connections, and live status from Uptime Kuma.',
  ogTitle: 'Homelab Viewer - Sandbox - Evan Becker',
  ogDescription: 'Interactive 3D topology of the Proxmox homelab — LXC containers, connections, and live status.',
  robots: 'noindex',
})

const homelabRef = ref<any>(null)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/sandbox" class="text-sm text-slate-400 hover:text-slate-200 transition">← Sandbox</NuxtLink>
      <span class="text-slate-600">/</span>
      <h1 class="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-50">Homelab Viewer</h1>
    </div>

    <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
      Interactive 3D topology of the Proxmox homelab — LXC containers, connections, and live status.
    </p>

    <ClientOnly>
      <HomelabDemo ref="homelabRef" />
      <template #fallback>
        <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
          <div class="text-center">
            <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
            <p class="mt-3 text-sm text-slate-400">Loading homelab viewer...</p>
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
      <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        A 3D topology view communicates infrastructure relationships far more effectively than flat diagrams.
        Spatial positioning encodes logical grouping, while animated connection pulses show data flow direction
        at a glance. Three.js provides hardware-accelerated rendering with orbit controls, making the diagram
        feel like an interactive model rather than a static image.
      </p>
    </div>
  </div>
</template>
