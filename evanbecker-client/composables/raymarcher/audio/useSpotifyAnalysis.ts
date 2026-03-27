import { useRayMarcherStore } from '~/stores/raymarcher'

/**
 * Maps Spotify's audio analysis and features data to the same store values
 * that the autoplayer reads, enabling Spotify-driven scene reactivity.
 */
export function useSpotifyAnalysis() {
  const store = useRayMarcherStore()

  /**
   * Binary search for the current item in a sorted array of time-stamped entries.
   */
  function findCurrent<T extends { start: number }>(items: T[], positionSec: number): T | null {
    if (!items?.length) return null
    let lo = 0
    let hi = items.length - 1
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (items[mid].start <= positionSec) lo = mid
      else hi = mid - 1
    }
    return items[lo]
  }

  /**
   * Update the store audio state from Spotify analysis at the current playback position.
   * Call this every frame while Spotify is the active audio source.
   */
  function syncToPlayback(analysis: any, features: any, positionMs: number) {
    if (!analysis) return

    const posSec = positionMs / 1000

    // --- Audio features (per-track, constant) ---
    if (features) {
      store.audio.moodEnergy = features.energy ?? 0.5
      store.audio.moodValence = features.valence ?? 0.5
    }

    // --- Current section (verse/chorus/bridge) ---
    const section = findCurrent(analysis.sections, posSec)
    if (section) {
      // Section loudness -> amplitude (normalize from dB, roughly -60 to 0)
      store.audio.amplitude = Math.max(0, Math.min(1, (section.loudness + 60) / 60))
      // Section tempo -> BPM
      store.audio.bpm = section.tempo || 0
    }

    // --- Current segment (~0.1s chunks) ---
    const segment = findCurrent(analysis.segments, posSec)
    if (segment) {
      // Segment loudness -> more granular amplitude
      const segLoud = Math.max(0, Math.min(1, (segment.loudness_max + 60) / 60))
      store.audio.amplitude = segLoud

      // Pitch vector (12 chroma) -> bass/mid/treble approximation
      const pitches: number[] = segment.pitches || []
      if (pitches.length >= 12) {
        // Low pitches (C, C#, D, D#) -> bass
        store.audio.bass = (pitches[0] + pitches[1] + pitches[2] + pitches[3]) / 4
        // Mid pitches (E, F, F#, G) -> mid
        store.audio.mid = (pitches[4] + pitches[5] + pitches[6] + pitches[7]) / 4
        // High pitches (G#, A, A#, B) -> treble
        store.audio.treble = (pitches[8] + pitches[9] + pitches[10] + pitches[11]) / 4
      }

      // Timbre vector -> brightness and percussiveness
      const timbre: number[] = segment.timbre || []
      if (timbre.length >= 4) {
        // timbre[0] = average loudness
        // timbre[1] = brightness (positive = bright)
        // timbre[2] = flatness
        // timbre[3] = attack strength (positive = sharp attack)
        store.audio.brightness = Math.max(0, Math.min(1, (timbre[1] + 100) / 200))
        store.audio.percussiveness = Math.max(0, Math.min(1, (timbre[3] + 100) / 200))
      }
    }

    // --- Beat detection ---
    // Find the nearest beat and check if we just crossed it
    const beats: Array<{ start: number }> = analysis.beats || []
    const nearestBeat = findCurrent(beats, posSec)
    if (nearestBeat) {
      const timeSinceBeat = posSec - nearestBeat.start
      // If we're within 50ms of a beat start, flag it
      store.audio.isOnBeat = timeSinceBeat < 0.05
    } else {
      store.audio.isOnBeat = false
    }
  }

  return { syncToPlayback }
}
