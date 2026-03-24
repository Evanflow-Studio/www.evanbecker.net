<script setup lang="ts">
import type { RayMarchCommand } from '~/composables/useCommandDispatcher'

defineProps<{
  bloomStrength: number
  chromaticAmount: number
  fogDensity: number
}>()

const emit = defineEmits<{ command: [cmd: RayMarchCommand] }>()
function cmd(command: RayMarchCommand) { emit('command', command) }
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <DemoSlider label="Bloom" :model-value="bloomStrength" :max="2" width="w-20" @update:model-value="cmd({ type: 'setBloomStrength', value: $event })" />
    <DemoSlider label="Chroma" :model-value="chromaticAmount" :max="5" width="w-20" @update:model-value="cmd({ type: 'setChromaticAmount', value: $event })" />
    <DemoSlider label="Fog" :model-value="fogDensity" :min="0" :max="0.01" :step="0.0005" width="w-20" :show-value="true" @update:model-value="cmd({ type: 'setFogDensity', value: $event })" />
  </div>
</template>
