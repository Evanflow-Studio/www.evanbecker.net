<script setup lang="ts">
defineProps<{
  label: string
  modelValue: number
  options: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">{{ label }}</label>
    <select
      :value="modelValue"
      class="h-8 w-auto rounded-md border border-slate-600 bg-slate-800 px-2 pr-1 text-xs text-slate-200 outline-none focus:border-[#2D95FC]"
      @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="(name, i) in options" :key="i" :value="i">{{ name }}</option>
    </select>
  </div>
</template>
