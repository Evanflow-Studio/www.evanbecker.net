<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import { SCENE_NAMES } from '~/utils/shaders/constants'

const props = withDefaults(defineProps<{
  preset?: string
  height?: string
}>(), {
  preset: 'Deep Sea',
  height: 'h-[400px]',
})

const mounted = ref(false)
const focused = ref(false)
const sceneOverridden = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const presetIndex = LATTICE_PRESETS.findIndex(p => p.name.toLowerCase() === props.preset.toLowerCase())
const presetName = presetIndex >= 0 ? LATTICE_PRESETS[presetIndex].name : props.preset

// Show which scene is active when overridden
const overrideLabel = computed(() => {
  if (!sceneOverridden.value) return ''
  const store = useRayMarcherStore()
  return SCENE_NAMES[store.scene.index] ?? 'Custom'
})

function resetToPreset() {
  const store = useRayMarcherStore()
  // Restore the original scene (Infinite Lattice = 0) and preset
  store.scene.index = 0
  store.applySceneDefaults(0)
  if (presetIndex >= 0) store.applyLatticePreset(presetIndex)
  sceneOverridden.value = false
}

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

function onSceneChange(e: Event) {
  const detail = (e as CustomEvent).detail
  if (!detail) return

  // Activate if not already mounted
  if (!mounted.value) {
    const store = useRayMarcherStore()
    store.gl.shaderCompiled = false
    store.gl.shaderCompiling = false
    store.gl.contextCreated = false
    store.gl.error = null
    store.gl.errors = []
    mounted.value = true
  }
  focused.value = true
  sceneOverridden.value = true

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

onMounted(() => {
  containerRef.value?.addEventListener('scene-change', onSceneChange)
})

onUnmounted(() => {
  containerRef.value?.removeEventListener('scene-change', onSceneChange)
  if (outsideListener) {
    window.removeEventListener('click', outsideListener)
    outsideListener = null
  }
})
</script>

<template>
  <div ref="containerRef" class="not-prose my-6" data-ray-march-embed>
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
      <!-- Reset button: appears when scene was changed via SceneLink -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 -translate-x-2"
        leave-to-class="opacity-0 -translate-x-2"
      >
        <button
          v-if="sceneOverridden && focused"
          class="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-black/80 transition-colors border border-slate-600/30"
          @click.stop="resetToPreset"
          :title="`Reset to ${presetName}`"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          <span>{{ presetName }}</span>
        </button>
      </Transition>

      <!-- Defocused overlay: dims the scene, click anywhere to re-focus -->
      <div
        v-if="!focused"
        class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-opacity cursor-pointer"
        @click.stop="activate"
      >
        <p class="text-sm text-slate-300 bg-black/60 rounded-md px-3 py-1.5 pointer-events-none">Click to interact</p>
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
      <p
        class="text-[11px] text-slate-500"
        :class="!focused && 'cursor-pointer hover:text-slate-300 transition-colors'"
        @click="!focused && activate()"
      >
        <template v-if="focused">
          WASD to move · Mouse to look · Click outside to release
        </template>
        <template v-else-if="sceneOverridden">
          Viewing {{ overrideLabel }} · Click to interact
        </template>
        <template v-else>
          Click to interact
        </template>
      </p>
      <button class="text-[11px] text-slate-500 underline hover:text-slate-300 transition-colors" @click="close">
        Close
      </button>
    </div>
  </div>
</template>
