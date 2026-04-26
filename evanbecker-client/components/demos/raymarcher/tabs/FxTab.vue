<script setup lang="ts">
import { useRayMarcherStore } from '~/stores/raymarcher'

const store = useRayMarcherStore()
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <DemoSlider label="Bloom" :model-value="store.render.bloomStrength" :max="2" width="w-20"
      @update:model-value="store.render.bloomStrength = $event" />
    <DemoSlider label="Chroma" :model-value="store.render.chromaticAmount" :max="5" width="w-20"
      @update:model-value="store.render.chromaticAmount = $event" />
    <DemoSlider label="Fog" :model-value="store.render.fogDensity" :min="0" :max="0.01" :step="0.0005" width="w-20" :show-value="true"
      @update:model-value="store.render.fogDensity = $event" />
  </div>
</template>
