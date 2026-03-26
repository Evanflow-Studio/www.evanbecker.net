<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'

const props = withDefaults(defineProps<{
  preset?: string
  height?: string
}>(), {
  preset: 'Deep Sea',
  height: 'h-[400px]',
})

const activated = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const presetIndex = LATTICE_PRESETS.findIndex(p => p.name.toLowerCase() === props.preset.toLowerCase())
const presetName = presetIndex >= 0 ? LATTICE_PRESETS[presetIndex].name : props.preset

let outsideListener: ((e: MouseEvent) => void) | null = null

function activate() {
  // Reset GL status so the engine starts fresh
  const store = useRayMarcherStore()
  store.gl.shaderCompiled = false
  store.gl.shaderCompiling = false
  store.gl.contextCreated = false
  store.gl.error = null
  store.gl.errors = []

  // Apply the requested preset
  if (presetIndex >= 0) {
    store.applyLatticePreset(presetIndex)
  }

  activated.value = true

  // Register click-outside AFTER the current click event finishes propagating.
  // Without this delay, the activate click itself triggers deactivation because
  // v-if swaps the DOM and the original click target is no longer inside the container.
  setTimeout(() => {
    outsideListener = (e: MouseEvent) => {
      if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
        deactivate()
      }
    }
    window.addEventListener('click', outsideListener)
  }, 0)
}

function deactivate() {
  activated.value = false
  if (outsideListener) {
    window.removeEventListener('click', outsideListener)
    outsideListener = null
  }
}

onUnmounted(() => {
  if (outsideListener) {
    window.removeEventListener('click', outsideListener)
    outsideListener = null
  }
})
</script>

<template>
  <div ref="containerRef" class="not-prose my-6">
    <!-- Inactive: thumbnail with play button -->
    <div
      v-if="!activated"
      class="relative cursor-pointer rounded-2xl border border-slate-700 bg-[#0B1120] overflow-hidden group"
      :class="height"
      @click="activate"
    >
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900/80 to-[#0B1120]/90">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#0C65E5]/20 border border-[#2D95FC]/40 group-hover:bg-[#0C65E5]/30 group-hover:border-[#2D95FC]/60 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[#2D95FC] ml-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-slate-200">Interactive Ray Marcher</p>
          <p class="text-xs text-slate-500 mt-1">{{ presetName }} preset — click to activate</p>
        </div>
      </div>
    </div>

    <!-- Active: full ray marcher -->
    <div v-else class="rounded-2xl border border-[#2D95FC]/30 overflow-hidden" :class="height">
      <ClientOnly>
        <RayMarchDemo />
        <template #fallback>
          <div class="flex items-center justify-center h-full bg-[#0B1120]">
            <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
          </div>
        </template>
      </ClientOnly>
    </div>

    <div v-if="activated" class="mt-2 flex items-center justify-center gap-3">
      <p class="text-[11px] text-slate-500">WASD to move · Mouse to look</p>
      <button class="text-[11px] text-slate-500 underline hover:text-slate-300 transition-colors" @click="deactivate">
        Close
      </button>
    </div>
  </div>
</template>
