import { ref, shallowRef } from 'vue'
import type { MeydaFeatures, MoodPoint } from '~/types/raymarcher'

/**
 * Per-frame audio feature extraction via Meyda.
 *
 * Creates a MeydaAnalyzer connected to the provided AudioContext + source node
 * and extracts spectral/timbral features every buffer (512 samples ~11ms at 44.1kHz).
 * Computes a 2D mood point (energy, valence) from the raw features.
 */
export function useMeydaAnalyzer() {
  const isActive = ref(false)
  const energy = ref(0)
  const valence = ref(0)
  const brightness = ref(0)
  const percussiveness = ref(0)

  const features = shallowRef<MeydaFeatures>({
    rms: 0,
    spectralCentroid: 0,
    spectralFlatness: 0,
    zcr: 0,
    spectralRolloff: 0,
    mfcc: [],
    chroma: [],
  })

  let analyzer: any = null
  let Meyda: any = null

  // Smoothing coefficients — exponential moving average
  const SMOOTH = 0.15 // lower = smoother

  // Normalization ranges (approximate, tuned for music)
  const CENTROID_MAX = 8000   // spectralCentroid typical max for music
  const ZCR_MAX = 200         // zero crossing rate typical max
  const ROLLOFF_MAX = 12000   // spectral rolloff typical max

  function smoothValue(current: number, target: number): number {
    return current + (target - current) * SMOOTH
  }

  /**
   * Detect harmonic content from chroma — compute the variance of chroma bins.
   * High variance = dominant tonal center = harmonic/melodic.
   * Low variance = energy spread evenly = noise/percussion.
   */
  function chromaHarmony(chroma: number[]): number {
    if (!chroma || chroma.length === 0) return 0.5
    const mean = chroma.reduce((s, v) => s + v, 0) / chroma.length
    const variance = chroma.reduce((s, v) => s + (v - mean) ** 2, 0) / chroma.length
    // Normalize: higher variance = more tonal, range roughly 0-0.1 mapped to 0-1
    return Math.min(1, variance * 10)
  }

  /**
   * Compute 2D mood point from raw Meyda features.
   *
   * Energy (arousal): combination of loudness, brightness, and percussiveness.
   * Valence (positivity): inversely related to noise, positively related to harmony.
   */
  function computeMood(f: MeydaFeatures): MoodPoint {
    const normCentroid = Math.min(1, f.spectralCentroid / CENTROID_MAX)
    const normZcr = Math.min(1, f.zcr / ZCR_MAX)
    const normRms = Math.min(1, f.rms * 3) // rms is typically 0-0.3 for music

    // Energy = weighted sum of loudness + brightness + percussiveness
    const e = normRms * 0.5 + normCentroid * 0.3 + normZcr * 0.2

    // Valence = tonal clarity (inverted flatness) + chroma harmony
    const tonality = 1 - Math.min(1, f.spectralFlatness * 5) // flatness is 0-1, usually low
    const harmony = chromaHarmony(f.chroma)
    const v = tonality * 0.5 + harmony * 0.3 + (1 - normZcr) * 0.2

    return {
      energy: Math.max(0, Math.min(1, e)),
      valence: Math.max(0, Math.min(1, v)),
    }
  }

  async function start(audioContext: AudioContext, sourceNode: MediaElementAudioSourceNode) {
    if (isActive.value || !audioContext || !sourceNode) return

    try {
      // Dynamic import to avoid SSR issues
      if (!Meyda) {
        const mod = await import('meyda')
        Meyda = mod.default || mod
      }

      analyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source: sourceNode,
        bufferSize: 512,
        featureExtractors: [
          'rms',
          'spectralCentroid',
          'spectralFlatness',
          'zcr',
          'spectralRolloff',
          'mfcc',
          'chroma',
        ],
        callback: (extracted: any) => {
          if (!extracted || !isActive.value) return

          const raw: MeydaFeatures = {
            rms: extracted.rms ?? 0,
            spectralCentroid: extracted.spectralCentroid ?? 0,
            spectralFlatness: extracted.spectralFlatness ?? 0,
            zcr: extracted.zcr ?? 0,
            spectralRolloff: extracted.spectralRolloff ?? 0,
            mfcc: extracted.mfcc ?? [],
            chroma: extracted.chroma ?? [],
          }

          features.value = raw

          // Compute smoothed derived values
          const normCentroid = Math.min(1, raw.spectralCentroid / CENTROID_MAX)
          const normZcr = Math.min(1, raw.zcr / ZCR_MAX)
          brightness.value = smoothValue(brightness.value, normCentroid)
          percussiveness.value = smoothValue(percussiveness.value, normZcr)

          // Compute mood point
          const mood = computeMood(raw)
          energy.value = smoothValue(energy.value, mood.energy)
          valence.value = smoothValue(valence.value, mood.valence)
        },
      })

      analyzer.start()
      isActive.value = true
    } catch (err) {
      console.warn('[useMeydaAnalyzer] Failed to initialize Meyda:', err)
    }
  }

  function stop() {
    if (analyzer) {
      try {
        analyzer.stop()
      } catch { /* ignore */ }
      analyzer = null
    }
    isActive.value = false
    energy.value = 0
    valence.value = 0
    brightness.value = 0
    percussiveness.value = 0
    features.value = {
      rms: 0,
      spectralCentroid: 0,
      spectralFlatness: 0,
      zcr: 0,
      spectralRolloff: 0,
      mfcc: [],
      chroma: [],
    }
  }

  return {
    isActive,
    energy,
    valence,
    brightness,
    percussiveness,
    features,
    start,
    stop,
  }
}
