import { ref, onUnmounted } from 'vue'

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
  let rafId = 0
  let dataArray: Uint8Array | null = null

  function ensureContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    // Resume if suspended (browsers require user gesture)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  function createAnalyser() {
    const ctx = ensureContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
  }

  function analyze() {
    if (!analyser || !dataArray) return
    analyser.getByteFrequencyData(dataArray)

    const binCount = dataArray.length
    const bassEnd = Math.floor(binCount * 0.1)
    const midEnd = Math.floor(binCount * 0.4)

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
    cancelAnimationFrame(rafId)

    // Reset state immediately so UI updates
    const wasActive = isActive.value
    isActive.value = false
    source.value = 'none'
    fileName.value = ''
    bass.value = 0
    mid.value = 0
    treble.value = 0
    amplitude.value = 0

    // Then clean up audio nodes (can be slow)
    if (sourceNode) {
      try { sourceNode.disconnect() } catch { /* ok */ }
      sourceNode = null
    }
    const nodesToStop = [...generatorNodes]
    generatorNodes = []
    for (const node of nodesToStop) {
      try {
        if (node instanceof OscillatorNode) node.stop()
        node.disconnect()
      } catch { /* already stopped */ }
    }
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      audioElement = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }
    if (analyser) {
      try { analyser.disconnect() } catch { /* ok */ }
      analyser = null
    }

    // Keep audioCtx alive — browsers block new contexts created outside user gestures.
    // Only fullStop() (on unmount) closes it.
    }
  }

  // Scene-reactive tone presets for the generative drone
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
    0: { droneFreq: 55, detune: 0.5, chord: [220, 277.18, 329.63], shimmerFreq: 880, filterCutoff: 800, lfoSpeed: 0.08, waveType: 'triangle' }, // Lattice — warm A minor
    1: { droneFreq: 41.2, detune: 0.3, chord: [164.81, 207.65, 246.94], shimmerFreq: 659, filterCutoff: 600, lfoSpeed: 0.05, waveType: 'sine' }, // Mandelbulb — deep E minor, darker
    2: { droneFreq: 65.41, detune: 0.8, chord: [261.63, 329.63, 392.0], shimmerFreq: 1046, filterCutoff: 1000, lfoSpeed: 0.12, waveType: 'triangle' }, // CSG — bright C major
    3: { droneFreq: 49, detune: 0.4, chord: [196, 233.08, 293.66], shimmerFreq: 783, filterCutoff: 500, lfoSpeed: 0.04, waveType: 'sine' }, // Fractal — eerie G minor, slow
  }

  function startDefault(sceneIndex = 0) {
    stopCurrent()
    const ctx = ensureContext()
    createAnalyser()
    if (!analyser) return

    const vibe = sceneVibes[sceneIndex] || sceneVibes[0]

    // Procedural ambient drone — tones driven by scene
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.15
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

    // Gain levels per layer
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.6
    const padGain = ctx.createGain()
    padGain.gain.value = 0.2
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.08

    // Low-pass filter — cutoff from scene config
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = vibe.filterCutoff
    filter.Q.value = 0.7

    // Animate filter with LFO — speed from scene config
    const filterLfo = ctx.createOscillator()
    filterLfo.type = 'sine'
    filterLfo.frequency.value = vibe.lfoSpeed
    const filterLfoGain = ctx.createGain()
    filterLfoGain.gain.value = 400
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
    audioElement.volume = 0.5
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
      // Don't connect analyser to destination — avoids feedback
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
    bass,
    mid,
    treble,
    amplitude,
    source,
    isActive,
    fileName,
    startDefault,
    startTrack,
    startMic,
    startFile,
    stop: stopCurrent,
  }
}
