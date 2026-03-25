<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRayMarchGL, type QualityPreset, type SceneDefault } from '~/composables/useRayMarchGL'
import { useUrlState } from '~/composables/useUrlState'
import { useCommandDispatcher, type RayMarchCommand } from '~/composables/useCommandDispatcher'
import { LATTICE_PRESETS, type LatticePreset } from '~/utils/shaders/lattice-presets'
import { ANIMATION, CAMERA_DEFAULTS } from '~/utils/shaders/constants'

// Canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Scene & appearance
const scene = ref(0)
const palette = ref(1)
const iterations = ref(6)
const lightAngleX = ref(0.5)
const lightAngleY = ref(0.7)

// FPS camera
const cameraPosX = ref(0)
const cameraPosY = ref(0)
const cameraPosZ = ref(3)
const cameraYaw = ref(0.8)
const cameraPitch = ref(0.0)
const autoRotate = ref(false)
const lastInteraction = ref(0)

// Quality
const quality = ref(1)
const qualityPresets: QualityPreset[] = [
  { name: 'Performance', steps: 32,  threshold: 0.005,  maxDist: 100,  warpCorrection: 1.0, bloom: 0,   chroma: 0 },
  { name: 'Balanced',    steps: 64,  threshold: 0.002,  maxDist: 300,  warpCorrection: 0.8, bloom: 0.3, chroma: 0.5 },
  { name: 'High',        steps: 96,  threshold: 0.001,  maxDist: 600,  warpCorrection: 0.6, bloom: 0.6, chroma: 1.0 },
  { name: 'Ultra',       steps: 128, threshold: 0.0005, maxDist: 1200, warpCorrection: 0.3, bloom: 1.0, chroma: 1.5 },
]

// Auto-apply FX when quality changes
watch(quality, (q) => {
  const preset = qualityPresets[q]
  bloomStrength.value = preset.bloom
  chromaticAmount.value = preset.chroma
})

// Lattice controls
const cellSpacing = ref(0.08)
const wallThickness = ref(0.5)
const geoPreset = ref(0)
const animation = ref(0)
const latticePreset = ref(3) // Deep Sea
const animOffset = ref(0.0)

// Rendering
const wireframe = ref(false)

// Time control
const timePaused = ref(false)
const timeSpeed = ref(1.0)

// Post-processing
const bloomStrength = ref(0)
const chromaticAmount = ref(0)

// Fog, movement & zoom
const fogDensity = ref(0.001)
const moveSpeed = ref(CAMERA_DEFAULTS.MOVE_SPEED)
const zoom = ref(1.0)
const showMinimap = ref(false)

// Custom palette (IQ cosine: a + b * cos(2π(c*t + d)))
const paletteA = ref<[number, number, number]>([0.5, 0.5, 0.5])
const paletteB = ref<[number, number, number]>([0.5, 0.5, 0.5])
const paletteC = ref<[number, number, number]>([1.0, 1.0, 1.0])
const paletteD = ref<[number, number, number]>([0.0, 0.33, 0.67])

// Scripting
const customGlsl = ref('')
const customJs = ref('')
const glslError = ref('')

function applyCustomGlsl() {
  const code = customGlsl.value.trim()
  if (!code) {
    glslError.value = ''
    return
  }
  const success = recompileWithCustomGlsl(code)
  if (success) {
    glslError.value = ''
    animation.value = ANIMATION.Custom
  } else {
    glslError.value = 'Compilation failed — check your GLSL syntax'
  }
}

// URL state
const urlState = useUrlState({
  scene, palette, quality, geoPreset, animation,
  cellSpacing, wallThickness, animOffset, wireframe,
  bloomStrength, chromaticAmount, timeSpeed,
  cameraPosX, cameraPosY, cameraPosZ, cameraYaw, cameraPitch,
  moveSpeed, fogDensity,
})

// Lattice preset is now applied via the command dispatcher

// Per-scene camera defaults
const sceneDefaults: SceneDefault[] = [
  { pos: [0, 0, 3], yaw: 0.8, pitch: 0 },
  { pos: [0, 0, 2.5], yaw: 0, pitch: 0 },
  { pos: [0, 0, 10], yaw: 0, pitch: 0 },
  { pos: [0, 0, 3], yaw: 0, pitch: 0 },
]

watch(scene, (s) => {
  const def = sceneDefaults[s]
  cameraPosX.value = def.pos[0]
  cameraPosY.value = def.pos[1]
  cameraPosZ.value = def.pos[2]
  cameraYaw.value = def.yaw
  cameraPitch.value = def.pitch
  lastInteraction.value = performance.now()
})

// Mobile detection
const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768
}

// Default to Performance on mobile
if (isMobile.value) {
  quality.value = 0
}

// WebGL engine
const {
  fps, error, shaderCompiled, shaderCompiling, glContextCreated, glErrors, orbitProgress,
  gl, program, onMouseDown, onWheel,
  onTouchStart, onTouchMove, onTouchEnd,
  applyMovement, getForward, getRight,
  captureScreenshot, recompileWithCustomGlsl, start, stop,
} = useRayMarchGL({
  canvasRef, scene, palette, iterations, lightAngleX, lightAngleY,
  cameraPosX, cameraPosY, cameraPosZ, cameraYaw, cameraPitch,
  autoRotate, lastInteraction,
  cellSpacing, wallThickness, geoPreset, animation, quality,
  wireframe, animOffset,
  timePaused, timeSpeed,
  bloomStrength, chromaticAmount,
  fogDensity, zoom, showMinimap, paletteA, paletteB, paletteC, paletteD,
  customGlsl, customJs,
  qualityPresets, sceneDefaults,
  orbitDelay: CAMERA_DEFAULTS.ORBIT_DELAY_MS,
  moveSpeed,
  lookSpeed: CAMERA_DEFAULTS.LOOK_SPEED,
})

// Expose for tests
defineExpose({
  canvasRef, gl, program, shaderCompiled, glContextCreated, glErrors, fps, iterations,
})

// Mobile joystick handler
function onJoystickMove(dx: number, dy: number) {
  const fw = getForward()
  const rt = getRight()
  const speed = moveSpeed.value
  // Forward/back from joystick Y
  applyMovement(fw, dy * speed)
  // Strafe from joystick X
  cameraPosX.value -= rt[0] * dx * speed
  cameraPosZ.value -= rt[2] * dx * speed
  lastInteraction.value = performance.now()
}

// Fullscreen
const containerRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!containerRef.value) return
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// Command dispatcher — single entry point for all control interactions
const { dispatch } = useCommandDispatcher(
  {
    scene, palette, quality, iterations, geoPreset, animation, latticePreset,
    cellSpacing, wallThickness, animOffset, wireframe,
    bloomStrength, chromaticAmount, fogDensity,
    autoRotate, moveSpeed, timePaused, timeSpeed,
    customGlsl, customJs,
    paletteA, paletteB, paletteC, paletteD, lastInteraction,
  },
  {
    captureScreenshot,
    copyShareUrl: () => urlState.copyShareUrl(),
    toggleFullscreen,
    applyCustomGlsl,
    applyLatticePreset: (i: number) => {
      const preset = LATTICE_PRESETS[i]
      palette.value = preset.palette
      geoPreset.value = preset.geoPreset
      animation.value = preset.animation
      cellSpacing.value = preset.cellSpacing
      wallThickness.value = preset.wallThickness
      animOffset.value = preset.animOffset
      lightAngleX.value = preset.lightAngleX
      lightAngleY.value = preset.lightAngleY
      wireframe.value = preset.wireframe
    },
  },
)

onMounted(async () => {
  // Apply default preset on load
  const preset = LATTICE_PRESETS[latticePreset.value]
  palette.value = preset.palette
  geoPreset.value = preset.geoPreset
  animation.value = preset.animation
  cellSpacing.value = preset.cellSpacing
  wallThickness.value = preset.wallThickness
  animOffset.value = preset.animOffset
  lightAngleX.value = preset.lightAngleX
  lightAngleY.value = preset.lightAngleY
  wireframe.value = preset.wireframe

  document.addEventListener('fullscreenchange', onFullscreenChange)
  await start()
})

onUnmounted(() => {
  stop()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full" :class="isFullscreen ? 'bg-black' : ''" tabindex="0">
    <!-- Error overlay -->
    <div v-if="error" class="flex h-[500px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Canvas -->
    <div v-else class="relative" :class="isFullscreen ? 'h-screen' : ''">
      <canvas
        ref="canvasRef"
        class="w-full cursor-grab touch-none"
        :class="[
          isFullscreen ? 'h-screen' : 'h-[500px] rounded-2xl',
          isMobile ? 'h-[300px]' : '',
        ]"
        @mousedown="onMouseDown"
        @wheel.prevent="onWheel"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend.prevent="onTouchEnd"
        @touchcancel.prevent="onTouchEnd"
      />

      <!-- Top-right overlay -->
      <div class="absolute top-3 right-3 flex items-center gap-2">
        <div class="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
          {{ qualityPresets[quality].steps }} steps
        </div>
        <div class="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
          {{ fps }} FPS
        </div>
        <button
          class="rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
          :title="isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '✕' : '⛶' }}
        </button>
      </div>

      <!-- Shader compiling overlay -->
      <div v-if="shaderCompiling" class="absolute inset-0 flex items-center justify-center bg-[#0B1120]/80 rounded-2xl z-10">
        <div class="text-center">
          <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#2D95FC]" />
          <p class="mt-3 text-sm text-slate-400 font-mono">Compiling shader...</p>
        </div>
      </div>

      <!-- Paused indicator -->
      <div v-if="timePaused" class="absolute top-3 left-3 rounded-md bg-black/60 px-3 py-1 text-xs font-mono text-yellow-400">
        PAUSED (Space)
      </div>

      <!-- Mobile joystick -->
      <div v-if="isMobile" class="absolute bottom-20 left-4 z-10">
        <MobileJoystick @move="onJoystickMove" />
      </div>

      <!-- Controls -->
      <RayMarchControls
        :scene="scene"
        :palette="palette"
        :quality="quality"
        :iterations="iterations"
        :auto-rotate="autoRotate"
        :orbit-progress="orbitProgress"
        :cell-spacing="cellSpacing"
        :wall-thickness="wallThickness"
        :geo-preset="geoPreset"
        :animation="animation"
        :wireframe="wireframe"
        :anim-offset="animOffset"
        :lattice-preset="latticePreset"
        :bloom-strength="bloomStrength"
        :chromatic-amount="chromaticAmount"
        :fog-density="fogDensity"
        :move-speed="moveSpeed"
        :time-paused="timePaused"
        :time-speed="timeSpeed"
        :custom-glsl="customGlsl"
        :custom-js="customJs"
        :glsl-error="glslError"
        @command="dispatch"
      />
    </div>
  </div>
</template>
