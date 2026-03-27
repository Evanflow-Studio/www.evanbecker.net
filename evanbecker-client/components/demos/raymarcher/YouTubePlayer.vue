<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { useAudioCapture, extractVideoId } from '~/composables/raymarcher/useAudioCapture'

const store = useRayMarcherStore()
const audio = useAudioCapture()

const minimized = ref(false)
const visible = ref(false)
const urlInput = ref('')
const videoTitle = ref('')
const playerContainerId = 'yt-player-embed'
let titlePollInterval: ReturnType<typeof setInterval> | null = null

function show() {
  visible.value = true
}

function hide() {
  audio.stopCapture()
  audio.destroyPlayer()
  visible.value = false
  minimized.value = false
  store.audio.youtubeUrl = ''
  urlInput.value = ''
  videoTitle.value = ''
  if (titlePollInterval) { clearInterval(titlePollInterval); titlePollInterval = null }
}

async function loadUrl() {
  const id = extractVideoId(urlInput.value)
  if (!id) {
    audio.error.value = 'Invalid YouTube URL'
    return
  }
  store.audio.youtubeUrl = urlInput.value
  // Wait for the DOM to render the player container
  await nextTick()
  await audio.loadVideo(playerContainerId, id)

  // Poll for title once player is ready
  if (titlePollInterval) clearInterval(titlePollInterval)
  titlePollInterval = setInterval(() => {
    const t = audio.getVideoTitle()
    if (t) {
      videoTitle.value = t
      if (titlePollInterval) { clearInterval(titlePollInterval); titlePollInterval = null }
    }
  }, 500)
}

function onConnectAudio() {
  if (audio.isCapturing.value) {
    audio.stopCapture()
  } else {
    audio.startCapture()
  }
}

// Drag support
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const panelPos = ref({ x: 16, y: 16 })

function onDragStart(e: MouseEvent) {
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - panelPos.value.x,
    y: e.clientY - panelPos.value.y,
  }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  panelPos.value = {
    x: Math.max(0, e.clientX - dragOffset.value.x),
    y: Math.max(0, e.clientY - dragOffset.value.y),
  }
}

function onDragEnd() {
  isDragging.value = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

// Sync urlInput with store on mount
watch(() => store.audio.youtubeUrl, (val) => {
  if (val && !urlInput.value) urlInput.value = val
})

defineExpose({ show, hide, visible })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-50 select-none"
      :style="{ left: panelPos.x + 'px', top: panelPos.y + 'px' }"
    >
      <!-- Minimized bar -->
      <div
        v-if="minimized"
        class="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-1.5 shadow-xl backdrop-blur-sm cursor-move"
        @mousedown.prevent="onDragStart"
      >
        <button
          class="text-xs text-slate-400 hover:text-white transition-colors"
          @click.stop="audio.togglePlayPause()"
        >
          {{ audio.getPlayerState() === 1 ? '||' : '>' }}
        </button>
        <span class="max-w-[180px] truncate text-xs text-slate-300">{{ videoTitle || 'YouTube' }}</span>
        <div v-if="audio.isCapturing.value" class="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        <button class="text-xs text-slate-500 hover:text-slate-200 transition-colors" @click.stop="minimized = false">
          +
        </button>
        <button class="text-xs text-slate-500 hover:text-red-400 transition-colors" @click.stop="hide">
          x
        </button>
      </div>

      <!-- Full panel -->
      <div
        v-else
        class="w-[310px] rounded-xl border border-slate-600 bg-slate-900/95 shadow-2xl backdrop-blur-sm overflow-hidden"
      >
        <!-- Title bar (draggable) -->
        <div
          class="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 cursor-move"
          @mousedown.prevent="onDragStart"
        >
          <span class="text-[10px] font-medium uppercase tracking-wider text-slate-400">YouTube Audio</span>
          <div class="flex gap-1.5">
            <button class="text-xs text-slate-500 hover:text-slate-200 transition-colors" @click.stop="minimized = true">
              -
            </button>
            <button class="text-xs text-slate-500 hover:text-red-400 transition-colors" @click.stop="hide">
              x
            </button>
          </div>
        </div>

        <!-- URL input -->
        <div class="flex gap-1 px-2 pt-2">
          <input
            v-model="urlInput"
            type="text"
            placeholder="YouTube URL..."
            class="flex-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#2D95FC]"
            @keydown.enter="loadUrl"
          />
          <button
            class="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
            @click="loadUrl"
          >
            Load
          </button>
        </div>

        <!-- Player embed -->
        <div class="mx-2 mt-2 aspect-video rounded-md overflow-hidden bg-black">
          <div :id="playerContainerId" class="w-full h-full" />
        </div>

        <!-- Audio connect + status -->
        <div class="flex items-center gap-2 px-2 py-2">
          <button
            class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            :class="audio.isCapturing.value
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-[#2D95FC]/20 text-[#2D95FC] border border-[#2D95FC]/40 hover:bg-[#2D95FC]/30'"
            @click="onConnectAudio"
          >
            {{ audio.isCapturing.value ? 'Disconnect' : 'Connect Audio' }}
          </button>
          <div class="flex items-center gap-1.5">
            <div
              class="h-1.5 w-1.5 rounded-full"
              :class="audio.isCapturing.value ? 'bg-green-400 animate-pulse' : 'bg-slate-600'"
            />
            <span class="text-[10px] text-slate-500">
              {{ audio.isCapturing.value ? 'Capturing' : 'Not connected' }}
            </span>
          </div>
        </div>

        <!-- Error -->
        <div v-if="audio.error.value" class="px-2 pb-2">
          <p class="text-[10px] text-red-400">{{ audio.error.value }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
