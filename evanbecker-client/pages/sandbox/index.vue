<script setup lang="ts">
useSeoMeta({
  title: 'Sandbox - Evan Becker',
  description: 'Interactive WebGL and 3D demos — ray marching, fractals, homelab topology, and other experiments.',
  ogTitle: 'Sandbox - Evan Becker',
  ogDescription: 'Interactive WebGL and 3D demos — ray marching, fractals, homelab topology, and other experiments.',
  robots: 'noindex',
})

const demos = [
  {
    id: 'raymarcher',
    label: 'Ray Marcher',
    description: 'WebGL2 ray marcher with infinite lattice, Mandelbulb fractal, animated CSG, and Menger Sponge — all with cosine palettes and fresnel lighting.',
    to: '/sandbox/raymarcher',
    icon: '◈',
  },
  {
    id: 'homelab',
    label: 'Homelab Viewer',
    description: 'Interactive 3D topology of the Proxmox homelab — LXC containers, connections, and live status from Uptime Kuma.',
    to: '/sandbox/homelab',
    icon: '⬡',
  },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <h1 class="font-serif text-3xl font-semibold text-slate-900 dark:text-slate-50">Sandbox</h1>
    <p class="mt-2 text-slate-600 dark:text-slate-400">Experiments, demos, and interactive proofs of concept.</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="demo in demos"
        :key="demo.id"
        :to="demo.to"
        class="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-[#2D95FC]/50 hover:shadow-lg hover:shadow-[#2D95FC]/5 dark:border-slate-700 dark:bg-[#0f1729] dark:hover:border-[#2D95FC]/40"
      >
        <div class="mb-3 text-3xl">{{ demo.icon }}</div>
        <h2 class="text-lg font-semibold text-slate-900 group-hover:text-[#2D95FC] dark:text-slate-50 dark:group-hover:text-[#2D95FC] transition">
          {{ demo.label }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ demo.description }}</p>
        <span class="mt-4 inline-block text-xs font-medium text-[#0C65E5] dark:text-[#2D95FC]">Open demo →</span>
      </NuxtLink>
    </div>
  </div>
</template>
