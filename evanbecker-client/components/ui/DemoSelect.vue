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
      class="h-7 min-w-[5rem] appearance-none rounded-md border border-slate-600 bg-slate-800 pl-2 pr-6 text-xs text-slate-200 outline-none focus:border-[#2D95FC] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%226%22%3E%3Cpath%20d%3D%22M0%200l5%206%205-6z%22%20fill%3D%22%2394a3b8%22/%3E%3C/svg%3E')] bg-[length:10px_6px] bg-[right_0.5rem_center] bg-no-repeat"
      @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="(name, i) in options" :key="i" :value="i">{{ name }}</option>
    </select>
  </div>
</template>
