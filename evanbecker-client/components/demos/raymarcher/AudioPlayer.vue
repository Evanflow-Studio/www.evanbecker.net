<script setup lang="ts">
import { ref } from 'vue'
import { useAudioCapture } from '~/composables/raymarcher/useAudioCapture'

const audio = useAudioCapture()
const urlInput = ref('')
const isDragOver = ref(false)
const minimized = ref(false)

function onLoadUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  audio.loadUrl(url)
  // Auto-play after a short delay for the source to connect
  setTimeout(() => audio.play(), 300)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    audio.loadFile(file)
    setTimeout(() => audio.play(), 300)
  }
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('audio/')) {
    audio.loadFile(file)
    setTimeout(() => audio.play(), 300)
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onSeek(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  audio.seek(value)
}

function togglePlay() {
  audio.isPlaying.value ? audio.pause() : audio.play()
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-50 w-72 rounded-xl bg-black/85 backdrop-blur-md border border-slate-700/50 shadow-2xl overflow-hidden"
    >
      <!-- Title bar -->
      <div class="flex items-center justify-between px-3 py-2 bg-slate-800/50">
        <div class="flex items-center gap-2 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#2D95FC] shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
          <span class="text-xs text-slate-300 truncate">{{ audio.fileName.value || 'Audio Player' }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="text-slate-500 hover:text-slate-300 text-xs px-1" @click="minimized = !minimized">
            {{ minimized ? '▲' : '▼' }}
          </button>
          <button class="text-slate-500 hover:text-slate-300 text-xs px-1" @click="$emit('close')">✕</button>
        </div>
      </div>

      <div v-if="!minimized" class="px-3 pb-3 pt-2 space-y-2">
        <!-- Drop zone / file picker -->
        <div
          class="relative rounded-lg border border-dashed transition-colors text-center py-3 cursor-pointer"
          :class="isDragOver ? 'border-[#2D95FC] bg-[#2D95FC]/10' : 'border-slate-600 hover:border-slate-400'"
          @drop.prevent="onDrop"
          @dragover="onDragOver"
          @dragleave="isDragOver = false"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
        >
          <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="onFileInput" />
          <p class="text-[11px] text-slate-400">
            <span class="text-[#2D95FC]">Drop audio file</span> or click to browse
          </p>
        </div>

        <!-- URL input -->
        <div class="flex gap-1">
          <input
            v-model="urlInput"
            type="text"
            placeholder="Paste audio URL..."
            class="flex-1 rounded-md bg-slate-800 border border-slate-600 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-[#2D95FC] focus:outline-none"
            @keydown.enter="onLoadUrl"
          />
          <button
            class="rounded-md bg-[#0C65E5] px-2 py-1 text-xs text-white hover:bg-[#2D95FC] transition-colors"
            @click="onLoadUrl"
          >
            Load
          </button>
        </div>

        <!-- Error -->
        <p v-if="audio.error.value" class="text-[10px] text-red-400">{{ audio.error.value }}</p>

        <!-- Player controls (shown when file loaded) -->
        <div v-if="audio.fileName.value" class="space-y-1.5">
          <!-- Play/Pause + time -->
          <div class="flex items-center gap-2">
            <button
              class="flex items-center justify-center h-7 w-7 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
              @click="togglePlay"
            >
              <svg v-if="!audio.isPlaying.value" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>

            <span class="text-[10px] text-slate-500 font-mono w-16">
              {{ formatTime(audio.currentTime.value) }} / {{ formatTime(audio.duration.value) }}
            </span>

            <!-- Status dot -->
            <div class="flex items-center gap-1 ml-auto">
              <div class="h-1.5 w-1.5 rounded-full" :class="audio.isPlaying.value ? 'bg-green-400 animate-pulse' : 'bg-slate-600'" />
              <span class="text-[10px]" :class="audio.isPlaying.value ? 'text-green-400' : 'text-slate-500'">
                {{ audio.isPlaying.value ? 'Analyzing' : 'Paused' }}
              </span>
            </div>
          </div>

          <!-- Seek bar -->
          <input
            type="range"
            :min="0"
            :max="audio.duration.value || 0"
            :value="audio.currentTime.value"
            step="0.1"
            class="w-full h-1 accent-[#2D95FC] cursor-pointer"
            @input="onSeek"
          />
        </div>
      </div>

      <!-- Minimized: just play/pause + name + status -->
      <div v-else-if="audio.fileName.value" class="flex items-center gap-2 px-3 py-1.5">
        <button class="text-slate-400 hover:text-white" @click="togglePlay">
          {{ audio.isPlaying.value ? '⏸' : '▶' }}
        </button>
        <span class="text-[10px] text-slate-400 truncate flex-1">{{ audio.fileName.value }}</span>
        <div class="h-1.5 w-1.5 rounded-full" :class="audio.isPlaying.value ? 'bg-green-400 animate-pulse' : 'bg-slate-600'" />
      </div>
    </div>
  </Teleport>
</template>
