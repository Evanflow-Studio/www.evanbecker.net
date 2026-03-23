<script setup lang="ts">
defineProps<{
  label: string
  modelValue: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">{{ label }}</label>
    <button
      class="h-7 rounded-md border px-3 text-xs font-medium transition-colors"
      :class="modelValue
        ? 'border-[#2D95FC] bg-[#2D95FC]/20 text-[#2D95FC]'
        : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
      @click="emit('update:modelValue', !modelValue)"
    >
      {{ modelValue ? 'ON' : 'OFF' }}
    </button>
  </div>
</template>
