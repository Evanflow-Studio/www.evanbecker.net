<script setup lang="ts">
import { ref, computed } from 'vue'

useSeoMeta({
  title: 'Ray Marcher - Sandbox - Evan Becker',
  description: 'WebGL2 ray marcher with infinite lattice, Mandelbulb fractal, animated CSG, and Menger Sponge — cosine palettes and fresnel lighting.',
  ogTitle: 'Ray Marcher - Sandbox - Evan Becker',
  ogDescription: 'WebGL2 ray marcher with infinite lattice, Mandelbulb fractal, animated CSG, and Menger Sponge.',
  robots: 'noindex',
})

const rayMarchRef = ref<any>(null)
const experiments = useExperiments()

// Auth state — same dynamic-import pattern used elsewhere to avoid SSR issues
// with @auth0/auth0-vue. The experimental raymarcher layer is gated on BOTH
// isAuthenticated AND the opt-in flag — someone hand-editing localStorage
// without being signed in doesn't unlock it.
const isAuthenticated = ref(false)
if (import.meta.client) {
  try {
    const { useAuth0 } = await import('@auth0/auth0-vue')
    const auth0 = useAuth0()
    isAuthenticated.value = auth0.isAuthenticated.value
    watch(() => auth0.isAuthenticated.value, (v: boolean) => { isAuthenticated.value = v })
  } catch { /* auth0 not configured — labMode stays false, fine */ }
}

const labMode = computed(() => isAuthenticated.value && experiments.value.rayMarcherLab)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/sandbox" class="text-sm text-slate-400 hover:text-slate-200 transition">← Sandbox</NuxtLink>
      <span class="text-slate-600">/</span>
      <h1 class="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-50">Ray Marcher</h1>
    </div>

    <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
      WebGL2 ray marcher with four scenes: infinite lattice, Mandelbulb fractal, animated CSG operations,
      and a Menger Sponge with seamless infinite zoom — all with Inigo Quilez cosine palettes, fresnel rim
      lighting, and near-miss glow.
    </p>

    <ClientOnly>
      <div class="h-[500px]">
        <RayMarchDemo ref="rayMarchRef" :lab-mode="labMode" />
      </div>
      <template #fallback>
        <div class="flex h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f1729]">
          <div class="text-center">
            <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
            <p class="mt-3 text-sm text-slate-400">Loading ray marcher...</p>
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="mt-6 rounded-xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-700/40 dark:bg-slate-800/30">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Why this approach</h3>
      <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Ray marching evaluates signed distance functions directly in the fragment shader, enabling infinite
        geometric detail without mesh complexity. The Infinite Lattice uses domain repetition to create an
        endless world of hollow cubes. The Mandelbulb demonstrates fractal self-similarity with orbit trap
        coloring. Inigo Quilez cosine palettes generate mathematically smooth color gradients, while fresnel
        rim lighting and near-miss glow add depth. Everything runs entirely on the GPU.
      </p>
    </div>
  </div>
</template>
