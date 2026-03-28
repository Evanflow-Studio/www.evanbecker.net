import { ref } from 'vue'
import type { MoodCategory } from '~/types/raymarcher'

/**
 * Periodic mood classification via Essentia.js WASM.
 *
 * Buffers ~3 seconds of raw audio samples, then runs Essentia algorithms
 * (BPM estimation, spectral complexity, dissonance) to classify the mood.
 *
 * If Essentia.js WASM fails to load (common in Vite/Nuxt environments),
 * the composable degrades gracefully — all values stay at defaults and
 * `loadError` is set. The autoplayer continues using Meyda-only features.
 */
export function useEssentiaClassifier() {
  const isReady = ref(false)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const mood = ref<MoodCategory | null>(null)
  const bpm = ref(0)

  let essentia: any = null
  let audioContext: AudioContext | null = null
  let scriptNode: ScriptProcessorNode | null = null
  let sourceNode: AudioNode | null = null

  // Sample buffer: accumulate raw PCM for periodic analysis
  const SAMPLE_RATE = 44100
  const BUFFER_SECONDS = 3
  const BUFFER_SIZE = SAMPLE_RATE * BUFFER_SECONDS
  let sampleBuffer = new Float32Array(BUFFER_SIZE)
  let bufferWritePos = 0
  let lastAnalysisTime = 0
  const ANALYSIS_INTERVAL_MS = 3000

  let analysisTimer: ReturnType<typeof setInterval> | null = null

  async function loadEssentia(): Promise<boolean> {
    if (essentia) return true
    isLoading.value = true
    loadError.value = null

    try {
      // Dynamic import to avoid SSR/bundling issues with WASM
      const [wasmModule, coreModule] = await Promise.all([
        import('essentia.js/dist/essentia-wasm.es.js'),
        import('essentia.js/dist/essentia.js-core.es.js'),
      ])

      const EssentiaWASM = wasmModule.default || wasmModule
      const EssentiaClass = coreModule.default || coreModule

      // EssentiaWASM is a factory that returns a promise
      let wasmInstance: any
      if (typeof EssentiaWASM === 'function') {
        wasmInstance = await EssentiaWASM()
      } else if (EssentiaWASM && typeof EssentiaWASM.then === 'function') {
        wasmInstance = await EssentiaWASM
      } else {
        wasmInstance = EssentiaWASM
      }

      essentia = new EssentiaClass(wasmInstance, false)
      isReady.value = true
      isLoading.value = false
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[useEssentiaClassifier] Failed to load Essentia.js WASM:', msg)
      loadError.value = msg
      isLoading.value = false
      return false
    }
  }

  function analyzeBuffer() {
    if (!essentia || bufferWritePos < SAMPLE_RATE) return // need at least 1 second

    const now = performance.now()
    if (now - lastAnalysisTime < ANALYSIS_INTERVAL_MS) return
    lastAnalysisTime = now

    try {
      // Get the filled portion of the buffer
      const samples = sampleBuffer.slice(0, Math.min(bufferWritePos, BUFFER_SIZE))
      const signal = essentia.arrayToVector(samples)

      // BPM detection
      try {
        const bpmResult = essentia.PercivalBpmEstimator(signal)
        if (bpmResult && bpmResult.bpm > 0) {
          bpm.value = Math.round(bpmResult.bpm)
        }
      } catch {
        // Some signals cause BPM detection to fail — not critical
      }

      // Spectral complexity (via windowed frames)
      let spectralComplexity = 0
      let dynamicComplexity = 0

      try {
        const dcResult = essentia.DynamicComplexity(signal, 2048, SAMPLE_RATE)
        if (dcResult) {
          dynamicComplexity = dcResult.dynamicComplexity ?? 0
        }
      } catch { /* non-critical */ }

      // Energy via RMS
      let energy = 0
      try {
        const rmsResult = essentia.RMS(signal)
        if (rmsResult) {
          energy = rmsResult.rms ?? 0
        }
      } catch { /* non-critical */ }

      // Classify mood heuristically from features
      mood.value = classifyMood(energy, dynamicComplexity, bpm.value)
    } catch (err) {
      // Analysis failed on this buffer — not critical, try again next cycle
    }
  }

  function classifyMood(energy: number, dynamicComplexity: number, detectedBpm: number): MoodCategory {
    // Simple 2-axis classification:
    // High energy + high complexity = aggressive
    // High energy + low complexity = happy
    // Low energy + high complexity = sad
    // Low energy + low complexity = relaxed
    const highEnergy = energy > 0.1 || detectedBpm > 120
    const highComplexity = dynamicComplexity > 3

    if (highEnergy && highComplexity) return 'aggressive'
    if (highEnergy && !highComplexity) return 'happy'
    if (!highEnergy && highComplexity) return 'sad'
    return 'relaxed'
  }

  function handleAudioProcess(event: AudioProcessingEvent) {
    const input = event.inputBuffer.getChannelData(0)
    for (let i = 0; i < input.length; i++) {
      sampleBuffer[bufferWritePos % BUFFER_SIZE] = input[i]
      bufferWritePos++
    }
    // Wrap around
    if (bufferWritePos >= BUFFER_SIZE * 2) {
      bufferWritePos = BUFFER_SIZE
    }
  }

  async function start(ctx: AudioContext, source: AudioNode) {
    audioContext = ctx
    sourceNode = source

    // Try to load Essentia (non-blocking, fall back gracefully)
    const loaded = await loadEssentia()
    if (!loaded) return

    // Create a ScriptProcessorNode to capture raw samples
    // (separate from Meyda's pipeline)
    try {
      scriptNode = audioContext.createScriptProcessor(4096, 1, 1)
      scriptNode.addEventListener('audioprocess', handleAudioProcess as any)
      sourceNode.connect(scriptNode)
      scriptNode.connect(audioContext.destination)
    } catch (err) {
      console.warn('[useEssentiaClassifier] Failed to create ScriptProcessor:', err)
      return
    }

    // Run analysis periodically
    analysisTimer = setInterval(analyzeBuffer, ANALYSIS_INTERVAL_MS)
  }

  function stop() {
    if (analysisTimer) {
      clearInterval(analysisTimer)
      analysisTimer = null
    }

    if (scriptNode) {
      scriptNode.removeEventListener('audioprocess', handleAudioProcess as any)
      try { scriptNode.disconnect() } catch { /* ignore */ }
      scriptNode = null
    }

    bufferWritePos = 0
    sampleBuffer = new Float32Array(BUFFER_SIZE)
    lastAnalysisTime = 0
    mood.value = null
    bpm.value = 0
  }

  function cleanup() {
    stop()
    if (essentia) {
      try { essentia.delete() } catch { /* ignore */ }
      essentia = null
    }
    isReady.value = false
  }

  return {
    isReady,
    isLoading,
    loadError,
    mood,
    bpm,
    start,
    stop,
    cleanup,
  }
}
