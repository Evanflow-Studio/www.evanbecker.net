<script setup lang="ts">
import { useRayMarcherStore } from '~/stores/raymarcher'
import { PALETTE_NAMES } from '~/utils/shaders/constants'

const store = useRayMarcherStore()
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <DemoSelect label="Palette" :model-value="store.scene.palette" :options="[...PALETTE_NAMES]"
      @update:model-value="store.scene.palette = $event" />
  </div>
</template>
