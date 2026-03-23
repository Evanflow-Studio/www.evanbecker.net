<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRayMarchGL, type QualityPreset, type PlacedObject, type SceneDefault } from '~/composables/useRayMarchGL'
import { useAudioReactive } from '~/composables/useAudioReactive'
import { useUrlState } from '~/composables/useUrlState'
import { LATTICE_PRESETS, type LatticePreset } from '~/utils/shaders/lattice-presets'

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
const autoRotate = ref(true)
const lastInteraction = ref(0)

// Quality
const quality = ref(2)
const qualityPresets: QualityPreset[] = [
  { name: 'Performance', steps: 64,  threshold: 0.003, maxDist: 500,  warpCorrection: 1.0,  bloom: 0,   chroma: 0,   vignette: 0 },
  { name: 'Balanced',    steps: 128, threshold: 0.001, maxDist: 1000, warpCorrection: 0.8,  bloom: 0.3, chroma: 0.5, vignette: 0 },
  { name: 'High',        steps: 256, threshold: 0.0005, maxDist: 2000, warpCorrection: 0.5, bloom: 0.6, chroma: 1.0, vignette: 0 },
  { name: 'Ultra',       steps: 512, threshold: 0.0001, maxDist: 4000, warpCorrection: 0.15, bloom: 1.0, chroma: 1.5, vignette: 0 },
]

// Auto-apply FX when quality changes
watch(quality, (q) => {
  const preset = qualityPresets[q]
  bloomStrength.value = preset.bloom
  chromaticAmount.value = preset.chroma
  vignetteStrength.value = preset.vignette
})

// Lattice controls
const cellSpacing = ref(0.08)
const wallThickness = ref(0.5)
const geoPreset = ref(0)
const animation = ref(0)
const latticePreset = ref(0)
const animOffset = ref(0.0)

// Placement & rendering
const placedObjects = ref<PlacedObject[]>([])
const placeMode = ref(false)
const placeShape = ref(0)
const wireframe = ref(false)

// Time control
const timePaused = ref(false)
const timeSpeed = ref(1.0)

// Post-processing
const bloomStrength = ref(0)
const chromaticAmount = ref(0)
const vignetteStrength = ref(0)

// Audio color reactivity
const colorReact = ref(0)

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
    animation.value = 9 // Switch to Custom animation
  } else {
    glslError.value = 'Compilation failed — check your GLSL syntax'
  }
}

// Audio
const audio = useAudioReactive()

// URL state
const urlState = useUrlState({
  scene, palette, quality, geoPreset, animation,
  cellSpacing, wallThickness, animOffset, wireframe,
  bloomStrength, chromaticAmount, colorReact, timeSpeed,
  cameraPosX, cameraPosY, cameraPosZ, cameraYaw, cameraPitch,
})

// Apply lattice preset
function applyLatticePreset(preset: LatticePreset) {
  palette.value = preset.palette
  geoPreset.value = preset.geoPreset
  animation.value = preset.animation
  cellSpacing.value = preset.cellSpacing
  wallThickness.value = preset.wallThickness
  animOffset.value = preset.animOffset
  lightAngleX.value = preset.lightAngleX
  lightAngleY.value = preset.lightAngleY
  wireframe.value = preset.wireframe
}

watch(latticePreset, (i) => {
  applyLatticePreset(LATTICE_PRESETS[i])
  lastInteraction.value = performance.now()
})

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

// WebGL engine
const isDragging = ref(false)

const {
  fps, error, shaderCompiled, glContextCreated, glErrors, orbitProgress,
  gl, program, onMouseDown, onWheel, placeObjectAhead, clearPlacedObjects,
  undoLastPlacement, captureScreenshot, recompileWithCustomGlsl, start, stop,
} = useRayMarchGL({
  canvasRef, scene, palette, iterations, lightAngleX, lightAngleY,
  cameraPosX, cameraPosY, cameraPosZ, cameraYaw, cameraPitch,
  autoRotate, lastInteraction,
  cellSpacing, wallThickness, geoPreset, animation, quality,
  placedObjects, placeMode, wireframe, animOffset, placeShape, placeDistance: 3.0,
  timePaused, timeSpeed,
  bloomStrength, chromaticAmount, vignetteStrength,
  audioBass: audio.bass, audioMid: audio.mid, audioTreble: audio.treble, audioAmplitude: audio.amplitude,
  colorReact, customGlsl, customJs,
  qualityPresets, sceneDefaults, orbitDelay: 2000,
  moveSpeed: 0.08, lookSpeed: 0.005,
})

// Expose for tests
defineExpose({
  canvasRef, gl, program, shaderCompiled, glContextCreated, glErrors, fps, iterations,
})

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

function onControlUpdate() {
  lastInteraction.value = performance.now()
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  onMouseDown(e)
}

function handleMouseUp() {
  isDragging.value = false
}

function handleAudioSource(source: string) {
  if (source === 'none') audio.stop()
  else if (source === 'generated') audio.startDefault(scene.value)
  else if (source === 'track') audio.startTrack('/audio/chill-ambient-loop.mp3', 'Chill Ambient Loop')
  else if (source === 'mic') audio.startMic()
}

// Restart drone with new tones when scene changes (if drone is active)
watch(scene, (s) => {
  if (audio.source.value === 'generated') {
    audio.startDefault(s)
  }
})

function handleAudioFile(file: File) {
  audio.startFile(file)
}

onMounted(() => {
  start()
  window.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  stop()
  audio.stop()
  window.removeEventListener('mouseup', handleMouseUp)
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
        class="w-full"
        :class="[
          isFullscreen ? 'h-screen' : 'h-[500px] rounded-2xl',
          isDragging ? 'cursor-grabbing' : placeMode ? 'cursor-crosshair' : 'cursor-grab',
        ]"
        @mousedown="handleMouseDown"
        @wheel.prevent="onWheel"
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

      <!-- Paused indicator -->
      <div v-if="timePaused" class="absolute top-3 left-3 rounded-md bg-black/60 px-3 py-1 text-xs font-mono text-yellow-400">
        PAUSED (Space)
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
        :color-react="colorReact"
        :place-mode="placeMode"
        :place-shape="placeShape"
        :placed-count="placedObjects.length"
        :time-paused="timePaused"
        :time-speed="timeSpeed"
        :audio-source="audio.source.value"
        :audio-file-name="audio.fileName.value"
        :audio-bass="audio.bass.value"
        :audio-mid="audio.mid.value"
        :audio-treble="audio.treble.value"
        :custom-glsl="customGlsl"
        :custom-js="customJs"
        :glsl-error="glslError"
        @update:scene="scene = $event; onControlUpdate()"
        @update:palette="palette = $event; onControlUpdate()"
        @update:quality="quality = $event; onControlUpdate()"
        @update:iterations="iterations = $event; onControlUpdate()"
        @update:auto-rotate="autoRotate = $event; onControlUpdate()"
        @update:cell-spacing="cellSpacing = $event; onControlUpdate()"
        @update:wall-thickness="wallThickness = $event; onControlUpdate()"
        @update:geo-preset="geoPreset = $event; onControlUpdate()"
        @update:animation="animation = $event; onControlUpdate()"
        @update:wireframe="wireframe = $event; onControlUpdate()"
        @update:anim-offset="animOffset = $event; onControlUpdate()"
        @update:lattice-preset="latticePreset = $event; onControlUpdate()"
        @update:bloom-strength="bloomStrength = $event"
        @update:chromatic-amount="chromaticAmount = $event"
        @update:color-react="colorReact = $event"
        @update:place-mode="placeMode = $event; onControlUpdate()"
        @update:place-shape="placeShape = $event; onControlUpdate()"
        @update:time-paused="timePaused = $event"
        @update:time-speed="timeSpeed = $event"
        @update:custom-glsl="customGlsl = $event"
        @update:custom-js="customJs = $event"
        @place-object="placeObjectAhead(); onControlUpdate()"
        @clear-placed="clearPlacedObjects(); onControlUpdate()"
        @undo-placed="undoLastPlacement(); onControlUpdate()"
        @screenshot="captureScreenshot()"
        @copy-url="urlState.copyShareUrl()"
        @audio-source="handleAudioSource"
        @audio-file="handleAudioFile"
        @apply-glsl="applyCustomGlsl"
      />
    </div>
  </div>
</template>
