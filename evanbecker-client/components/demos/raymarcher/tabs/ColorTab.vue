<script setup lang="ts">
import type { RayMarchCommand } from '~/composables/useCommandDispatcher'
import { PALETTE_NAMES } from '~/utils/shaders/constants'

defineProps<{
  palette: number
}>()

const emit = defineEmits<{ command: [cmd: RayMarchCommand] }>()
function cmd(command: RayMarchCommand) { emit('command', command) }

const paletteNames = [...PALETTE_NAMES]
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <DemoSelect label="Palette" :model-value="palette" :options="paletteNames" @update:model-value="cmd({ type: 'setPalette', value: $event })" />
    <!-- Future: custom palette editor with 4 IQ cosine color pickers -->
  </div>
</template>
