import { ref, onUnmounted } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

const YT_API_URL = 'https://www.youtube.com/iframe_api'

/** Extract a YouTube video ID from various URL formats */
export function extractVideoId(url: string): string | null {
  if (!url) return null
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  // youtube.com/watch?v=ID or youtube.com/embed/ID or youtube.com/v/ID
  const longMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/)
  if (longMatch) return longMatch[1]
  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch) return shortsMatch[1]
  // Bare ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim()
  return null
}

/** Load the YouTube IFrame API script (idempotent) */
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return }
    const existing = document.querySelector(`script[src="${YT_API_URL}"]`)
    if (existing) {
      // Script tag exists but API not ready yet — wait
      const check = setInterval(() => {
        if (window.YT?.Player) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = YT_API_URL
    document.head.appendChild(tag)
  })
}

export function useAudioCapture() {
  const store = useRayMarcherStore()
  const isCapturing = ref(false)
  const isPlayerReady = ref(false)
  const error = ref<string | null>(null)

  let player: any = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let rafId = 0
  let frequencyData: Uint8Array | null = null

  /** Create or replace the YouTube player in the given container */
  async function loadVideo(containerId: string, videoId: string) {
    error.value = null
    try {
      await loadYouTubeAPI()
    } catch (e) {
      error.value = 'Failed to load YouTube API'
      return
    }

    // Destroy existing player
    if (player) {
      try { player.destroy() } catch (_) { /* noop */ }
      player = null
      isPlayerReady.value = false
    }

    player = new window.YT.Player(containerId, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
      },
      events: {
        onReady: () => { isPlayerReady.value = true },
        onError: (e: any) => { error.value = `YouTube error: ${e.data}` },
      },
    })
  }

  /** Start capturing tab audio via getDisplayMedia */
  async function startCapture() {
    error.value = null

    if (isCapturing.value) return

    try {
      // Request tab audio capture — requires user gesture
      const constraints: any = { audio: true, video: false }
      try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints)
      } catch (_) {
        // Firefox fallback: must request video too, then discard it
        mediaStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
        // Stop video tracks to save resources
        mediaStream.getVideoTracks().forEach(t => t.stop())
      }

      // Check that we got audio tracks
      if (!mediaStream.getAudioTracks().length) {
        error.value = 'No audio track captured. Make sure to select "Share tab audio" in the dialog.'
        mediaStream.getTracks().forEach(t => t.stop())
        mediaStream = null
        return
      }

      // Set up Web Audio API
      audioContext = new AudioContext()
      sourceNode = audioContext.createMediaStreamSource(mediaStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      sourceNode.connect(analyser)
      // Don't connect to destination — we don't want to play audio through speakers twice

      frequencyData = new Uint8Array(analyser.frequencyBinCount)
      isCapturing.value = true
      store.audio.isCapturing = true

      // Listen for track end (user stops sharing)
      mediaStream.getAudioTracks()[0].addEventListener('ended', () => {
        stopCapture()
      })

      // Start FFT analysis loop
      analyzeFrame()
    } catch (e: any) {
      error.value = e?.message || 'Failed to capture audio'
      stopCapture()
    }
  }

  function analyzeFrame() {
    if (!isCapturing.value || !analyser || !frequencyData) return

    analyser.getByteFrequencyData(frequencyData)
    const binCount = frequencyData.length

    // Frequency bands (indices into FFT bins)
    const bassEnd = Math.floor(binCount * 0.10)
    const midEnd = Math.floor(binCount * 0.40)

    let bassSum = 0
    let midSum = 0
    let trebleSum = 0
    let totalSum = 0

    for (let i = 0; i < binCount; i++) {
      const val = frequencyData[i]
      totalSum += val
      if (i < bassEnd) bassSum += val
      else if (i < midEnd) midSum += val
      else trebleSum += val
    }

    // Normalize to 0-1
    const bassCount = bassEnd || 1
    const midCount = (midEnd - bassEnd) || 1
    const trebleCount = (binCount - midEnd) || 1

    store.audio.bass = (bassSum / bassCount) / 255
    store.audio.mid = (midSum / midCount) / 255
    store.audio.treble = (trebleSum / trebleCount) / 255
    store.audio.amplitude = (totalSum / binCount) / 255

    rafId = requestAnimationFrame(analyzeFrame)
  }

  function stopCapture() {
    cancelAnimationFrame(rafId)
    rafId = 0

    if (sourceNode) { try { sourceNode.disconnect() } catch (_) { /* noop */ } sourceNode = null }
    if (analyser) { try { analyser.disconnect() } catch (_) { /* noop */ } analyser = null }
    if (audioContext) { try { audioContext.close() } catch (_) { /* noop */ } audioContext = null }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
    frequencyData = null

    isCapturing.value = false
    store.audio.isCapturing = false
    store.audio.bass = 0
    store.audio.mid = 0
    store.audio.treble = 0
    store.audio.amplitude = 0
  }

  function destroyPlayer() {
    if (player) {
      try { player.destroy() } catch (_) { /* noop */ }
      player = null
      isPlayerReady.value = false
    }
  }

  function getPlayerState(): number {
    if (!player || !isPlayerReady.value) return -1
    try { return player.getPlayerState() } catch (_) { return -1 }
  }

  function togglePlayPause() {
    if (!player || !isPlayerReady.value) return
    try {
      const state = player.getPlayerState()
      if (state === 1) player.pauseVideo()
      else player.playVideo()
    } catch (_) { /* noop */ }
  }

  function getVideoTitle(): string {
    if (!player || !isPlayerReady.value) return ''
    try {
      const data = player.getVideoData?.()
      return data?.title || ''
    } catch (_) { return '' }
  }

  onUnmounted(() => {
    stopCapture()
    destroyPlayer()
  })

  return {
    startCapture,
    stopCapture,
    loadVideo,
    destroyPlayer,
    isCapturing,
    isPlayerReady,
    error,
    getPlayerState,
    togglePlayPause,
    getVideoTitle,
  }
}
