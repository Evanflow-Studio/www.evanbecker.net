import { ref, onBeforeUnmount } from 'vue'

export interface YouTubeTrack {
  videoId: string
  title: string
  channel: string
  thumbnail: string
  duration?: string
}

let apiLoaded = false
let apiLoading = false
const apiReadyCallbacks: (() => void)[] = []

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  if (apiLoading) return new Promise(resolve => apiReadyCallbacks.push(resolve))

  apiLoading = true
  return new Promise(resolve => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)

    ;(window as any).onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      apiLoading = false
      resolve()
      apiReadyCallbacks.forEach(cb => cb())
      apiReadyCallbacks.length = 0
    }
  })
}

export function useYouTubePlayer() {
  let player: YT.Player | null = null
  let timeInterval: ReturnType<typeof setInterval> | null = null

  const isReady = ref(false)
  const isPlaying = ref(false)
  const isBuffering = ref(false)
  const currentVideoId = ref('')
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(80)
  const error = ref('')

  // Callbacks for external integration (queue auto-advance)
  let onVideoEnd: (() => void) | null = null

  function setOnVideoEnd(cb: () => void) {
    onVideoEnd = cb
  }

  async function init(containerId: string) {
    await loadYouTubeAPI()

    player = new YT.Player(containerId, {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => {
          isReady.value = true
          player?.setVolume(volume.value)
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          switch (event.data) {
            case YT.PlayerState.PLAYING:
              isPlaying.value = true
              isBuffering.value = false
              startTimeTracking()
              break
            case YT.PlayerState.PAUSED:
              isPlaying.value = false
              break
            case YT.PlayerState.BUFFERING:
              isBuffering.value = true
              break
            case YT.PlayerState.ENDED:
              isPlaying.value = false
              stopTimeTracking()
              onVideoEnd?.()
              break
            case YT.PlayerState.UNSTARTED:
              isPlaying.value = false
              break
          }
        },
        onError: (event: YT.OnErrorEvent) => {
          error.value = `YouTube player error: ${event.data}`
          console.error('YouTube player error:', event.data)
        },
      },
    })
  }

  function startTimeTracking() {
    stopTimeTracking()
    timeInterval = setInterval(() => {
      if (player && isPlaying.value) {
        currentTime.value = player.getCurrentTime() ?? 0
        duration.value = player.getDuration() ?? 0
      }
    }, 250)
  }

  function stopTimeTracking() {
    if (timeInterval) {
      clearInterval(timeInterval)
      timeInterval = null
    }
  }

  function loadVideo(videoId: string) {
    error.value = ''
    currentVideoId.value = videoId
    if (player && isReady.value) {
      player.loadVideoById(videoId)
    }
  }

  /** Load without auto-playing — use when waiting for ready-up */
  function cueVideo(videoId: string) {
    error.value = ''
    currentVideoId.value = videoId
    if (player && isReady.value) {
      player.cueVideoById(videoId)
    }
  }

  function play() {
    player?.playVideo()
  }

  function pause() {
    player?.pauseVideo()
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  function seekTo(seconds: number) {
    player?.seekTo(seconds, true)
    currentTime.value = seconds
  }

  function setVolume(vol: number) {
    volume.value = Math.max(0, Math.min(100, vol))
    player?.setVolume(volume.value)
  }

  function destroy() {
    stopTimeTracking()
    player?.destroy()
    player = null
    isReady.value = false
  }

  onBeforeUnmount(destroy)

  return {
    // State
    isReady,
    isPlaying,
    isBuffering,
    currentVideoId,
    currentTime,
    duration,
    volume,
    error,
    // Methods
    init,
    loadVideo,
    cueVideo,
    play,
    pause,
    togglePlay,
    seekTo,
    setVolume,
    setOnVideoEnd,
    destroy,
  }
}
