<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRayMarcherStore, QUALITY_PRESETS } from '~/stores/raymarcher'
import { useRayMarchEngine } from '~/composables/raymarcher/useRayMarchEngine'
import { ANIMATION } from '~/utils/shaders/constants'

const store = useRayMarcherStore()

// Canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

// Engine
const engine = useRayMarchEngine(canvasRef)

// Watchers
watch(() => store.render.quality, (q) => store.applyQualityFX(q))
watch(() => store.scene.index, (s) => store.applySceneDefaults(s))

// Fullscreen
function toggleFullscreen() {
  if (!containerRef.value) return
  document.fullscreenElement ? document.exitFullscreen() : containerRef.value.requestFullscreen()
}
function onFullscreenChange() { isFullscreen.value = !!document.fullscreenElement }

// Custom GLSL
function applyCustomGlsl() {
  const code = store.scripting.customGlsl.trim()
  if (!code) { store.scripting.glslError = ''; return }
  if (engine.recompileWithCustomGlsl(code)) {
    store.scripting.glslError = ''
    store.lattice.animation = ANIMATION.Custom
  } else {
    store.scripting.glslError = 'Compilation failed — check your GLSL syntax'
  }
}

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

// Expose for tests
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
  await engine.start()
})

onUnmounted(() => {
  engine.stop()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full" :class="isFullscreen ? 'bg-black' : ''" tabindex="0">
    <div v-if="store.gl.error" class="flex h-[500px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ store.gl.error }}</p>
    </div>

    <div v-else class="relative" :class="isFullscreen ? 'h-screen' : ''">
      <canvas
        ref="canvasRef"
        class="w-full cursor-grab touch-none"
        :class="[isFullscreen ? 'h-screen' : 'h-[500px] rounded-2xl', store.isMobile ? 'h-[300px]' : '']"
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
          {{ QUALITY_PRESETS[store.render.quality].steps }} steps
        </div>
        <div class="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
          {{ store.gl.fps }} FPS
        </div>
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
        @screenshot="engine.captureScreenshot"
        @fullscreen="toggleFullscreen"
        @apply-glsl="applyCustomGlsl"
      />
    </div>
  </div>
</template>
