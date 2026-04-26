<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

defineProps<{
  tabs: Tab[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex gap-1 border-b border-slate-700/50 pb-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="px-3 py-1 rounded-t-md text-[10px] font-medium uppercase tracking-wider transition-colors"
      :class="modelValue === tab.id
        ? 'bg-slate-700/50 text-[#2D95FC]'
        : 'text-slate-500 hover:text-slate-300'"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
