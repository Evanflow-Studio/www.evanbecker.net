<script setup lang="ts">
import { ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import { QUALITY_NAMES, GEO_PRESET_NAMES, ANIMATION_NAMES } from '~/utils/shaders/constants'

const store = useRayMarcherStore()
const presetNames = LATTICE_PRESETS.map(p => p.name)

const emit = defineEmits<{
  screenshot: []
  fullscreen: []
  'apply-glsl': []
}>()

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
      <DemoSelect v-if="store.scene.index === 0" label="Preset" :model-value="store.lattice.presetIndex"
        :options="presetNames" @update:model-value="store.applyLatticePreset($event)" />
      <DemoSelect label="Shape" :model-value="store.lattice.geoPreset"
        :options="[...GEO_PRESET_NAMES]" @update:model-value="store.lattice.geoPreset = $event" />
      <DemoSelect label="Animate" :model-value="store.lattice.animation"
        :options="[...ANIMATION_NAMES]" @update:model-value="store.lattice.animation = $event" />
      <DemoSelect label="Quality" :model-value="store.render.quality"
        :options="[...QUALITY_NAMES]" @update:model-value="store.applyQualityFX($event)" />
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

      <SceneTab v-if="activeTab === 'scene'" />
      <ColorTab v-if="activeTab === 'color'" />
      <FxTab v-if="activeTab === 'fx'" />
      <ToolsTab v-if="activeTab === 'tools'" @screenshot="emit('screenshot')" @fullscreen="emit('fullscreen')" @apply-glsl="emit('apply-glsl')" />
    </div>
  </FloatingPanel>
</template>
