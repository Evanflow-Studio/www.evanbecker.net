import { ref, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { useMeydaAnalyzer } from '../useMeydaAnalyzer'
import { useEssentiaClassifier } from '../useEssentiaClassifier'
import { useVisualizationEngine } from './useVisualizationEngine'

const FFT_SIZE = 256
const SMOOTHING = 0.8
const BASS_END = 0.1
const MID_END = 0.4

/**
 * Captures audio from the current browser tab via getDisplayMedia
 * and feeds it into the Meyda/Essentia analysis pipeline.
 *
 * The YouTube IFrame plays audio normally — this captures a parallel
 * copy for analysis only (suppressLocalAudioPlayback: false).
 */
export function useTabAudioCapture() {
  const store = useRayMarcherStore()
  const meydaAnalyzer = useMeydaAnalyzer()
  const essentiaClassifier = useEssentiaClassifier()
  const vizEngine = useVisualizationEngine()

  const isCapturing = ref(false)
  const isSupported = ref(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia)
  const error = ref<string | null>(null)

  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let mediaStream: MediaStream | null = null
  let dataArray: Uint8Array | null = null
  let animFrameId = 0
  let lastAnalyseTime = 0
  let essentiaInitialized = false

  async function startCapture() {
    if (isCapturing.value) return
    error.value = null

    if (!navigator.mediaDevices?.getDisplayMedia) {
      error.value = 'Tab audio capture is not supported in this browser. Use Chrome 109+ for best results.'
      return
    }

    try {
      // Request tab audio capture
      // Chrome REQUIRES video: true for getDisplayMedia — the "Share tab audio"
      // checkbox only appears when sharing a tab, which needs the video prompt.
      // We immediately discard the video track after capture.
      const constraints: any = {
        audio: {
          suppressLocalAudioPlayback: false, // Keep playing audio through speakers
        },
        video: true, // Required for Chrome to show the tab sharing prompt with audio option
        preferCurrentTab: true, // Chrome 109+: pre-selects current tab
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

      // Check if we actually got an audio track
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        // Stop any video tracks
        stream.getTracks().forEach(t => t.stop())
        error.value = 'No audio track captured. Make sure "Share tab audio" is checked. This feature works best in Chrome or Edge — Firefox has limited tab audio support.'
        return
      }

      // Stop video tracks if we don't need them
      stream.getVideoTracks().forEach(t => t.stop())

      mediaStream = stream

      // Set up audio analysis pipeline
      audioCtx = new AudioContext()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = SMOOTHING
      dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Create source from the captured stream (analysis-only, no destination needed)
      sourceNode = audioCtx.createMediaStreamSource(stream)
      sourceNode.connect(analyser)

      // Start Meyda
      meydaAnalyzer.start(audioCtx, sourceNode)

      // Start Essentia for BPM/mood classification
      await initEssentiaIfNeeded()

      // Listen for stream ending (user clicks "Stop sharing")
      audioTracks[0].addEventListener('ended', () => {
        stopCapture()
      })

      isCapturing.value = true
      store.audio.isCapturing = true
      if (import.meta.dev) {
        console.log('%c[TabCapture] Started', 'color: #10B981; font-weight: bold',
          { audioTracks: audioTracks.length, sampleRate: audioCtx.sampleRate })
      }
      vizEngine.start()
      animFrameId = requestAnimationFrame(analyse)

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        error.value = 'Permission denied. Click "Enable Visualizer" and select the tab to share.'
      } else {
        error.value = `Failed to capture tab audio: ${err.message || err}`
        if (import.meta.dev) console.error('[useTabAudioCapture]', err)
      }
    }
  }

  async function initEssentiaIfNeeded() {
    if (essentiaInitialized || !audioCtx || !sourceNode) return
    essentiaInitialized = true
    await essentiaClassifier.start(audioCtx, sourceNode)
    store.audio.essentiaReady = essentiaClassifier.isReady.value
  }

  function analyse() {
    if (!analyser || !dataArray) return
    analyser.getByteFrequencyData(dataArray)

    const bins = dataArray.length
    const bassEnd = Math.floor(bins * BASS_END)
    const midEnd = Math.floor(bins * MID_END)

    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0
    for (let i = 0; i < bins; i++) {
      const val = dataArray[i] / 255
      totalSum += val
      if (i < bassEnd) bassSum += val
      else if (i < midEnd) midSum += val
      else trebleSum += val
    }

    store.audio.bass = bassEnd > 0 ? bassSum / bassEnd : 0
    store.audio.mid = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0
    store.audio.treble = (bins - midEnd) > 0 ? trebleSum / (bins - midEnd) : 0
    store.audio.amplitude = bins > 0 ? totalSum / bins : 0

    // Sync Meyda features
    if (meydaAnalyzer.isActive.value) {
      store.audio.brightness = meydaAnalyzer.brightness.value
      store.audio.percussiveness = meydaAnalyzer.percussiveness.value
      store.audio.moodEnergy = meydaAnalyzer.energy.value
      store.audio.moodValence = meydaAnalyzer.valence.value
    }

    // Sync Essentia results
    if (essentiaClassifier.isReady.value) {
      store.audio.bpm = essentiaClassifier.bpm.value
      store.audio.moodCategory = essentiaClassifier.mood.value
      store.audio.essentiaReady = true
    }

    // Drive visualization engine (continuous parameter modulation)
    const now = performance.now()
    const dt = lastAnalyseTime > 0 ? (now - lastAnalyseTime) / 1000 : 1 / 60
    lastAnalyseTime = now

    if (vizEngine.isActive.value) {
      vizEngine.update(dt)
    }

    animFrameId = requestAnimationFrame(analyse)
  }

  function stopCapture() {
    cancelAnimationFrame(animFrameId)

    vizEngine.stop()
    meydaAnalyzer.stop()
    essentiaClassifier.stop()

    if (sourceNode) {
      try { sourceNode.disconnect() } catch { /* ignore */ }
      sourceNode = null
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }

    if (audioCtx) {
      audioCtx.close()
      audioCtx = null
      analyser = null
      dataArray = null
    }

    isCapturing.value = false
    essentiaInitialized = false
    lastAnalyseTime = 0

    // Zero out store values
    store.audio.isCapturing = false
    store.audio.bass = 0
    store.audio.mid = 0
    store.audio.treble = 0
    store.audio.amplitude = 0
    store.audio.brightness = 0
    store.audio.percussiveness = 0
    store.audio.moodEnergy = 0
    store.audio.moodValence = 0
  }

  onUnmounted(() => {
    stopCapture()
    essentiaClassifier.cleanup()
  })

  return {
    isCapturing,
    isSupported,
    error,
    startCapture,
    stopCapture,
    meydaAnalyzer,
    essentiaClassifier,
  }
}
