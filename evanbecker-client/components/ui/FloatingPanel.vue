<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  initialPosition?: 'bottom-center' | 'top-right' | { x: number; y: number }
  collapsible?: boolean
  maxWidth?: string
}>(), {
  initialPosition: 'bottom-center',
  collapsible: true,
  maxWidth: 'max-w-xl',
})

const panelRef = ref<HTMLElement | null>(null)
const panelX = ref(0)
const panelY = ref(0)
const collapsed = ref(false)

// Use refs for drag state (not bare let — fixes Vue reactivity bug)
const dragState = ref({
  isDragging: false,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
})

let positioned = false

function onDragStart(e: MouseEvent) {
  e.stopPropagation()
  dragState.value = {
    isDragging: true,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: panelX.value,
    offsetY: panelY.value,
  }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragState.value.isDragging) return
  panelX.value = dragState.value.offsetX + (e.clientX - dragState.value.startX)
  panelY.value = dragState.value.offsetY + (e.clientY - dragState.value.startY)
}

function onDragEnd() {
  dragState.value.isDragging = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

onMounted(() => {
  requestAnimationFrame(() => {
    if (!positioned && panelRef.value?.parentElement) {
      const parent = panelRef.value.parentElement.getBoundingClientRect()
      const panel = panelRef.value.getBoundingClientRect()
      if (props.initialPosition === 'bottom-center') {
        panelX.value = (parent.width - panel.width) / 2
        panelY.value = parent.height - panel.height - 12
      } else if (props.initialPosition === 'top-right') {
        panelX.value = parent.width - panel.width - 12
        panelY.value = 12
      } else {
        panelX.value = props.initialPosition.x
        panelY.value = props.initialPosition.y
      }
      positioned = true
    }
  })
})

onBeforeUnmount(() => {
  // Defensive cleanup in case unmount happens during drag
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
})
</script>

<template>
  <div
    ref="panelRef"
    class="absolute z-10 flex flex-col rounded-xl bg-black/70 backdrop-blur-md"
    :class="maxWidth"
    :style="{ left: `${panelX}px`, top: `${panelY}px` }"
    @mousedown.stop
  >
    <!-- Drag handle -->
    <div
      class="flex cursor-move items-center justify-between px-4 pt-2 pb-1 select-none"
      @mousedown="onDragStart"
    >
      <div class="flex items-center gap-2">
        <div class="h-1 w-8 rounded-full bg-slate-600" />
      </div>
      <button
        v-if="collapsible"
        class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        @mousedown.stop
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '▼' : '▲' }}
      </button>
    </div>

    <div v-if="!collapsed" class="flex flex-col gap-2 px-4 pb-3">
      <slot />
    </div>
  </div>
</template>
