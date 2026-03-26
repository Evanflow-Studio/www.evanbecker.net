<script setup lang="ts">
import { computed } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { SCENE_NAMES } from '~/utils/shaders/constants'

const store = useRayMarcherStore()

const isLattice = computed(() => store.scene.index === 0)
const isFractal = computed(() => store.scene.index === 3)
const isMandelbulb = computed(() => store.scene.index === 1)

function editLattice<K extends keyof typeof store.lattice>(key: K, value: typeof store.lattice[K]) {
  store.lattice[key] = value
  store.forkPreset()
}

/** Direct steps override — stored reactively in the Pinia store */
function setSteps(value: number) {
  store.render.stepsOverride = value
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-3">
      <DemoSelect label="Scene" :model-value="store.scene.index" :options="[...SCENE_NAMES]"
        @update:model-value="store.applySceneDefaults($event)" />
      <!-- Mandelbulb iterations (separate from fractal) -->
      <DemoSlider v-if="isMandelbulb"
        label="Iterations" :model-value="store.scene.iterations"
        :min="1" :max="12" :step="1" width="w-20" :show-value="true"
        @update:model-value="store.scene.iterations = $event" />

      <!-- Fractal: iterations + steps side by side in advanced -->
      <template v-if="isFractal">
        <DemoSlider label="Iterations" :model-value="store.scene.iterations"
          :min="1" :max="16" :step="1" width="w-20" :show-value="true"
          @update:model-value="store.scene.iterations = $event" />
        <DemoSlider label="Steps" :model-value="store.effectiveSteps"
          :min="32" :max="256" :step="8" width="w-20" :show-value="true"
          @update:model-value="setSteps($event)" />
      </template>
    </div>

    <!-- Lattice controls -->
    <div v-if="isLattice" class="flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-2">
      <DemoSlider label="Spacing" :model-value="store.lattice.cellSpacing" width="w-20"
        @update:model-value="editLattice('cellSpacing', $event)" />
      <DemoSlider label="Thickness" :model-value="store.lattice.wallThickness" width="w-20"
        @update:model-value="editLattice('wallThickness', $event)" />
      <DemoSlider v-if="store.lattice.animation > 0 && store.lattice.animation !== 5"
        label="Offset" :model-value="store.lattice.animOffset" width="w-20"
        @update:model-value="editLattice('animOffset', $event)" />
    </div>
  </div>
</template>
