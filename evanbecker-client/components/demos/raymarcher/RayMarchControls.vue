<script setup lang="ts">
import { ref } from 'vue'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import type { RayMarchCommand } from '~/composables/useCommandDispatcher'
import { QUALITY_NAMES, GEO_PRESET_NAMES, ANIMATION_NAMES } from '~/utils/shaders/constants'

const presetNames = LATTICE_PRESETS.map(p => p.name)

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
  fogDensity: number
  moveSpeed: number
  timePaused: boolean
  timeSpeed: number
  customGlsl: string
  customJs: string
  glslError: string
}>()

const emit = defineEmits<{ command: [cmd: RayMarchCommand] }>()
function cmd(command: RayMarchCommand) { emit('command', command) }

const showAdvanced = ref(false)
const activeTab = ref('scene')
const tabs = [
  { id: 'scene', label: 'Scene' },
  { id: 'color', label: 'Color' },
  { id: 'fx', label: 'FX' },
  { id: 'tools', label: 'Tools' },
]
</script>

<template>
  <FloatingPanel initial-position="bottom-center">
    <!-- Compact bar -->
    <div class="flex flex-wrap items-end gap-3">
      <DemoSelect v-if="scene === 0" label="Preset" :model-value="latticePreset" :options="presetNames" @update:model-value="cmd({ type: 'setLatticePreset', value: $event })" />
      <DemoSelect label="Shape" :model-value="geoPreset" :options="[...GEO_PRESET_NAMES]" @update:model-value="cmd({ type: 'setGeoPreset', value: $event })" />
      <DemoSelect label="Animate" :model-value="animation" :options="[...ANIMATION_NAMES]" @update:model-value="cmd({ type: 'setAnimation', value: $event })" />
      <DemoSelect label="Quality" :model-value="quality" :options="[...QUALITY_NAMES]" @update:model-value="cmd({ type: 'setQuality', value: $event })" />
      <button
        class="h-7 rounded-md border px-3 text-xs font-medium transition-colors"
        :class="showAdvanced
          ? 'border-[#2D95FC] bg-[#2D95FC]/20 text-[#2D95FC]'
          : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
        @click="showAdvanced = !showAdvanced"
      >
        ⚙ Advanced
      </button>
    </div>

    <!-- Advanced panel -->
    <div v-if="showAdvanced" class="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
      <TabBar :tabs="tabs" :model-value="activeTab" @update:model-value="activeTab = $event" />

      <SceneTab
        v-if="activeTab === 'scene'"
        :scene="scene" :wireframe="wireframe" :iterations="iterations"
        :cell-spacing="cellSpacing" :wall-thickness="wallThickness"
        :anim-offset="animOffset" :animation="animation"
        @command="cmd($event)"
      />
      <ColorTab
        v-if="activeTab === 'color'"
        :palette="palette"
        @command="cmd($event)"
      />
      <FxTab
        v-if="activeTab === 'fx'"
        :bloom-strength="bloomStrength" :chromatic-amount="chromaticAmount"
        :fog-density="fogDensity"
        @command="cmd($event)"
      />
      <ToolsTab
        v-if="activeTab === 'tools'"
        :time-paused="timePaused" :time-speed="timeSpeed" :move-speed="moveSpeed"
        :auto-rotate="autoRotate" :orbit-progress="orbitProgress"
        :custom-glsl="customGlsl" :custom-js="customJs" :glsl-error="glslError"
        @command="cmd($event)"
      />
    </div>
  </FloatingPanel>
</template>
