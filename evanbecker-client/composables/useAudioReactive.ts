import { ref, onUnmounted } from 'vue'
import { AUDIO, NOTES } from '~/utils/shaders/constants'

export type AudioSource = 'none' | 'generated' | 'track' | 'mic' | 'file'

export const AUDIO_SOURCE_NAMES: Record<AudioSource, string> = {
  none: 'Off',
  generated: 'Ambient Drone',
  track: 'Chill Loop',
  mic: 'Microphone',
  file: 'Upload File',
}

export const AUDIO_TRACKS = [
  { id: 'chill-ambient-loop', name: 'Chill Ambient Loop', path: '/audio/chill-ambient-loop.mp3' },
]

// === Chord Progressions ===

interface ChordStep {
  drone: number
  chord: [number, number, number]
  shimmer: number
  filterCutoff: number
}

const PROGRESSIONS: Record<number, ChordStep[]> = {
  0: [ // Scene 0: Am → F → C → G
    { drone: NOTES.A1, chord: [NOTES.A3, NOTES.Cs4, NOTES.E4], shimmer: NOTES.A5, filterCutoff: 800 },
    { drone: NOTES.F1, chord: [NOTES.F3, NOTES.A3, NOTES.C4], shimmer: NOTES.F5, filterCutoff: 1000 },
    { drone: NOTES.C2, chord: [NOTES.C4, NOTES.E4, NOTES.G4], shimmer: NOTES.C6, filterCutoff: 1200 },
    { drone: NOTES.G1, chord: [NOTES.G3, NOTES.B3, NOTES.D4], shimmer: NOTES.G5, filterCutoff: 600 },
  ],
  1: [ // Scene 1: Em → Bm → Am → Dm
    { drone: NOTES.E1, chord: [NOTES.E3, NOTES.Gs3, NOTES.B3], shimmer: NOTES.E5, filterCutoff: 600 },
    { drone: NOTES.B1, chord: [NOTES.B3, NOTES.D4, NOTES.F4], shimmer: NOTES.E5, filterCutoff: 500 },
    { drone: NOTES.A1, chord: [NOTES.A3, NOTES.C4, NOTES.E4], shimmer: NOTES.A5, filterCutoff: 700 },
    { drone: NOTES.D2, chord: [NOTES.D3, NOTES.F3, NOTES.A3], shimmer: NOTES.F5, filterCutoff: 550 },
  ],
  2: [ // Scene 2: C → Am → F → G
    { drone: NOTES.C2, chord: [NOTES.C4, NOTES.E4, NOTES.G4], shimmer: NOTES.C6, filterCutoff: 1000 },
    { drone: NOTES.A1, chord: [NOTES.A3, NOTES.C4, NOTES.E4], shimmer: NOTES.A5, filterCutoff: 900 },
    { drone: NOTES.F1, chord: [NOTES.F3, NOTES.A3, NOTES.C4], shimmer: NOTES.F5, filterCutoff: 1200 },
    { drone: NOTES.G1, chord: [NOTES.G3, NOTES.B3, NOTES.D4], shimmer: NOTES.G5, filterCutoff: 1100 },
  ],
  3: [ // Scene 3: Gm → Eb → Bb → F
    { drone: NOTES.G1, chord: [NOTES.G3, NOTES.Bb3, NOTES.D4], shimmer: NOTES.G5, filterCutoff: 500 },
    { drone: NOTES.Eb3, chord: [NOTES.Eb3, NOTES.G3, NOTES.Bb3], shimmer: NOTES.G5, filterCutoff: 450 },
    { drone: NOTES.Bb1, chord: [NOTES.Bb3, NOTES.D4, NOTES.F4], shimmer: NOTES.F5, filterCutoff: 550 },
    { drone: NOTES.F1, chord: [NOTES.F3, NOTES.A3, NOTES.C4], shimmer: NOTES.F5, filterCutoff: 600 },
  ],
}

const CHORD_INTERVAL_MS = 8000
const GLIDE_SECONDS = 2.0

// === Drone config per scene ===

interface DroneConfig {
  droneFreq: number
  detune: number
  chord: [number, number, number]
  shimmerFreq: number
  filterCutoff: number
  lfoSpeed: number
  waveType: OscillatorType
}

const sceneVibes: Record<number, DroneConfig> = {
  0: { droneFreq: NOTES.A1, detune: 0.5, chord: [NOTES.A3, NOTES.Cs4, NOTES.E4], shimmerFreq: NOTES.A5, filterCutoff: 800, lfoSpeed: 0.08, waveType: 'triangle' },
  1: { droneFreq: NOTES.E1, detune: 0.3, chord: [NOTES.E3, NOTES.Gs3, NOTES.B3], shimmerFreq: NOTES.E5, filterCutoff: 600, lfoSpeed: 0.05, waveType: 'sine' },
  2: { droneFreq: NOTES.C2, detune: 0.8, chord: [NOTES.C4, NOTES.E4, NOTES.G4], shimmerFreq: NOTES.C6, filterCutoff: 1000, lfoSpeed: 0.12, waveType: 'triangle' },
  3: { droneFreq: NOTES.G1, detune: 0.4, chord: [NOTES.G3, NOTES.Bb3, NOTES.D4], shimmerFreq: NOTES.G5, filterCutoff: 500, lfoSpeed: 0.04, waveType: 'sine' },
}

// === Composable ===

export function useAudioReactive() {
  const bass = ref(0)
  const mid = ref(0)
  const treble = ref(0)
  const amplitude = ref(0)
  const source = ref<AudioSource>('none')
  const isActive = ref(false)
  const fileName = ref('')

  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let sourceNode: AudioNode | null = null
  let audioElement: HTMLAudioElement | null = null
  let mediaStream: MediaStream | null = null
  let generatorNodes: AudioNode[] = []
  let chordTimerId: ReturnType<typeof setInterval> | null = null
  let rafId = 0
  let dataArray: Uint8Array | null = null

  function ensureContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  function createAnalyser() {
    const ctx = ensureContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = AUDIO.FFT_SIZE
    analyser.smoothingTimeConstant = AUDIO.SMOOTHING
    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
  }

  function analyze() {
    if (!analyser || !dataArray) return
    analyser.getByteFrequencyData(dataArray)

    const binCount = dataArray.length
    const bassEnd = Math.floor(binCount * AUDIO.BASS_END_RATIO)
    const midEnd = Math.floor(binCount * AUDIO.MID_END_RATIO)

    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0
    for (let i = 0; i < binCount; i++) {
      const val = dataArray[i] / 255.0
      totalSum += val
      if (i < bassEnd) bassSum += val
      else if (i < midEnd) midSum += val
      else trebleSum += val
    }

    bass.value = bassEnd > 0 ? bassSum / bassEnd : 0
    mid.value = (midEnd - bassEnd) > 0 ? midSum / (midEnd - bassEnd) : 0
    treble.value = (binCount - midEnd) > 0 ? trebleSum / (binCount - midEnd) : 0
    amplitude.value = totalSum / binCount

    rafId = requestAnimationFrame(analyze)
  }

  function stopCurrent() {
    // 1. Stop analysis loop
    cancelAnimationFrame(rafId)
    rafId = 0

    // 2. Clear chord progression timer
    if (chordTimerId !== null) {
      clearInterval(chordTimerId)
      chordTimerId = null
    }

    // 3. Reset reactive state immediately
    isActive.value = false
    source.value = 'none'
    fileName.value = ''
    bass.value = 0
    mid.value = 0
    treble.value = 0
    amplitude.value = 0

    // 4. Disconnect source node
    if (sourceNode) {
      try { sourceNode.disconnect() } catch { /* ok */ }
      sourceNode = null
    }

    // 5. Stop and disconnect all generator nodes
    const nodesToStop = [...generatorNodes]
    generatorNodes = []
    for (const node of nodesToStop) {
      try {
        if (node instanceof OscillatorNode) node.stop()
        node.disconnect()
      } catch { /* already stopped */ }
    }

    // 6. Clean up HTML audio element
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      audioElement = null
    }

    // 7. Stop media stream tracks (mic)
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }

    // 8. Disconnect analyser
    if (analyser) {
      try { analyser.disconnect() } catch { /* ok */ }
      analyser = null
    }
    dataArray = null

    // Keep audioCtx alive — browsers block new contexts outside user gestures
  }

  // === Chord Progression Engine ===

  interface DroneOscillators {
    drone1: OscillatorNode
    drone2: OscillatorNode
    pad1: OscillatorNode
    pad2: OscillatorNode
    pad3: OscillatorNode
    shimmer: OscillatorNode
    filter: BiquadFilterNode
    detune: number
  }

  function startChordProgression(oscs: DroneOscillators, sceneIndex: number) {
    const progression = PROGRESSIONS[sceneIndex] || PROGRESSIONS[0]
    let stepIndex = 0

    chordTimerId = setInterval(() => {
      if (!audioCtx) return
      stepIndex = (stepIndex + 1) % progression.length
      const step = progression[stepIndex]
      const now = audioCtx.currentTime

      // Glide oscillator frequencies to next chord
      oscs.drone1.frequency.linearRampToValueAtTime(step.drone, now + GLIDE_SECONDS)
      oscs.drone2.frequency.linearRampToValueAtTime(step.drone + oscs.detune, now + GLIDE_SECONDS)
      oscs.pad1.frequency.linearRampToValueAtTime(step.chord[0], now + GLIDE_SECONDS)
      oscs.pad2.frequency.linearRampToValueAtTime(step.chord[1], now + GLIDE_SECONDS)
      oscs.pad3.frequency.linearRampToValueAtTime(step.chord[2], now + GLIDE_SECONDS)
      oscs.shimmer.frequency.linearRampToValueAtTime(step.shimmer, now + GLIDE_SECONDS)
      oscs.filter.frequency.linearRampToValueAtTime(step.filterCutoff, now + GLIDE_SECONDS)
    }, CHORD_INTERVAL_MS)
  }

  // === Source Starters ===

  function startDefault(sceneIndex = 0) {
    stopCurrent()
    const ctx = ensureContext()
    createAnalyser()
    if (!analyser) return

    const vibe = sceneVibes[sceneIndex] || sceneVibes[0]

    const masterGain = ctx.createGain()
    masterGain.gain.value = AUDIO.MASTER_VOLUME
    generatorNodes.push(masterGain)

    // Low drone — two detuned sines
    const drone1 = ctx.createOscillator()
    drone1.type = 'sine'
    drone1.frequency.value = vibe.droneFreq
    const drone2 = ctx.createOscillator()
    drone2.type = 'sine'
    drone2.frequency.value = vibe.droneFreq + vibe.detune

    // Mid pad — chord from scene config
    const pad1 = ctx.createOscillator()
    pad1.type = vibe.waveType
    pad1.frequency.value = vibe.chord[0]
    const pad2 = ctx.createOscillator()
    pad2.type = vibe.waveType
    pad2.frequency.value = vibe.chord[1]
    const pad3 = ctx.createOscillator()
    pad3.type = vibe.waveType
    pad3.frequency.value = vibe.chord[2]

    // High shimmer with LFO
    const shimmer = ctx.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.value = vibe.shimmerFreq
    const shimmerLfo = ctx.createOscillator()
    shimmerLfo.type = 'sine'
    shimmerLfo.frequency.value = 0.3
    const shimmerLfoGain = ctx.createGain()
    shimmerLfoGain.gain.value = 15
    shimmerLfo.connect(shimmerLfoGain)
    shimmerLfoGain.connect(shimmer.frequency)

    // Gain levels — boosted for more FFT variation
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.6
    const padGain = ctx.createGain()
    padGain.gain.value = 0.35 // boosted from 0.2
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.12 // boosted from 0.08

    // Low-pass filter with wider LFO sweep
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = vibe.filterCutoff
    filter.Q.value = 0.7

    const filterLfo = ctx.createOscillator()
    filterLfo.type = 'sine'
    filterLfo.frequency.value = vibe.lfoSpeed
    const filterLfoGain = ctx.createGain()
    filterLfoGain.gain.value = 800 // boosted from 400
    filterLfo.connect(filterLfoGain)
    filterLfoGain.connect(filter.frequency)

    // Connect: oscillators → gains → filter → analyser → master → destination
    drone1.connect(droneGain)
    drone2.connect(droneGain)
    pad1.connect(padGain)
    pad2.connect(padGain)
    pad3.connect(padGain)
    shimmer.connect(shimmerGain)

    droneGain.connect(filter)
    padGain.connect(filter)
    shimmerGain.connect(filter)
    filter.connect(analyser)
    analyser.connect(masterGain)
    masterGain.connect(ctx.destination)

    // Start all oscillators
    const oscs = [drone1, drone2, pad1, pad2, pad3, shimmer, shimmerLfo, filterLfo]
    oscs.forEach(o => o.start())
    generatorNodes.push(...oscs, droneGain, padGain, shimmerGain, filter, shimmerLfoGain, filterLfoGain)

    // Start chord progression
    startChordProgression(
      { drone1, drone2, pad1, pad2, pad3, shimmer, filter, detune: vibe.detune },
      sceneIndex,
    )

    source.value = 'generated'
    isActive.value = true
    fileName.value = 'Ambient Drone'
    rafId = requestAnimationFrame(analyze)
  }

  async function startTrack(path: string, name: string) {
    stopCurrent()
    const ctx = ensureContext()
    createAnalyser()
    if (!analyser) return

    audioElement = new Audio(path)
    audioElement.loop = true
    audioElement.volume = AUDIO.TRACK_VOLUME
    audioElement.crossOrigin = 'anonymous'
    sourceNode = ctx.createMediaElementSource(audioElement)
    sourceNode.connect(analyser)
    analyser.connect(ctx.destination)

    try {
      await audioElement.play()
      source.value = 'track'
      isActive.value = true
      fileName.value = name
      rafId = requestAnimationFrame(analyze)
    } catch {
      stopCurrent()
    }
  }

  async function startMic() {
    stopCurrent()
    const ctx = ensureContext()
    createAnalyser()
    if (!analyser) return

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      sourceNode = ctx.createMediaStreamSource(mediaStream)
      sourceNode.connect(analyser)
      source.value = 'mic'
      isActive.value = true
      fileName.value = 'Microphone'
      rafId = requestAnimationFrame(analyze)
    } catch {
      stopCurrent()
    }
  }

  async function startFile(file: File) {
    stopCurrent()
    const ctx = ensureContext()
    createAnalyser()
    if (!analyser) return

    const url = URL.createObjectURL(file)
    audioElement = new Audio(url)
    audioElement.loop = true
    audioElement.crossOrigin = 'anonymous'
    sourceNode = ctx.createMediaElementSource(audioElement)
    sourceNode.connect(analyser)
    analyser.connect(ctx.destination)

    try {
      await audioElement.play()
      source.value = 'file'
      isActive.value = true
      fileName.value = file.name
      rafId = requestAnimationFrame(analyze)
    } catch {
      URL.revokeObjectURL(url)
      stopCurrent()
    }
  }

  function fullStop() {
    stopCurrent()
    if (audioCtx) {
      audioCtx.close()
      audioCtx = null
    }
  }

  onUnmounted(fullStop)

  return {
    bass, mid, treble, amplitude,
    source, isActive, fileName,
    startDefault, startTrack, startMic, startFile,
    stop: stopCurrent,
  }
}
