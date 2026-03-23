<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MAX_PLACED_OBJECTS, SHAPE_NAMES } from '~/composables/useRayMarchGL'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import { AUDIO_SOURCE_NAMES, type AudioSource } from '~/composables/useAudioReactive'

const presetNames = LATTICE_PRESETS.map(p => p.name)
const audioSourceOptions = Object.entries(AUDIO_SOURCE_NAMES).map(([, name]) => name)
const audioSourceKeys = Object.keys(AUDIO_SOURCE_NAMES) as AudioSource[]

const props = defineProps<{
  scene: number
  palette: number
  quality: number
  iterations: number
  autoRotate: boolean
  orbitProgress: number
  wireframe: boolean
  cellSpacing: number
  wallThickness: number
  geoPreset: number
  animation: number
  animOffset: number
  latticePreset: number
  bloomStrength: number
  chromaticAmount: number
  colorReact: number
  placeMode: boolean
  placeShape: number
  placedCount: number
  timePaused: boolean
  timeSpeed: number
  audioSource: AudioSource
  audioFileName: string
  audioBass: number
  audioMid: number
  audioTreble: number
  customGlsl: string
  customJs: string
  glslError: string
}>()

const emit = defineEmits<{
  'update:scene': [value: number]
  'update:palette': [value: number]
  'update:quality': [value: number]
  'update:iterations': [value: number]
  'update:autoRotate': [value: boolean]
  'update:wireframe': [value: boolean]
  'update:cellSpacing': [value: number]
  'update:wallThickness': [value: number]
  'update:geoPreset': [value: number]
  'update:animation': [value: number]
  'update:animOffset': [value: number]
  'update:latticePreset': [value: number]
  'update:bloomStrength': [value: number]
  'update:chromaticAmount': [value: number]
  'update:colorReact': [value: number]
  'update:placeMode': [value: boolean]
  'update:placeShape': [value: number]
  'update:timePaused': [value: boolean]
  'update:timeSpeed': [value: number]
  'update:customGlsl': [value: string]
  'update:customJs': [value: string]
  'audioSource': [source: AudioSource]
  'audioFile': [file: File]
  'placeObject': []
  'clearPlaced': []
  'undoPlaced': []
  'screenshot': []
  'copyUrl': []
  'applyGlsl': []
}>()

const sceneNames = ['Infinite Lattice', 'Mandelbulb', 'CSG Operations', 'Fractal Descent']
const paletteNames = ['Aether', 'Cosmic', 'Inferno', 'Ocean', 'Electric', 'Prismatic', 'Neon', 'Sunset', 'Ice', 'Vapor', 'Forest', 'Mono']
const qualityNames = ['Performance', 'Balanced', 'High', 'Ultra']
const geoPresetNames = ['Hollow Cube', 'Cross Beams', 'Nested Spheres', 'Frame Only', 'Torus Lattice']
const animationNames = ['None', 'Wave', 'Twist', 'Pulse', 'Kaleidoscope', 'Orbit', 'Ripple', 'Shatter', 'Morph', 'Custom']

// Tabs
const activeTab = ref<'scene' | 'fx' | 'audio' | 'tools'>('scene')
const tabs = [
  { id: 'scene' as const, label: 'Scene' },
  { id: 'fx' as const, label: 'FX' },
  { id: 'audio' as const, label: 'Audio' },
  { id: 'tools' as const, label: 'Tools' },
]

// Draggable panel
const panelRef = ref<HTMLElement | null>(null)
const panelX = ref(0)
const panelY = ref(0)
const collapsed = ref(false)
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragOffsetX = 0
let dragOffsetY = 0
let positioned = false

function onDragStart(e: MouseEvent) {
  e.stopPropagation()
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragOffsetX = panelX.value
  dragOffsetY = panelY.value
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!isDragging) return
  panelX.value = dragOffsetX + (e.clientX - dragStartX)
  panelY.value = dragOffsetY + (e.clientY - dragStartY)
}

function onDragEnd() {
  isDragging = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

onMounted(() => {
  requestAnimationFrame(() => {
    if (!positioned && panelRef.value?.parentElement) {
      const parent = panelRef.value.parentElement.getBoundingClientRect()
      const panel = panelRef.value.getBoundingClientRect()
      panelX.value = (parent.width - panel.width) / 2
      panelY.value = parent.height - panel.height - 12
      positioned = true
    }
  })
})

// Audio
const fileInputRef = ref<HTMLInputElement | null>(null)

function onAudioSourceChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  const key = audioSourceKeys[idx]
  if (key === 'file') {
    fileInputRef.value?.click()
  } else {
    emit('audioSource', key)
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    emit('audioFile', input.files[0])
    input.value = ''
  }
}
</script>

<template>
  <div
    ref="panelRef"
    class="absolute z-10 flex max-w-xl flex-col rounded-xl bg-black/70 backdrop-blur-md"
    :style="{ left: `${panelX}px`, top: `${panelY}px` }"
    @mousedown.stop
  >
    <!-- Drag handle -->
    <div
      class="flex cursor-move items-center justify-between px-4 pt-2 pb-1 select-none"
      @mousedown="onDragStart"
    >
      <div class="flex items-center gap-2">
        <div class="h-1 w-8 rounded-full bg-slate-600" />
      </div>
      <button
        class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        @mousedown.stop
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '▼' : '▲' }}
      </button>
    </div>

    <div v-if="!collapsed" class="flex flex-col gap-2 px-4 pb-3">
      <!-- Tab bar -->
      <div class="flex gap-1 border-b border-slate-700/50 pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-3 py-1 rounded-t-md text-[10px] font-medium uppercase tracking-wider transition-colors"
          :class="activeTab === tab.id
            ? 'bg-slate-700/50 text-[#2D95FC]'
            : 'text-slate-500 hover:text-slate-300'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ===== SCENE TAB ===== -->
      <div v-if="activeTab === 'scene'" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end gap-3">
          <DemoSelect label="Scene" :model-value="scene" :options="sceneNames" @update:model-value="emit('update:scene', $event)" />
          <DemoSelect label="Palette" :model-value="palette" :options="paletteNames" @update:model-value="emit('update:palette', $event)" />
          <DemoSelect label="Quality" :model-value="quality" :options="qualityNames" @update:model-value="emit('update:quality', $event)" />
          <DemoToggle label="Wire" :model-value="wireframe" @update:model-value="emit('update:wireframe', $event)" />
          <DemoSlider
            v-if="scene === 1 || scene === 3"
            label="Iterations"
            :model-value="iterations"
            :min="1" :max="scene === 3 ? 8 : 12" :step="1"
            width="w-20" :show-value="true"
            @update:model-value="emit('update:iterations', $event)"
          />
        </div>
        <!-- Lattice controls -->
        <div v-if="scene === 0" class="flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-2">
          <DemoSelect label="Preset" :model-value="latticePreset" :options="presetNames" @update:model-value="emit('update:latticePreset', $event)" />
          <DemoSelect label="Shape" :model-value="geoPreset" :options="geoPresetNames" @update:model-value="emit('update:geoPreset', $event)" />
          <DemoSlider label="Spacing" :model-value="cellSpacing" width="w-20" @update:model-value="emit('update:cellSpacing', $event)" />
          <DemoSlider label="Thickness" :model-value="wallThickness" width="w-20" @update:model-value="emit('update:wallThickness', $event)" />
          <DemoSelect label="Animate" :model-value="animation" :options="animationNames" @update:model-value="emit('update:animation', $event)" />
          <DemoSlider
            v-if="animation > 0 && animation !== 5"
            label="Offset" :model-value="animOffset" width="w-20"
            @update:model-value="emit('update:animOffset', $event)"
          />
        </div>
      </div>

      <!-- ===== FX TAB ===== -->
      <div v-if="activeTab === 'fx'" class="flex flex-wrap items-end gap-3">
        <DemoSlider label="Bloom" :model-value="bloomStrength" :max="2" width="w-20" @update:model-value="emit('update:bloomStrength', $event)" />
        <DemoSlider label="Chroma" :model-value="chromaticAmount" :max="5" width="w-20" @update:model-value="emit('update:chromaticAmount', $event)" />
        <DemoSlider label="Color React" :model-value="colorReact" width="w-20" @update:model-value="emit('update:colorReact', $event)" />
      </div>

      <!-- ===== AUDIO TAB ===== -->
      <div v-if="activeTab === 'audio'" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Source</label>
            <select
              class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-[#2D95FC]"
              :value="audioSourceKeys.indexOf(audioSource)"
              @change="onAudioSourceChange"
            >
              <option v-for="(name, i) in audioSourceOptions" :key="i" :value="i">{{ name }}</option>
            </select>
            <input ref="fileInputRef" type="file" accept="audio/*" class="hidden" @change="onFileSelect" />
          </div>
          <p v-if="audioSource !== 'none'" class="self-end text-[10px] text-slate-500 pb-1">
            {{ audioFileName }}
          </p>
        </div>
        <!-- Band visualizer -->
        <div v-if="audioSource !== 'none'" class="flex items-end gap-2 h-8">
          <div class="flex flex-col items-center gap-0.5">
            <div class="w-6 rounded-sm bg-red-500/80 transition-all" :style="{ height: `${audioBass * 28}px` }" />
            <span class="text-[8px] text-slate-500">Bass</span>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <div class="w-6 rounded-sm bg-yellow-500/80 transition-all" :style="{ height: `${audioMid * 28}px` }" />
            <span class="text-[8px] text-slate-500">Mid</span>
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <div class="w-6 rounded-sm bg-blue-500/80 transition-all" :style="{ height: `${audioTreble * 28}px` }" />
            <span class="text-[8px] text-slate-500">Treble</span>
          </div>
        </div>
      </div>

      <!-- ===== TOOLS TAB ===== -->
      <div v-if="activeTab === 'tools'" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end gap-3">
          <!-- Time -->
          <DemoToggle label="Pause" :model-value="timePaused" @update:model-value="emit('update:timePaused', $event)" />
          <DemoSlider label="Speed" :model-value="timeSpeed" :min="0.1" :max="3" :step="0.1" width="w-20" :show-value="true" @update:model-value="emit('update:timeSpeed', $event)" />

          <!-- Drift -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Drift</label>
            <button
              class="relative h-7 rounded-md border px-3 text-xs font-medium transition-colors overflow-hidden"
              :class="autoRotate
                ? 'border-[#2D95FC] bg-[#2D95FC]/20 text-[#2D95FC]'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
              @click="emit('update:autoRotate', !autoRotate)"
            >
              <div
                v-if="autoRotate && orbitProgress < 1"
                class="absolute inset-0 bg-[#2D95FC]/10 transition-none"
                :style="{ width: `${orbitProgress * 100}%` }"
              />
              <span class="relative z-10">{{ autoRotate ? 'ON' : 'OFF' }}</span>
            </button>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Actions</label>
            <div class="flex gap-1">
              <button
                class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                title="Screenshot (P)"
                @click="emit('screenshot')"
              >
                Screenshot
              </button>
              <button
                class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy share URL"
                @click="emit('copyUrl')"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        <!-- Placement -->
        <div class="flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-2">
          <DemoToggle label="Place" :model-value="placeMode" @update:model-value="emit('update:placeMode', $event)" />
          <template v-if="placeMode">
            <DemoSelect label="Shape" :model-value="placeShape" :options="SHAPE_NAMES" @update:model-value="emit('update:placeShape', $event)" />
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {{ placedCount }}/{{ MAX_PLACED_OBJECTS }}
              </label>
              <div class="flex gap-1">
                <button
                  class="h-7 rounded-md border border-[#2D95FC] bg-[#2D95FC]/20 px-3 text-xs font-medium text-[#2D95FC] hover:bg-[#2D95FC]/30 transition-colors disabled:opacity-30"
                  :disabled="placedCount >= MAX_PLACED_OBJECTS"
                  @click="emit('placeObject')"
                >
                  Drop (F)
                </button>
                <button
                  class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
                  :disabled="placedCount === 0"
                  @click="emit('undoPlaced')"
                >
                  Undo
                </button>
                <button
                  class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
                  :disabled="placedCount === 0"
                  @click="emit('clearPlaced')"
                >
                  Clear
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Script Editor -->
        <div class="border-t border-slate-700/50 pt-2">
          <ScriptEditor
            :glsl-code="customGlsl"
            :js-code="customJs"
            :glsl-error="glslError"
            @update:glsl-code="emit('update:customGlsl', $event)"
            @update:js-code="emit('update:customJs', $event)"
            @apply-glsl="emit('applyGlsl')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
