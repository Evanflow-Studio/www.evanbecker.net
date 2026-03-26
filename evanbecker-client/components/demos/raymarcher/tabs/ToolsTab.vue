<script setup lang="ts">
import { useRayMarcherStore } from '~/stores/raymarcher'

const store = useRayMarcherStore()

const emit = defineEmits<{
  screenshot: []
  fullscreen: []
  'apply-glsl': []
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-3">
      <DemoToggle label="Pause" :model-value="store.time.paused" @update:model-value="store.time.paused = $event" />
      <DemoSlider label="Speed" :model-value="store.time.speed" :min="0.1" :max="3" :step="0.1" width="w-20" :show-value="true"
        @update:model-value="store.time.speed = $event" />
      <DemoSlider label="Move Speed" :model-value="store.camera.moveSpeed" :min="0.01" :max="0.15" :step="0.005" width="w-20" :show-value="true"
        @update:model-value="store.camera.moveSpeed = $event" />

      <!-- Drift toggle -->
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Drift</label>
        <button
          class="relative h-7 rounded-md border px-3 text-xs font-medium transition-colors overflow-hidden"
          :class="store.camera.autoRotate
            ? 'border-[#2D95FC] bg-[#2D95FC]/20 text-[#2D95FC]'
            : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
          @click="store.camera.autoRotate = !store.camera.autoRotate"
        >
          <div
            v-if="store.camera.autoRotate && store.gl.orbitProgress < 1"
            class="absolute inset-0 bg-[#2D95FC]/10 transition-none"
            :style="{ width: `${store.gl.orbitProgress * 100}%` }"
          />
          <span class="relative z-10">{{ store.camera.autoRotate ? 'ON' : 'OFF' }}</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Actions</label>
        <div class="flex gap-1">
          <button class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Screenshot (P)" @click="emit('screenshot')">Screenshot</button>
          <button class="h-7 rounded-md border border-slate-600 bg-slate-800 px-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Fullscreen" @click="emit('fullscreen')">Fullscreen</button>
        </div>
      </div>
    </div>

    <!-- Script Editor -->
    <div class="border-t border-slate-700/50 pt-2">
      <ScriptEditor
        :glsl-code="store.scripting.customGlsl"
        :js-code="store.scripting.customJs"
        :glsl-error="store.scripting.glslError"
        @update:glsl-code="store.scripting.customGlsl = $event"
        @update:js-code="store.scripting.customJs = $event"
        @apply-glsl="emit('apply-glsl')"
      />
    </div>
  </div>
</template>
