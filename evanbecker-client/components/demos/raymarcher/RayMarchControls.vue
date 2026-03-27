<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import { QUALITY_NAMES, GEO_PRESET_NAMES, ANIMATION_NAMES } from '~/utils/shaders/constants'

const store = useRayMarcherStore()
const presetNames = LATTICE_PRESETS.map(p => p.name)

const emit = defineEmits<{
  screenshot: []
  fullscreen: []
  openPlayer: []
}>()

const showAdvanced = ref(false)
const activeTags = ref(new Set(['scene', 'color', 'fx', 'audio', 'tools']))
const tags = [
  { id: 'scene', label: 'Scene' },
  { id: 'color', label: 'Color' },
  { id: 'fx', label: 'FX' },
  { id: 'audio', label: 'Audio' },
  { id: 'tools', label: 'Tools' },
]

function toggleTag(id: string) {
  if (activeTags.value.has(id)) {
    activeTags.value.delete(id)
  } else {
    activeTags.value.add(id)
  }
  // Force reactivity (Set mutations aren't tracked)
  activeTags.value = new Set(activeTags.value)
}

/** Wraps a store mutation with auto-fork */
function editLattice<K extends keyof typeof store.lattice>(key: K, value: typeof store.lattice[K]) {
  store.lattice[key] = value
  store.forkPreset()
}

/** Scene type checks for conditional UI */
const isLatticeScene = computed(() => store.scene.index === 0)
const isFractalScene = computed(() => store.scene.index === 3)

/** Preset display name — shows fork state */
const presetDisplayName = computed(() => {
  if (store.lattice.isCustomized) return `Custom (${store.lattice.basePresetName})`
  return LATTICE_PRESETS[store.lattice.presetIndex]?.name ?? 'Unknown'
})
</script>

<template>
  <FloatingPanel initial-position="bottom-center">
    <!-- Compact bar -->
    <div class="flex flex-wrap items-end gap-3">
      <!-- Preset selector — always visible (presets can switch scenes) -->
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Preset</label>
        <div class="flex items-center gap-1">
          <select
            :value="store.lattice.isCustomized ? -1 : store.lattice.presetIndex"
            class="h-8 w-auto rounded-md border border-slate-600 bg-slate-800 px-2 pr-1 text-xs text-slate-200 outline-none focus:border-[#2D95FC]"
            :class="store.lattice.isCustomized ? 'border-amber-500/50 text-amber-300' : ''"
            @change="store.applyLatticePreset(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-if="store.lattice.isCustomized" :value="-1" disabled>{{ presetDisplayName }}</option>
            <option v-for="(name, i) in presetNames" :key="i" :value="i">{{ name }}</option>
          </select>
          <button
            v-if="store.lattice.isCustomized"
            class="h-8 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 text-xs text-amber-400 hover:bg-amber-500/20 transition-colors"
            title="Reset to original preset"
            @click="store.resetPreset()"
          >
            ↺
          </button>
        </div>
      </div>

      <!-- Lattice-specific controls (only for Infinite Lattice scene) -->
      <template v-if="isLatticeScene">
        <DemoSelect label="Shape" :model-value="store.lattice.geoPreset"
          :options="[...GEO_PRESET_NAMES]" @update:model-value="editLattice('geoPreset', $event)" />
        <DemoSelect label="Animate" :model-value="store.lattice.animation"
          :options="[...ANIMATION_NAMES]" @update:model-value="editLattice('animation', $event)" />
      </template>

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
      <!-- Toggleable tags — multiple can be active at once -->
      <div class="flex gap-1 pb-1">
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-colors"
          :class="activeTags.has(tag.id)
            ? 'bg-[#2D95FC]/20 text-[#2D95FC] border border-[#2D95FC]/40'
            : 'text-slate-500 hover:text-slate-300 border border-slate-700/50'"
          @click="toggleTag(tag.id)"
        >
          {{ tag.label }}
        </button>
      </div>

      <!-- All active sections render simultaneously -->
      <SceneTab v-if="activeTags.has('scene')" />
      <div v-if="activeTags.has('scene') && activeTags.has('color')" class="border-t border-slate-700/30" />
      <ColorTab v-if="activeTags.has('color')" />
      <div v-if="activeTags.has('color') && activeTags.has('fx')" class="border-t border-slate-700/30" />
      <FxTab v-if="activeTags.has('fx')" />
      <div v-if="activeTags.has('fx') && activeTags.has('audio')" class="border-t border-slate-700/30" />
      <AudioTab v-if="activeTags.has('audio')" @open-player="emit('openPlayer')" />
      <div v-if="activeTags.has('audio') && activeTags.has('tools')" class="border-t border-slate-700/30" />
      <ToolsTab v-if="activeTags.has('tools')" @screenshot="emit('screenshot')" @fullscreen="emit('fullscreen')" />
    </div>
  </FloatingPanel>
</template>
