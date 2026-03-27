<script setup lang="ts">
import { computed } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'

const store = useRayMarcherStore()

const emit = defineEmits<{
  openPlayer: []
}>()

const bands = computed(() => [
  { label: 'Bass', value: store.audio.bass, color: '#FF6B6B' },
  { label: 'Mid', value: store.audio.mid, color: '#4ECDC4' },
  { label: 'Treble', value: store.audio.treble, color: '#45B7D1' },
  { label: 'Amp', value: store.audio.amplitude, color: '#96CEB4' },
])

const ENERGY_COLORS: Record<string, string> = {
  calm: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  building: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  intense: 'bg-red-500/20 text-red-400 border-red-500/40',
  breakdown: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

function toggleAutoplayer() {
  store.audio.autoplayerEnabled = !store.audio.autoplayerEnabled
}
</script>

<template>
  <div class="flex flex-col gap-2">
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

    <!-- Autoplayer toggle -->
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

      <!-- Beat counter -->
      <span
        v-if="store.audio.autoplayerEnabled && store.audio.isCapturing && store.audio.autoplayerBeats > 0"
        class="text-[10px] text-slate-500"
      >
        {{ store.audio.autoplayerBeats }} beats
      </span>
    </div>
  </div>
</template>
