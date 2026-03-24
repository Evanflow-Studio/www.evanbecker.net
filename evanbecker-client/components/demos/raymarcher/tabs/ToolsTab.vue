<script setup lang="ts">
import type { RayMarchCommand } from '~/composables/useCommandDispatcher'

defineProps<{
  timePaused: boolean
  timeSpeed: number
  moveSpeed: number
  autoRotate: boolean
  orbitProgress: number
  customGlsl: string
  customJs: string
  glslError: string
}>()

const emit = defineEmits<{ command: [cmd: RayMarchCommand] }>()
function cmd(command: RayMarchCommand) { emit('command', command) }
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-3">
      <DemoToggle label="Pause" :model-value="timePaused" @update:model-value="cmd({ type: 'setTimePaused', value: $event })" />
      <DemoSlider label="Speed" :model-value="timeSpeed" :min="0.1" :max="3" :step="0.1" width="w-20" :show-value="true" @update:model-value="cmd({ type: 'setTimeSpeed', value: $event })" />
      <DemoSlider label="Move Speed" :model-value="moveSpeed" :min="0.01" :max="0.15" :step="0.005" width="w-20" :show-value="true" @update:model-value="cmd({ type: 'setMoveSpeed', value: $event })" />

      <!-- Drift toggle -->
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Drift</label>
        <button
          class="relative h-7 rounded-md border px-3 text-xs font-medium transition-colors overflow-hidden"
          :class="autoRotate
            ? 'border-[#2D95FC] bg-[#2D95FC]/20 text-[#2D95FC]'
            : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
          @click="cmd({ type: 'setAutoRotate', value: !autoRotate })"
        >
          <div
            v-if="autoRotate && orbitProgress < 1"
            class="absolute inset-0 bg-[#2D95FC]/10 transition-none"
            :style="{ width: `${orbitProgress * 100}%` }"
          />
          <span class="relative z-10">{{ autoRotate ? 'ON' : 'OFF' }}</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Actions</label>
        <div class="flex gap-1">
          <button
            class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Screenshot (P)"
            @click="cmd({ type: 'screenshot' })"
          >
            Screenshot
          </button>
          <button
            class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy share URL"
            @click="cmd({ type: 'copyUrl' })"
          >
            Share
          </button>
        </div>
      </div>
    </div>

    <!-- Script Editor -->
    <div class="border-t border-slate-700/50 pt-2">
      <ScriptEditor
        :glsl-code="customGlsl"
        :js-code="customJs"
        :glsl-error="glslError"
        @update:glsl-code="cmd({ type: 'setCustomGlsl', value: $event })"
        @update:js-code="cmd({ type: 'setCustomJs', value: $event })"
        @apply-glsl="cmd({ type: 'applyGlsl' })"
      />
    </div>
  </div>
</template>
