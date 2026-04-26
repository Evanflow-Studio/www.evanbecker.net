<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  modelValue: number
  min?: number
  max?: number
  step?: number
  width?: string
  showValue?: boolean
}>(), {
  min: 0,
  max: 1,
  step: 0.01,
  width: 'w-24',
  showValue: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">
      {{ label }}<template v-if="showValue"> ({{ modelValue }})</template>
    </label>
    <input
      :value="modelValue"
      type="range"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :class="[props.width, 'accent-[#2D95FC]']"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
  </div>
</template>
