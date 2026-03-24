<script setup lang="ts">
import type { RayMarchCommand } from '~/composables/useCommandDispatcher'
import { SCENE_NAMES, ANIMATION_NAMES } from '~/utils/shaders/constants'

defineProps<{
  scene: number
  wireframe: boolean
  iterations: number
  cellSpacing: number
  wallThickness: number
  animOffset: number
  animation: number
}>()

const emit = defineEmits<{ command: [cmd: RayMarchCommand] }>()
function cmd(command: RayMarchCommand) { emit('command', command) }

const sceneNames = [...SCENE_NAMES]
const animationNames = [...ANIMATION_NAMES]
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-3">
      <DemoSelect label="Scene" :model-value="scene" :options="sceneNames" @update:model-value="cmd({ type: 'setScene', value: $event })" />
      <DemoToggle label="Wire" :model-value="wireframe" @update:model-value="cmd({ type: 'setWireframe', value: $event })" />
      <DemoSlider
        v-if="scene === 1 || scene === 3"
        label="Iterations"
        :model-value="iterations"
        :min="1" :max="scene === 3 ? 8 : 12" :step="1"
        width="w-20" :show-value="true"
        @update:model-value="cmd({ type: 'setIterations', value: $event })"
      />
    </div>
    <div v-if="scene === 0" class="flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-2">
      <DemoSlider label="Spacing" :model-value="cellSpacing" width="w-20" @update:model-value="cmd({ type: 'setCellSpacing', value: $event })" />
      <DemoSlider label="Thickness" :model-value="wallThickness" width="w-20" @update:model-value="cmd({ type: 'setWallThickness', value: $event })" />
      <DemoSlider
        v-if="animation > 0 && animation !== 5"
        label="Offset" :model-value="animOffset" width="w-20"
        @update:model-value="cmd({ type: 'setAnimOffset', value: $event })"
      />
    </div>
  </div>
</template>
