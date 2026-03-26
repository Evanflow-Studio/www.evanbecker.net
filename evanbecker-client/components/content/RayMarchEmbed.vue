<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'

const props = withDefaults(defineProps<{
  preset?: string
  height?: string
}>(), {
  preset: 'Deep Sea',
  height: 'h-[400px]',
})

const mounted = ref(false)    // Has the ray marcher been created? (persists)
const focused = ref(false)    // Is the user interacting with it? (toggles on click in/out)
const containerRef = ref<HTMLElement | null>(null)

const presetIndex = LATTICE_PRESETS.findIndex(p => p.name.toLowerCase() === props.preset.toLowerCase())
const presetName = presetIndex >= 0 ? LATTICE_PRESETS[presetIndex].name : props.preset

let outsideListener: ((e: MouseEvent) => void) | null = null

function activate() {
  if (!mounted.value) {
    // First activation: reset GL state and apply preset
    const store = useRayMarcherStore()
    store.gl.shaderCompiled = false
    store.gl.shaderCompiling = false
    store.gl.contextCreated = false
    store.gl.error = null
    store.gl.errors = []
    if (presetIndex >= 0) store.applyLatticePreset(presetIndex)
    mounted.value = true
  }
  focused.value = true

  // Register click-outside after current click finishes propagating
  if (!outsideListener) {
    setTimeout(() => {
      outsideListener = (e: MouseEvent) => {
        if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
          blur()
        }
      }
      window.addEventListener('click', outsideListener)
    }, 0)
  }
}

function blur() {
  // Don't destroy the component, just defocus
  focused.value = false
}

function close() {
  // Fully destroy the ray marcher (explicit user action only)
  focused.value = false
  mounted.value = false
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
    <!-- Inactive: thumbnail with play button (only before first activation) -->
    <div
      v-if="!mounted"
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

    <!-- Active: ray marcher stays alive, focus/blur controls interaction -->
    <div
      v-else
      class="relative rounded-2xl border overflow-hidden transition-colors"
      :class="[
        height,
        focused ? 'border-[#2D95FC]/30' : 'border-slate-700 cursor-pointer',
      ]"
      @click="!focused && activate()"
    >
      <!-- Defocused overlay: dims the scene, click to re-focus -->
      <div
        v-if="!focused"
        class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-opacity"
      >
        <p class="text-sm text-slate-300 bg-black/60 rounded-md px-3 py-1.5">Click to interact</p>
      </div>

      <ClientOnly>
        <RayMarchDemo />
        <template #fallback>
          <div class="flex items-center justify-center h-full bg-[#0B1120]">
            <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
          </div>
        </template>
      </ClientOnly>
    </div>

    <div v-if="mounted" class="mt-2 flex items-center justify-center gap-3">
      <p class="text-[11px] text-slate-500">
        {{ focused ? 'WASD to move · Mouse to look · Click outside to release' : 'Click to interact' }}
      </p>
      <button class="text-[11px] text-slate-500 underline hover:text-slate-300 transition-colors" @click="close">
        Close
      </button>
    </div>
  </div>
</template>
