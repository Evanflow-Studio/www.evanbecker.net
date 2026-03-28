import { ref, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { useMeydaAnalyzer } from './useMeydaAnalyzer'
import { useEssentiaClassifier } from './useEssentiaClassifier'

const FFT_SIZE = 256
const SMOOTHING = 0.8
const BASS_END = 0.1
const MID_END = 0.4

/**
 * Audio capture composable -- plays audio files/URLs via a native <audio>
 * element and feeds FFT analysis + Meyda features + Essentia classification
 * into the Pinia store for shader reactivity.
 */
export function useAudioCapture() {
  const store = useRayMarcherStore()
  const meydaAnalyzer = useMeydaAnalyzer()
  const essentiaClassifier = useEssentiaClassifier()

  const isPlaying = ref(false)
  const fileName = ref('')
  const duration = ref(0)
  const currentTime = ref(0)
  const error = ref<string | null>(null)

  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let sourceNode: MediaElementAudioSourceNode | null = null
  let audioElement: HTMLAudioElement | null = null
  let dataArray: Uint8Array | null = null
  let animFrameId = 0
  let lastAnalyseTime = 0
  let essentiaInitialized = false

  function createAudioContext() {
    if (audioCtx) return
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = SMOOTHING
    dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.connect(audioCtx.destination)
  }

  function connectSource(element: HTMLAudioElement) {
    if (!audioCtx || !analyser) return
    // Disconnect previous source if any
    if (sourceNode) {
      try { sourceNode.disconnect() } catch { /* ignore */ }
    }
    sourceNode = audioCtx.createMediaElementSource(element)
    sourceNode.connect(analyser)

    // Start Meyda analyzer (needs source node, not analyser)
    meydaAnalyzer.start(audioCtx, sourceNode)
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

    // Sync Meyda features to store
    if (meydaAnalyzer.isActive.value) {
      store.audio.brightness = meydaAnalyzer.brightness.value
      store.audio.percussiveness = meydaAnalyzer.percussiveness.value
      store.audio.moodEnergy = meydaAnalyzer.energy.value
      store.audio.moodValence = meydaAnalyzer.valence.value
    }

    // Sync Essentia results to store
    if (essentiaClassifier.isReady.value) {
      store.audio.bpm = essentiaClassifier.bpm.value
      store.audio.moodCategory = essentiaClassifier.mood.value
      store.audio.essentiaReady = true
    }

    animFrameId = requestAnimationFrame(analyse)
  }

  function updateTime() {
    if (audioElement) {
      currentTime.value = audioElement.currentTime
      duration.value = audioElement.duration || 0
    }
    if (isPlaying.value) requestAnimationFrame(updateTime)
  }

  /** Load an audio file from a File object (drag-and-drop or file picker) */
  function loadFile(file: File) {
    stop()
    error.value = null
    createAudioContext()

    const url = URL.createObjectURL(file)
    audioElement = new Audio()
    audioElement.crossOrigin = 'anonymous'
    audioElement.src = url
    fileName.value = file.name

    audioElement.addEventListener('canplay', () => {
      connectSource(audioElement!)
      duration.value = audioElement!.duration || 0
    }, { once: true })

    audioElement.addEventListener('ended', () => {
      isPlaying.value = false
      store.audio.isCapturing = false
    })

    audioElement.addEventListener('error', () => {
      error.value = 'Failed to load audio file'
    })
  }

  /** Load audio from a direct URL (must be CORS-friendly for analysis) */
  function loadUrl(url: string) {
    stop()
    error.value = null
    createAudioContext()

    audioElement = new Audio()
    audioElement.crossOrigin = 'anonymous'
    audioElement.src = url
    fileName.value = url.split('/').pop()?.split('?')[0] || 'Audio'

    audioElement.addEventListener('canplay', () => {
      connectSource(audioElement!)
      duration.value = audioElement!.duration || 0
    }, { once: true })

    audioElement.addEventListener('ended', () => {
      isPlaying.value = false
      store.audio.isCapturing = false
    })

    audioElement.addEventListener('error', () => {
      error.value = 'Failed to load audio URL — must be a direct link to an audio file (CORS-enabled)'
    })
  }

  function play() {
    if (!audioElement) return
    if (audioCtx?.state === 'suspended') audioCtx.resume()
    audioElement.play()
    isPlaying.value = true
    store.audio.isCapturing = true
    animFrameId = requestAnimationFrame(analyse)
    requestAnimationFrame(updateTime)
  }

  function pause() {
    audioElement?.pause()
    isPlaying.value = false
    cancelAnimationFrame(animFrameId)
    // Zero out audio values so shader returns to normal
    store.audio.bass = 0
    store.audio.mid = 0
    store.audio.treble = 0
    store.audio.amplitude = 0
    store.audio.brightness = 0
    store.audio.percussiveness = 0
    store.audio.moodEnergy = 0
    store.audio.moodValence = 0
  }

  function seek(time: number) {
    if (audioElement) audioElement.currentTime = time
  }

  function stop() {
    pause()
    store.audio.isCapturing = false

    // Stop Meyda
    meydaAnalyzer.stop()

    // Stop Essentia
    essentiaClassifier.stop()

    if (sourceNode) {
      try { sourceNode.disconnect() } catch { /* ignore */ }
      sourceNode = null
    }
    if (audioElement) {
      audioElement.pause()
      if (audioElement.src.startsWith('blob:')) URL.revokeObjectURL(audioElement.src)
      audioElement = null
    }
    fileName.value = ''
    duration.value = 0
    currentTime.value = 0
    essentiaInitialized = false
  }

  function cleanup() {
    stop()
    essentiaClassifier.cleanup()
    if (audioCtx) {
      audioCtx.close()
      audioCtx = null
      analyser = null
      dataArray = null
    }
  }

  onUnmounted(cleanup)

  return {
    isPlaying,
    fileName,
    duration,
    currentTime,
    error,
    loadFile,
    loadUrl,
    play,
    pause,
    seek,
    stop,
    cleanup,
    meydaAnalyzer,
    essentiaClassifier,
  }
}
