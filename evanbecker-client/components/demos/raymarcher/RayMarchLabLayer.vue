<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useSessionHub } from '~/composables/raymarcher/audio/useSessionHub'
import { useVisualizationEngine } from '~/composables/raymarcher/audio/useVisualizationEngine'

// Experimental ray-marcher layer — audio visualizer + multiplayer sessions.
// Lives in its own component so Vite/Rollup code-splits `@microsoft/signalr`,
// `meyda`, and `essentia.js` into a chunk that's only fetched when someone has
// opted in via the Labs setting. Imported via Nuxt's `<LazyRayMarchLabLayer>`
// auto-import prefix so the core bundle never pays for it.

const props = defineProps<{
  showAudioPlayer: boolean
  showSessionPanel: boolean
  engineGl: () => WebGLRenderingContext | WebGL2RenderingContext | null
  canvasEl: HTMLCanvasElement | null
}>()

const emit = defineEmits<{
  'update:showAudioPlayer': [value: boolean]
  'update:showSessionPanel': [value: boolean]
}>()

// Initialize the session hub (does NOT auto-connect — that's user-driven via
// the session panel). Connection is opened when the user creates/joins a room.
const session = useSessionHub()

// Auto-open the audio player when a session connection is established, since
// the client needs it to sync playback with the host.
watch(() => session.isConnected.value, (connected) => {
  if (connected) emit('update:showAudioPlayer', true)
})

// Give the visualization engine GL access for clip detection during capture.
onMounted(() => {
  const vizEngine = useVisualizationEngine()
  vizEngine.setGLContext(props.engineGl() as WebGL2RenderingContext | null, props.canvasEl)
})
</script>

<template>
  <!-- Floating panels are teleported to <body> by their own implementations. -->
  <LazyAudioPlayer v-if="showAudioPlayer" @close="emit('update:showAudioPlayer', false)" />
  <LazySessionPanel v-if="showSessionPanel" @close="emit('update:showSessionPanel', false)" />
</template>
