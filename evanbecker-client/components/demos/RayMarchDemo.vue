<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { useRayMarchEngine } from '~/composables/raymarcher/useRayMarchEngine'

// NOTE: `useSessionHub` and `useVisualizationEngine` are NOT imported here.
// They pull in @microsoft/signalr / meyda / essentia and are only reached via
// <LazyRayMarchLabLayer>, which Nuxt lazy-loads as a separate chunk. Keep it
// that way — any static import of the audio layer from this file would drag
// those libraries back into the core bundle.

const props = defineProps<{
  /** Enables audio visualizer + multiplayer session UI. Gated at the page
   *  level on `isAuthenticated && experiments.rayMarcherLab`. */
  labMode?: boolean
}>()

const store = useRayMarcherStore()

// Canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const shareTooltip = ref('')
let shareTimeout: ReturnType<typeof setTimeout> | null = null

// Audio/session overlay state — only used when labMode is on.
const showAudioPlayer = ref(false)
const showSessionPanel = ref(false)

function onShare() {
  store.exportToUrl()
  shareTooltip.value = 'Copied to clipboard!'
  if (shareTimeout) clearTimeout(shareTimeout)
  shareTimeout = setTimeout(() => { shareTooltip.value = '' }, 2000)
}

// Engine
const engine = useRayMarchEngine(canvasRef)

// Watchers
watch(() => store.render.quality, (q) => store.applyQualityFX(q))
// Only apply scene defaults when NOT driven by the visualization engine
// (the engine manages camera/params itself — defaults would fight it).
// When labMode is off, isCapturing is always false so defaults always apply.
watch(() => store.scene.index, (s) => {
  if (!store.audio.isCapturing) store.applySceneDefaults(s)
})

// Fullscreen
function toggleFullscreen() {
  if (!containerRef.value) return
  document.fullscreenElement ? document.exitFullscreen() : containerRef.value.requestFullscreen()
}
function onFullscreenChange() { isFullscreen.value = !!document.fullscreenElement }

// Mobile joystick
function onJoystickMove(dx: number, dy: number) {
  const fw = engine.getForward()
  const rt = engine.getRight()
  const speed = store.camera.moveSpeed
  engine.applyMovement(fw, dy * speed)
  store.camera.posX -= rt[0] * dx * speed
  store.camera.posZ -= rt[2] * dx * speed
  store.recordInteraction()
}

// Expose for parent refs (debugging / future hooks)
defineExpose({
  canvasRef,
  gl: engine.gl,
  program: engine.program,
  get shaderCompiled() { return store.gl.shaderCompiled },
  get glContextCreated() { return store.gl.contextCreated },
  get glErrors() { return store.gl.errors },
  get fps() { return store.gl.fps },
  get iterations() { return store.scene.iterations },
})

onMounted(async () => {
  store.importFromUrl()
  document.addEventListener('fullscreenchange', onFullscreenChange)

  console.log('[RayMarchDemo] Starting engine...')
  await engine.start()
  console.log('[RayMarchDemo] Engine started.')
})

onUnmounted(() => {
  engine.stop()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full" :class="isFullscreen ? 'bg-black' : ''" tabindex="0">
    <div v-if="store.gl.error" class="flex h-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ store.gl.error }}</p>
    </div>

    <div v-else class="relative h-full" :class="isFullscreen ? 'h-screen' : ''">
      <canvas
        ref="canvasRef"
        class="w-full h-full cursor-grab touch-none"
        :class="[isFullscreen ? 'h-screen' : 'rounded-2xl', store.isMobile && !isFullscreen ? 'max-h-[300px]' : '']"
        @mousedown="engine.onMouseDown"
        @wheel.prevent="engine.onWheel"
        @touchstart.prevent="engine.onTouchStart"
        @touchmove.prevent="engine.onTouchMove"
        @touchend.prevent="engine.onTouchEnd"
        @touchcancel.prevent="engine.onTouchEnd"
      />

      <!-- HUD -->
      <div class="absolute top-3 right-3 flex items-center gap-2">
        <div class="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
          {{ store.effectiveSteps }} steps
        </div>
        <div class="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
          {{ store.gl.fps }} FPS
        </div>
        <div class="relative">
          <button
            class="rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
            :title="shareTooltip || 'Share'"
            @click="onShare"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
          </button>
          <div
            v-if="shareTooltip"
            class="absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-[#2D95FC] px-2 py-1 text-[10px] font-medium text-white shadow-lg"
          >
            {{ shareTooltip }}
          </div>
        </div>
        <!-- Lab-only HUD buttons -->
        <button
          v-if="props.labMode"
          class="rounded-md bg-black/60 px-2 py-1 text-xs transition-colors"
          :class="showAudioPlayer ? 'text-[#2D95FC]' : 'text-slate-300 hover:text-white'"
          title="Music Player"
          @click="showAudioPlayer = !showAudioPlayer"
        >
          ♫
        </button>
        <button
          v-if="props.labMode"
          class="rounded-md bg-black/60 px-2 py-1 text-xs transition-colors"
          :class="showSessionPanel ? 'text-[#2D95FC]' : 'text-slate-300 hover:text-white'"
          title="Jam Session"
          @click="showSessionPanel = !showSessionPanel"
        >
          👥
        </button>
        <button class="rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors" @click="toggleFullscreen">
          {{ isFullscreen ? '✕' : '⛶' }}
        </button>
      </div>

      <!-- Shader compiling overlay -->
      <div v-if="store.gl.shaderCompiling" class="absolute inset-0 flex items-center justify-center bg-[#0B1120]/80 rounded-2xl z-10">
        <div class="text-center">
          <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
          <p class="mt-3 text-sm text-slate-400 font-mono">Compiling shader...</p>
        </div>
      </div>

      <!-- Paused -->
      <div v-if="store.time.paused" class="absolute top-3 left-3 rounded-md bg-black/60 px-3 py-1 text-xs font-mono text-yellow-400">
        PAUSED (Space)
      </div>

      <!-- Mobile joystick -->
      <div v-if="store.isMobile" class="absolute bottom-20 left-4 z-10">
        <MobileJoystick @move="onJoystickMove" />
      </div>

      <!-- Controls -->
      <RayMarchControls
        :lab-mode="props.labMode"
        @screenshot="engine.captureScreenshot"
        @fullscreen="toggleFullscreen"
      />

      <!-- Experimental audio/session layer. Heavy deps (@microsoft/signalr,
           meyda, essentia) ride in here and are only fetched when labMode
           flips on. Uses Nuxt's Lazy prefix so the chunk is async. -->
      <LazyRayMarchLabLayer
        v-if="props.labMode"
        v-model:show-audio-player="showAudioPlayer"
        v-model:show-session-panel="showSessionPanel"
        :engine-gl="engine.gl"
        :canvas-el="canvasRef"
      />
    </div>
  </div>
</template>
