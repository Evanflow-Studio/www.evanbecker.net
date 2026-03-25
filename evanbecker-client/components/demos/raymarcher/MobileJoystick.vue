<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  move: [dx: number, dy: number]
}>()

const padRef = ref<HTMLElement | null>(null)
const knobX = ref(0)
const knobY = ref(0)
const active = ref(false)

let padRect: DOMRect | null = null
let animFrame = 0

const RADIUS = 36 // max distance knob can move from center

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  active.value = true
  padRect = padRef.value?.getBoundingClientRect() ?? null
  updateKnob(e.touches[0])
  startEmitting()
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (!active.value) return
  updateKnob(e.touches[0])
}

function onTouchEnd(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  active.value = false
  knobX.value = 0
  knobY.value = 0
  stopEmitting()
}

function updateKnob(touch: Touch) {
  if (!padRect) return
  const cx = padRect.left + padRect.width / 2
  const cy = padRect.top + padRect.height / 2
  let dx = touch.clientX - cx
  let dy = touch.clientY - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > RADIUS) {
    dx = (dx / dist) * RADIUS
    dy = (dy / dist) * RADIUS
  }
  knobX.value = dx
  knobY.value = dy
}

function startEmitting() {
  function tick() {
    if (!active.value) return
    const dx = knobX.value / RADIUS // -1 to 1
    const dy = knobY.value / RADIUS // -1 to 1
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      emit('move', dx, -dy) // invert Y: up on screen = forward
    }
    animFrame = requestAnimationFrame(tick)
  }
  animFrame = requestAnimationFrame(tick)
}

function stopEmitting() {
  cancelAnimationFrame(animFrame)
}

onUnmounted(() => cancelAnimationFrame(animFrame))
</script>

<template>
  <div
    ref="padRef"
    class="relative h-20 w-20 rounded-full border border-slate-500/40 bg-black/30 backdrop-blur-sm touch-none select-none"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <!-- Knob -->
    <div
      class="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors"
      :class="active ? 'bg-[#2D95FC]/80' : 'bg-slate-400/40'"
      :style="{
        transform: `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`,
      }"
    />
    <!-- Label -->
    <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap">
      Move
    </span>
  </div>
</template>
