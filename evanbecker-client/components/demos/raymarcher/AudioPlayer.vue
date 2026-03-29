<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useAudioCapture } from '~/composables/raymarcher/useAudioCapture'
import { useYouTubePlayer } from '~/composables/raymarcher/audio/useYouTubePlayer'
import { useYouTubeSearch } from '~/composables/raymarcher/audio/useYouTubeSearch'
import { usePlaybackQueue } from '~/composables/raymarcher/audio/usePlaybackQueue'
import { useTabAudioCapture } from '~/composables/raymarcher/audio/useTabAudioCapture'
import { useTrackMetadata } from '~/composables/raymarcher/audio/useTrackMetadata'
import { useSessionHub } from '~/composables/raymarcher/audio/useSessionHub'
import { useRayMarcherStore } from '~/stores/raymarcher'
import type { YouTubeTrack } from '~/composables/raymarcher/audio/useYouTubePlayer'

const emit = defineEmits<{
  close: []
}>()

const store = useRayMarcherStore()
const audio = useAudioCapture()
const yt = useYouTubePlayer()
const tabCapture = useTabAudioCapture()
const ytSearch = useYouTubeSearch()
const queue = usePlaybackQueue()
const trackMeta = useTrackMetadata()
const session = useSessionHub()

const activeTab = ref<'file' | 'youtube'>('youtube')
const urlInput = ref('')
const searchQuery = ref('')
const isDragOver = ref(false)
const minimized = ref(false)
const showQueue = ref(false)

// Session: non-hosts can't control playback
const controlsDisabled = computed(() => session.isConnected.value && !session.isHost.value)
// Host can only play when all members are fully ready (ready + visualizer)
const hostWaitingForReady = computed(() => session.isConnected.value && session.isHost.value && !session.allMembersFullyReady.value)


/**
 * Central function — every track change goes through here.
 * Loads video + resolves metadata in one place.
 */
function playTrack(track: YouTubeTrack) {
  // In a session, cue without auto-play if not all members are ready
  if (session.isConnected.value && session.isHost.value && !session.allMembersFullyReady.value) {
    yt.cueVideo(track.videoId)
  } else {
    yt.loadVideo(track.videoId)
  }
  trackMeta.resolve(track.title, track.channel)
  store.audio.youtubeUrl = track.videoId
  store.audio.trackTitle = track.title
  store.audio.trackArtist = track.channel
  if (import.meta.dev) console.log('%c[Player] Playing track', 'color: #2D95FC; font-weight: bold', track.title)
  // Host: immediately broadcast the new track to all clients
  if (session.isHost.value) {
    nextTick(() => session.broadcastPlaybackNow())
  }
}

// Init YouTube player
onMounted(() => {
  yt.init('yt-player-container')
  yt.setOnVideoEnd(() => {
    if (controlsDisabled.value) return // non-host: host controls queue advancement
    const next = queue.playNext()
    if (next) playTrack(next)
  })

  // Provide real-time player state to the session hub for heartbeat + immediate broadcasts
  session.setPlayerStateProvider(() => ({
    currentTime: yt.currentTime.value,
    duration: yt.duration.value,
    isPlaying: yt.isPlaying.value,
    videoId: yt.currentVideoId.value,
  }))

  // Host: broadcast immediately on play/pause state changes (don't wait for heartbeat)
  watch(() => yt.isPlaying.value, () => {
    if (session.isHost.value) session.broadcastPlaybackNow()
  })

  // Keep store in sync with YouTube player
  watch([yt.currentVideoId, yt.isPlaying], () => {
    store.audio.youtubeUrl = yt.currentVideoId.value
  })

  // Auto-broadcast visualizer connection status when tab capture starts/stops
  watch(() => tabCapture.isCapturing.value, (capturing) => {
    if (session.isConnected.value) {
      session.setVisualizerConnected(capturing)
    }
  })
})

// Session sync: play/pause + track load + time sync with cooldown
// Queues the sync if the player isn't ready yet and applies once it is
let pendingSync: typeof session.syncedPlayback.value = null
let lastSeekTime = 0        // timestamp of last seek — cooldown prevents re-seeking too fast
let lastSyncedVideoId = ''  // track what we already loaded to avoid re-loading same video
const SEEK_COOLDOWN_MS = 5000  // don't re-seek within 5 seconds of last seek
const DRIFT_THRESHOLD = 2.0    // seconds of drift before we seek

watch(() => session.syncedPlayback.value, (state) => {
  if (!state || session.isHost.value) return

  if (!yt.isReady.value) {
    pendingSync = state
    return
  }

  applySyncState(state)
}, { deep: true })

// Apply queued sync once player becomes ready
watch(() => yt.isReady.value, (ready) => {
  if (ready && pendingSync && !session.isHost.value) {
    applySyncState(pendingSync)
    pendingSync = null
  }
})

function applySyncState(state: NonNullable<typeof session.syncedPlayback.value>) {
  const now = Date.now()

  // Load new video if different — cue only, don't auto-play
  if (state.videoId && state.videoId !== lastSyncedVideoId) {
    lastSyncedVideoId = state.videoId
    yt.cueVideo(state.videoId)
    lastSeekTime = now
    if (import.meta.dev) console.log('%c[Session] Cueing host video:', 'color: #2D95FC', state.videoId, state.title)
    // If host says it's already playing, start after a brief buffer delay
    if (state.isPlaying) {
      setTimeout(() => {
        const networkDelta = state.sentAt ? (Date.now() - state.sentAt) / 1000 : 0
        yt.seekTo(state.currentTime + networkDelta)
        yt.play()
      }, 500)
    }
    return
  }

  // Sync play/pause — this is the primary event-driven sync
  if (state.isPlaying && !yt.isPlaying.value && !yt.isBuffering.value) {
    yt.play()
  } else if (!state.isPlaying && yt.isPlaying.value) {
    yt.pause()
  }

  // Time-delta seek — only when host explicitly sends state (cooldown prevents loops)
  if (state.currentTime > 0 && (now - lastSeekTime) > SEEK_COOLDOWN_MS) {
    const networkDelta = state.sentAt ? (now - state.sentAt) / 1000 : 0
    const hostTime = state.isPlaying ? state.currentTime + networkDelta : state.currentTime
    const drift = Math.abs(yt.currentTime.value - hostTime)

    if (drift > DRIFT_THRESHOLD) {
      yt.seekTo(hostTime)
      lastSeekTime = now
      if (import.meta.dev) console.log(`%c[Session] Seek to sync (drift: ${drift.toFixed(1)}s, latency: ${(networkDelta * 1000).toFixed(0)}ms)`, 'color: #F59E0B')
    }
  }
}

// Session sync: when host broadcasts queue, non-hosts replace their queue
watch(() => session.syncedQueue.value, (state) => {
  if (!state || session.isHost.value) return
  const tracks: YouTubeTrack[] = state.tracks.map(t => ({
    videoId: t.videoId,
    title: t.title,
    channel: t.channel,
    thumbnail: t.thumbnail,
  }))
  queue.replaceQueue(tracks, state.currentIndex)
}, { deep: true })

// Host: broadcast queue changes
watch(() => [queue.queue.value, queue.currentIndex.value] as const, () => {
  if (!session.isHost.value) return
  session.broadcastQueue({
    tracks: queue.queue.value.map(t => ({
      videoId: t.videoId,
      title: t.title,
      channel: t.channel,
      thumbnail: t.thumbnail,
    })),
    currentIndex: queue.currentIndex.value,
  })
}, { deep: true })


// YouTube search
watch(searchQuery, (q) => ytSearch.searchDebounced(q))

function addToQueueAndPlay(result: { videoId: string, title: string, channelTitle: string, thumbnailUrl: string }) {
  const track: YouTubeTrack = {
    videoId: result.videoId,
    title: result.title,
    channel: result.channelTitle,
    thumbnail: result.thumbnailUrl,
  }
  queue.addToQueue(track)
  // Always play the newly added track
  playTrack(track)
  searchQuery.value = ''
  ytSearch.clear()
}

function playQueueItem(index: number) {
  const track = queue.playAt(index)
  if (track) playTrack(track)
}

// File tab functions
function onLoadUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  audio.loadUrl(url)
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

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onSeek(e: Event) {
  if (controlsDisabled.value) return // non-host can't seek
  const value = parseFloat((e.target as HTMLInputElement).value)
  if (activeTab.value === 'youtube') {
    yt.seekTo(value)
    if (session.isHost.value) session.broadcastPlaybackNow()
  } else {
    audio.seek(value)
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- Hidden YouTube IFrame container -->
    <div id="yt-player-container" class="hidden" />

    <div
      class="fixed bottom-4 right-4 z-50 w-80 rounded-xl bg-black/85 backdrop-blur-md border border-slate-700/50 shadow-2xl overflow-hidden"
    >
      <!-- Title bar -->
      <div class="flex items-center justify-between px-3 py-2 bg-slate-800/50">
        <div class="flex items-center gap-2 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#2D95FC] shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
          <span class="text-xs text-slate-300 truncate">
            {{ activeTab === 'youtube' ? (queue.currentTrack.value?.title || 'YouTube Player') : (audio.fileName.value || 'Audio Player') }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <button class="text-slate-500 hover:text-slate-300 text-xs px-1" @click="minimized = !minimized">
            {{ minimized ? '▲' : '▼' }}
          </button>
          <button class="text-slate-500 hover:text-slate-300 text-xs px-1" @click="$emit('close')">✕</button>
        </div>
      </div>

      <div v-if="!minimized" class="px-3 pb-3 pt-2 space-y-2">
        <!-- Tab switcher -->
        <div class="flex gap-1 rounded-lg bg-slate-800/50 p-0.5">
          <button
            class="flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
            :class="activeTab === 'youtube' ? 'bg-[#0C65E5] text-white' : 'text-slate-400 hover:text-slate-200'"
            @click="activeTab = 'youtube'"
          >
            YouTube
          </button>
          <button
            class="flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
            :class="activeTab === 'file' ? 'bg-[#0C65E5] text-white' : 'text-slate-400 hover:text-slate-200'"
            @click="activeTab = 'file'"
          >
            File
          </button>
        </div>

        <!-- ==================== YOUTUBE TAB ==================== -->
        <template v-if="activeTab === 'youtube'">
          <!-- Search (host only in session) -->
          <div v-if="!controlsDisabled" class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search YouTube..."
              class="w-full rounded-md bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#2D95FC] focus:outline-none"
            />
            <svg v-if="ytSearch.isSearching.value" class="absolute right-2 top-1.5 h-3.5 w-3.5 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20" />
            </svg>
          </div>

          <!-- Search results -->
          <div v-if="ytSearch.results.value.length" class="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
            <button
              v-for="result in ytSearch.results.value"
              :key="result.videoId"
              class="flex items-center gap-2 w-full rounded-md p-1.5 text-left hover:bg-slate-700/50 transition-colors"
              @click="addToQueueAndPlay(result)"
            >
              <img :src="result.thumbnailUrl" :alt="result.title" class="h-8 w-12 rounded object-cover shrink-0" />
              <div class="min-w-0">
                <p class="text-[10px] text-slate-200 truncate leading-tight">{{ result.title }}</p>
                <p class="text-[9px] text-slate-500 truncate">{{ result.channelTitle }}</p>
              </div>
            </button>
          </div>

          <!-- Error -->
          <p v-if="ytSearch.searchError.value" class="text-[10px] text-red-400">{{ ytSearch.searchError.value }}</p>
          <p v-if="yt.error.value" class="text-[10px] text-red-400">{{ yt.error.value }}</p>

          <!-- Now Playing + Transport -->
          <div v-if="queue.currentTrack.value" class="space-y-1.5">
            <div class="flex items-center gap-2">
              <img :src="queue.currentTrack.value.thumbnail" class="h-9 w-12 rounded object-cover shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-[10px] text-slate-200 truncate leading-tight">{{ queue.currentTrack.value.title }}</p>
                <p class="text-[9px] text-slate-500 truncate">{{ queue.currentTrack.value.channel }}</p>
                <div v-if="store.audio.trackGenres.length" class="flex flex-wrap gap-0.5 mt-0.5">
                  <span
                    v-for="genre in store.audio.trackGenres.slice(0, 3)"
                    :key="genre"
                    class="rounded-full bg-[#2D95FC]/15 px-1.5 py-0 text-[8px] text-[#2D95FC]"
                  >{{ genre }}</span>
                </div>
              </div>
            </div>

            <!-- Host: waiting for all members to ready up -->
            <div v-if="hostWaitingForReady" class="flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1">
              <div class="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span class="text-[9px] text-yellow-400">Waiting for all members to ready up</span>
            </div>

            <!-- Session sync banner for non-hosts -->
            <div v-else-if="controlsDisabled" class="flex items-center gap-1.5 rounded-md bg-[#2D95FC]/10 px-2 py-1">
              <div class="h-1.5 w-1.5 rounded-full bg-[#2D95FC] animate-pulse" />
              <span class="text-[9px] text-[#2D95FC]">Synced with {{ session.hostName.value }}</span>
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-2" :class="controlsDisabled ? 'opacity-50 pointer-events-none' : ''">
              <button
                class="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                :disabled="!queue.hasPrevious.value || controlsDisabled"
                @click="() => { const t = queue.playPrevious(); if (t) playTrack(t) }"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" /></svg>
              </button>

              <button
                class="flex items-center justify-center h-7 w-7 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-40"
                :disabled="controlsDisabled || hostWaitingForReady"
                :title="hostWaitingForReady ? 'Waiting for all members to be ready' : ''"
                @click="yt.togglePlay()"
              >
                <svg v-if="!yt.isPlaying.value" class="h-3.5 w-3.5 text-white ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>

              <button
                class="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                :disabled="!queue.hasNext.value || controlsDisabled"
                @click="() => { const t = queue.playNext(); if (t) playTrack(t) }"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.555 5.168A1 1 0 0010 6v2.798L4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" /></svg>
              </button>

              <span class="text-[10px] text-slate-500 font-mono ml-1">
                {{ formatTime(yt.currentTime.value) }} / {{ formatTime(yt.duration.value) }}
              </span>

              <!-- Shuffle & Repeat (host only) -->
              <div v-if="!controlsDisabled" class="flex items-center gap-1 ml-auto">
                <button
                  class="text-[10px] transition-colors"
                  :class="queue.isShuffled.value ? 'text-[#2D95FC]' : 'text-slate-500 hover:text-slate-300'"
                  @click="queue.toggleShuffle()"
                  title="Shuffle"
                >⇄</button>
                <button
                  class="text-[10px] transition-colors"
                  :class="queue.repeatMode.value !== 'none' ? 'text-[#2D95FC]' : 'text-slate-500 hover:text-slate-300'"
                  @click="queue.cycleRepeat()"
                  :title="'Repeat: ' + queue.repeatMode.value"
                >{{ queue.repeatMode.value === 'one' ? '🔂' : '🔁' }}</button>
              </div>
            </div>

            <!-- Seek bar (host only — non-hosts see read-only progress) -->
            <input
              type="range"
              :min="0"
              :max="yt.duration.value || 0"
              :value="yt.currentTime.value"
              step="0.5"
              class="w-full h-1 accent-[#2D95FC]"
              :class="controlsDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'"
              @input="onSeek"
            />

            <!-- Volume -->
            <div class="flex items-center gap-2">
              <span class="text-[9px] text-slate-500">🔊</span>
              <input
                type="range"
                :min="0"
                :max="100"
                :value="yt.volume.value"
                class="flex-1 h-1 accent-[#2D95FC] cursor-pointer"
                @input="(e: Event) => yt.setVolume(parseInt((e.target as HTMLInputElement).value))"
              />
            </div>
          </div>

          <!-- Tab Audio Capture (Visualizer) -->
          <div v-if="queue.currentTrack.value" class="rounded-lg border border-slate-700/50 p-2">
            <div v-if="!tabCapture.isCapturing.value" class="space-y-1">
              <button
                class="w-full rounded-md bg-emerald-600 px-2 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                :disabled="!tabCapture.isSupported.value"
                @click="tabCapture.startCapture()"
              >
                ✦ Enable Visualizer
              </button>
              <p class="text-[9px] text-slate-500 text-center">Captures tab audio for real-time analysis</p>
            </div>
            <div v-else class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <div class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span class="text-[10px] text-emerald-400">Analyzing audio</span>
              </div>
              <button
                class="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                @click="tabCapture.stopCapture()"
              >Stop</button>
            </div>
            <p v-if="tabCapture.error.value" class="text-[9px] text-red-400 mt-1">{{ tabCapture.error.value }}</p>
          </div>

          <!-- Queue toggle -->
          <div v-if="queue.queue.value.length > 0">
            <button
              class="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
              @click="showQueue = !showQueue"
            >
              Queue ({{ queue.queue.value.length }}) {{ showQueue ? '▲' : '▼' }}
            </button>

            <div v-if="showQueue" class="mt-1 max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
              <div
                v-for="(track, i) in queue.queue.value"
                :key="i"
                class="flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors cursor-pointer"
                :class="i === queue.currentIndex.value ? 'bg-[#0C65E5]/20' : 'hover:bg-slate-700/30'"
                @click="playQueueItem(i)"
              >
                <span class="text-[9px] text-slate-500 w-3 text-right shrink-0">{{ i + 1 }}</span>
                <p class="text-[10px] truncate flex-1" :class="i === queue.currentIndex.value ? 'text-[#2D95FC]' : 'text-slate-300'">
                  {{ track.title }}
                </p>
                <button
                  class="text-slate-600 hover:text-red-400 text-[10px] shrink-0"
                  @click.stop="queue.removeFromQueue(i)"
                >✕</button>
              </div>
            </div>
          </div>
        </template>

        <!-- ==================== FILE TAB ==================== -->
        <template v-else-if="activeTab === 'file'">
          <div
            class="relative rounded-lg border border-dashed transition-colors text-center py-3 cursor-pointer"
            :class="isDragOver ? 'border-[#2D95FC] bg-[#2D95FC]/10' : 'border-slate-600 hover:border-slate-400'"
            @drop.prevent="onDrop"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @click="($refs.fileInput as HTMLInputElement)?.click()"
          >
            <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="onFileInput" />
            <p class="text-[11px] text-slate-400">
              <span class="text-[#2D95FC]">Drop audio file</span> or click to browse
            </p>
          </div>

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

          <p v-if="audio.error.value" class="text-[10px] text-red-400">{{ audio.error.value }}</p>

          <div v-if="audio.fileName.value" class="space-y-1.5">
            <div class="flex items-center gap-2">
              <button
                class="flex items-center justify-center h-7 w-7 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
                @click="audio.isPlaying.value ? audio.pause() : audio.play()"
              >
                <svg v-if="!audio.isPlaying.value" class="h-3.5 w-3.5 text-white ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
              <span class="text-[10px] text-slate-500 font-mono w-16">
                {{ formatTime(audio.currentTime.value) }} / {{ formatTime(audio.duration.value) }}
              </span>
              <div class="flex items-center gap-1 ml-auto">
                <div class="h-1.5 w-1.5 rounded-full" :class="audio.isPlaying.value ? 'bg-green-400 animate-pulse' : 'bg-slate-600'" />
                <span class="text-[10px]" :class="audio.isPlaying.value ? 'text-green-400' : 'text-slate-500'">
                  {{ audio.isPlaying.value ? 'Analyzing' : 'Paused' }}
                </span>
              </div>
            </div>
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
        </template>
      </div>

      <!-- Minimized view -->
      <div v-else class="flex items-center gap-2 px-3 py-1.5">
        <button
          class="text-slate-400 hover:text-white disabled:opacity-30"
          :disabled="controlsDisabled"
          @click="activeTab === 'youtube' ? yt.togglePlay() : (audio.isPlaying.value ? audio.pause() : audio.play())"
        >
          {{ (activeTab === 'youtube' ? yt.isPlaying.value : audio.isPlaying.value) ? '⏸' : '▶' }}
        </button>
        <span class="text-[10px] text-slate-400 truncate flex-1">
          {{ activeTab === 'youtube' ? (queue.currentTrack.value?.title || 'No track') : (audio.fileName.value || 'No file') }}
        </span>
        <div class="h-1.5 w-1.5 rounded-full" :class="(activeTab === 'youtube' ? yt.isPlaying.value : audio.isPlaying.value) ? 'bg-green-400 animate-pulse' : 'bg-slate-600'" />
      </div>
    </div>
  </Teleport>
</template>
