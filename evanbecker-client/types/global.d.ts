interface Window {
  grecaptcha?: {
    ready(cb: () => void): void
    execute(siteKey: string, options: { action: string }): Promise<string>
  }
}

// YouTube IFrame API types
declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    height?: string | number
    width?: string | number
    videoId?: string
    playerVars?: Record<string, any>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
      onError?: (event: OnErrorEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    data: PlayerState
    target: Player
  }

  interface OnErrorEvent {
    data: number
    target: Player
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    loadVideoById(videoId: string): void
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    setVolume(volume: number): void
    getVolume(): number
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): PlayerState
    destroy(): void
  }
}
