<script setup lang="ts">
import { useRayMarcherStore } from '~/stores/raymarcher'
import { SCENE_NAMES } from '~/utils/shaders/constants'

const store = useRayMarcherStore()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-3">
      <DemoSelect label="Scene" :model-value="store.scene.index" :options="[...SCENE_NAMES]"
        @update:model-value="store.applySceneDefaults($event)" />
      <DemoToggle label="Wire" :model-value="store.lattice.wireframe"
        @update:model-value="store.lattice.wireframe = $event" />
      <DemoSlider v-if="store.scene.index === 1 || store.scene.index === 3"
        label="Iterations" :model-value="store.scene.iterations"
        :min="1" :max="store.scene.index === 3 ? 8 : 12" :step="1" width="w-20" :show-value="true"
        @update:model-value="store.scene.iterations = $event" />
    </div>
    <div v-if="store.scene.index === 0" class="flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-2">
      <DemoSlider label="Spacing" :model-value="store.lattice.cellSpacing" width="w-20"
        @update:model-value="store.lattice.cellSpacing = $event" />
      <DemoSlider label="Thickness" :model-value="store.lattice.wallThickness" width="w-20"
        @update:model-value="store.lattice.wallThickness = $event" />
      <DemoSlider v-if="store.lattice.animation > 0 && store.lattice.animation !== 5"
        label="Offset" :model-value="store.lattice.animOffset" width="w-20"
        @update:model-value="store.lattice.animOffset = $event" />
    </div>
  </div>
</template>
