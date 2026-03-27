<script setup lang="ts">
import { computed } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { useSpotifyPlayer } from '~/composables/raymarcher/audio/useSpotifyPlayer'

const store = useRayMarcherStore()
const spotify = useSpotifyPlayer()

const emit = defineEmits<{
  openPlayer: []
}>()

const bands = computed(() => [
  { label: 'Bass', value: store.audio.bass, color: '#FF6B6B' },
  { label: 'Mid', value: store.audio.mid, color: '#4ECDC4' },
  { label: 'Treble', value: store.audio.treble, color: '#45B7D1' },
  { label: 'Amp', value: store.audio.amplitude, color: '#96CEB4' },
  { label: 'Bright', value: store.audio.brightness, color: '#FFD93D' },
  { label: 'Perc', value: store.audio.percussiveness, color: '#FF8A5C' },
])

const ENERGY_COLORS: Record<string, string> = {
  calm: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  building: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  intense: 'bg-red-500/20 text-red-400 border-red-500/40',
  breakdown: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

const MOOD_EMOJI: Record<string, string> = {
  aggressive: 'fire',
  happy: 'note',
  sad: 'drop',
  relaxed: 'zen',
}

const MOOD_LABEL: Record<string, string> = {
  aggressive: 'Aggressive',
  happy: 'Happy',
  sad: 'Sad',
  relaxed: 'Relaxed',
}

const MOOD_COLORS: Record<string, string> = {
  aggressive: 'bg-red-500/20 text-red-400 border-red-500/40',
  happy: 'bg-green-500/20 text-green-400 border-green-500/40',
  sad: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  relaxed: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
}

// Preset positions in mood space for the dot plot
const MOOD_PRESETS = [
  { name: 'Deep Sea',         energy: 0.2, valence: 0.6 },
  { name: 'Crystal Array',    energy: 0.1, valence: 0.3 },
  { name: 'Dreamscape',       energy: 0.4, valence: 0.7 },
  { name: 'Jellyfish',        energy: 0.5, valence: 0.8 },
  { name: 'Coral Reef',       energy: 0.3, valence: 0.5 },
  { name: 'Vortex',           energy: 0.8, valence: 0.4 },
  { name: 'Shattered Ice',    energy: 0.9, valence: 0.2 },
  { name: 'Alien Hive',       energy: 0.7, valence: 0.3 },
  { name: 'Neon Grid',        energy: 0.6, valence: 0.6 },
  { name: 'Clockwork',        energy: 0.5, valence: 0.4 },
  { name: 'Infinite Descent', energy: 0.4, valence: 0.2 },
]

function toggleAutoplayer() {
  store.audio.autoplayerEnabled = !store.audio.autoplayerEnabled
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Spotify connect section -->
    <div class="flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-900/30 p-2">
      <div v-if="!spotify.isConnected.value" class="flex items-center gap-2">
        <button
          class="h-8 rounded-md border border-green-600/50 bg-green-600/15 px-3 text-xs font-medium text-green-400 transition-colors hover:bg-green-600/25"
          @click="spotify.connect"
        >
          <span class="mr-1.5">&#9835;</span>Connect Spotify
        </button>
        <span class="text-[10px] text-slate-500">Stream from your Spotify account</span>
        <p v-if="spotify.error.value" class="text-[10px] text-red-400">{{ spotify.error.value }}</p>
      </div>
      <div v-else class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span class="text-[11px] text-slate-300">{{ spotify.displayName.value }}</span>
          <span
            v-if="spotify.isPremium.value"
            class="rounded-full border border-yellow-500/40 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-medium text-yellow-400"
          >PREMIUM</span>
          <span
            v-else
            class="rounded-full border border-slate-600 bg-slate-800/50 px-1.5 py-0.5 text-[9px] font-medium text-slate-400"
          >FREE</span>
          <button
            class="ml-auto text-[10px] text-slate-500 hover:text-red-400 transition-colors"
            @click="spotify.disconnect"
          >Disconnect</button>
        </div>
        <!-- Current track -->
        <div v-if="spotify.currentTrack.value" class="flex items-center gap-2 rounded-md bg-slate-800/50 p-1.5">
          <img
            v-if="spotify.currentTrack.value.albumArt"
            :src="spotify.currentTrack.value.albumArt"
            class="h-8 w-8 rounded-sm"
            alt=""
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[11px] text-slate-200">{{ spotify.currentTrack.value.name }}</p>
            <p class="truncate text-[10px] text-slate-500">{{ spotify.currentTrack.value.artist }}</p>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-1.5 w-1.5 rounded-full" :class="spotify.isPlaying.value ? 'bg-green-400 animate-pulse' : 'bg-slate-600'" />
            <span class="text-[9px]" :class="spotify.isPlaying.value ? 'text-green-400' : 'text-slate-500'">
              {{ spotify.isPlaying.value ? 'Playing' : 'Paused' }}
            </span>
          </div>
        </div>
        <!-- Analysis status -->
        <div v-if="spotify.currentTrack.value && spotify.analysis.value" class="flex items-center gap-2">
          <span class="text-[9px] text-slate-600">Analysis loaded</span>
          <div class="h-1 flex-1 rounded-full bg-slate-800">
            <div
              class="h-full rounded-full bg-green-500/40 transition-all duration-300"
              :style="{ width: '100%' }"
            />
          </div>
        </div>
        <p v-if="spotify.error.value" class="text-[10px] text-red-400">{{ spotify.error.value }}</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        class="h-8 rounded-md border px-3 text-xs font-medium transition-colors"
        :class="store.audio.isCapturing
          ? 'border-green-500/50 bg-green-500/10 text-green-400'
          : 'border-slate-600 bg-slate-800 text-slate-300 hover:text-white'"
        @click="emit('openPlayer')"
      >
        {{ store.audio.isCapturing ? '&#9835; Audio Active' : '&#9835; Open Audio Player' }}
      </button>

      <!-- Mini FFT bars -->
      <div v-if="store.audio.isCapturing" class="flex items-end gap-1 h-6">
        <div
          v-for="band in bands"
          :key="band.label"
          class="w-3 rounded-t transition-all duration-75"
          :style="{
            height: Math.max(2, band.value * 24) + 'px',
            backgroundColor: band.color,
            opacity: 0.4 + band.value * 0.6,
          }"
          :title="`${band.label}: ${(band.value * 100).toFixed(0)}%`"
        />
      </div>

      <span v-if="store.audio.isCapturing" class="text-[10px] text-slate-500">
        B:{{ (store.audio.bass * 100).toFixed(0) }}
        M:{{ (store.audio.mid * 100).toFixed(0) }}
        T:{{ (store.audio.treble * 100).toFixed(0) }}
      </span>
    </div>

    <!-- Autoplayer toggle row -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="h-7 rounded-md border px-2.5 text-[11px] font-medium transition-colors"
        :class="store.audio.autoplayerEnabled
          ? 'border-[#2D95FC]/50 bg-[#2D95FC]/15 text-[#2D95FC]'
          : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-slate-200'"
        @click="toggleAutoplayer"
      >
        {{ store.audio.autoplayerEnabled ? 'Autoplayer ON' : 'Autoplayer' }}
      </button>

      <!-- Energy state badge -->
      <span
        v-if="store.audio.autoplayerEnabled && store.audio.isCapturing"
        class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize"
        :class="ENERGY_COLORS[store.audio.autoplayerEnergy] || ENERGY_COLORS.calm"
      >
        {{ store.audio.autoplayerEnergy }}
      </span>

      <!-- Mood category badge (Essentia) -->
      <span
        v-if="store.audio.autoplayerEnabled && store.audio.isCapturing && store.audio.moodCategory"
        class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
        :class="MOOD_COLORS[store.audio.moodCategory] || ''"
      >
        {{ MOOD_LABEL[store.audio.moodCategory] || store.audio.moodCategory }}
      </span>

      <!-- BPM badge -->
      <span
        v-if="store.audio.autoplayerEnabled && store.audio.isCapturing && store.audio.bpm > 0"
        class="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-300"
      >
        {{ store.audio.bpm }} BPM
      </span>

      <!-- Beat counter -->
      <span
        v-if="store.audio.autoplayerEnabled && store.audio.isCapturing && store.audio.autoplayerBeats > 0"
        class="text-[10px] text-slate-500"
      >
        {{ store.audio.autoplayerBeats }} beats
      </span>
    </div>

    <!-- Mood space dot plot -->
    <div
      v-if="store.audio.autoplayerEnabled && store.audio.isCapturing"
      class="relative mt-1 h-[72px] w-full rounded-md border border-slate-700/50 bg-slate-900/50"
      title="Mood space: X=Energy, Y=Valence"
    >
      <!-- Axis labels -->
      <span class="absolute bottom-0.5 left-1 text-[8px] text-slate-600 select-none">calm</span>
      <span class="absolute bottom-0.5 right-1 text-[8px] text-slate-600 select-none">intense</span>
      <span class="absolute top-0.5 left-1 text-[8px] text-slate-600 select-none">bright</span>
      <span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-slate-700 select-none">energy &rarr;</span>

      <!-- Preset dots (faded) -->
      <div
        v-for="p in MOOD_PRESETS"
        :key="p.name"
        class="absolute h-1.5 w-1.5 rounded-full bg-slate-600/40"
        :style="{
          left: (p.energy * 100) + '%',
          bottom: (p.valence * 100) + '%',
          transform: 'translate(-50%, 50%)',
        }"
        :title="p.name"
      />

      <!-- Current mood position (bright dot) -->
      <div
        class="absolute h-2.5 w-2.5 rounded-full bg-[#2D95FC] shadow-[0_0_6px_rgba(45,149,252,0.6)] transition-all duration-300"
        :style="{
          left: (store.audio.moodEnergy * 100) + '%',
          bottom: (store.audio.moodValence * 100) + '%',
          transform: 'translate(-50%, 50%)',
        }"
      />
    </div>
  </div>
</template>
