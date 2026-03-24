<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  glslCode: string
  jsCode: string
  glslError: string
}>()

const emit = defineEmits<{
  'update:glslCode': [value: string]
  'update:jsCode': [value: string]
  'applyGlsl': []
}>()

const activeTab = ref<'glsl' | 'js'>('glsl')

const glslPlaceholder = `// Transform vec3 rp (relative to camera)
// Available: u_time, rp.x/y/z
rp.y += sin(rp.x * 2.0 + u_time) * 0.5;`

const jsPlaceholder = `// Runs each frame. Available: time, bass, mid, treble, amplitude
// Can set: spacing, thickness, animOffset, bloom, chroma
spacing = 0.1 + Math.sin(time) * 0.05;
bloom = bass * 2;`
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Tab buttons -->
    <div class="flex gap-1">
      <button
        class="px-3 py-1 rounded-t-md text-[10px] font-medium uppercase tracking-wider transition-colors"
        :class="activeTab === 'glsl'
          ? 'bg-slate-700 text-[#2D95FC]'
          : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'"
        @click="activeTab = 'glsl'"
      >
        GLSL Transform
      </button>
      <button
        class="px-3 py-1 rounded-t-md text-[10px] font-medium uppercase tracking-wider transition-colors"
        :class="activeTab === 'js'
          ? 'bg-slate-700 text-[#2D95FC]'
          : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'"
        @click="activeTab = 'js'"
      >
        JS Expressions
      </button>
    </div>

    <!-- GLSL editor -->
    <div v-if="activeTab === 'glsl'" class="flex flex-col gap-1">
      <textarea
        :value="glslCode"
        :placeholder="glslPlaceholder"
        class="h-24 w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-[#2D95FC] placeholder:text-slate-600"
        spellcheck="false"
        @input="emit('update:glslCode', ($event.target as HTMLTextAreaElement).value)"
      />
      <div class="flex items-center gap-2">
        <button
          class="h-6 rounded-md border border-[#2D95FC] bg-[#2D95FC]/20 px-3 text-[10px] font-medium text-[#2D95FC] hover:bg-[#2D95FC]/30 transition-colors"
          @click="emit('applyGlsl')"
        >
          Apply (recompile)
        </button>
        <p v-if="glslError" class="text-[10px] text-red-400 truncate">{{ glslError }}</p>
        <p v-else-if="glslCode.trim()" class="text-[10px] text-green-400">Set Animate → Custom</p>
      </div>
    </div>

    <!-- JS editor -->
    <div v-if="activeTab === 'js'" class="flex flex-col gap-1">
      <textarea
        :value="jsCode"
        :placeholder="jsPlaceholder"
        class="h-24 w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-[#2D95FC] placeholder:text-slate-600"
        spellcheck="false"
        @input="emit('update:jsCode', ($event.target as HTMLTextAreaElement).value)"
      />
      <p class="text-[10px] text-slate-500">Runs each frame. Changes apply instantly.</p>
    </div>
  </div>
</template>
