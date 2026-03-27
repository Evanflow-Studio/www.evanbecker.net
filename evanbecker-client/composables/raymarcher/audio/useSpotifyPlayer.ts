import { ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'

export function useSpotifyPlayer() {
  const config = useRuntimeConfig()
  const store = useRayMarcherStore()

  const isConnected = ref(false)
  const isPremium = ref(false)
  const displayName = ref('')
  const currentTrack = ref<{
    id: string
    name: string
    artist: string
    albumArt: string
    durationMs: number
  } | null>(null)
  const playbackPosition = ref(0)
  const isPlaying = ref(false)
  const error = ref<string | null>(null)

  let accessToken = ''
  let refreshToken = ''
  let tokenExpiry = 0
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let sdkPlayer: any = null

  // --- OAuth flow ---

  async function connect() {
    const redirectUrl = window.location.href.split('?')[0]
    const data = await $fetch<{ url: string }>(
      `${config.public.apiUrl}api/v1/spotify/auth-url`,
      { query: { redirectUrl: encodeURIComponent(redirectUrl) } },
    )
    window.location.href = data.url
  }

  async function handleCallback(code: string) {
    try {
      const result = await $fetch<{
        accessToken: string
        refreshToken: string
        expiresIn: number
        isPremium: boolean
        displayName: string
      }>(`${config.public.apiUrl}api/v1/spotify/callback`, {
        method: 'POST',
        body: { code },
      })

      accessToken = result.accessToken
      refreshToken = result.refreshToken
      tokenExpiry = Date.now() + result.expiresIn * 1000
      isPremium.value = result.isPremium
      displayName.value = result.displayName || ''
      isConnected.value = true

      sessionStorage.setItem('spotify_access', accessToken)
      sessionStorage.setItem('spotify_refresh', refreshToken)
      sessionStorage.setItem('spotify_expiry', String(tokenExpiry))
      sessionStorage.setItem('spotify_premium', String(result.isPremium))
      sessionStorage.setItem('spotify_name', displayName.value)

      store.audio.spotifyConnected = true
      store.audio.spotifyPremium = isPremium.value

      if (isPremium.value) {
        await initWebPlaybackSDK()
      } else {
        startPolling()
      }
    } catch (e: any) {
      error.value = e?.data?.message || 'Failed to complete Spotify login'
    }
  }

  function restoreSession(): boolean {
    const stored = sessionStorage.getItem('spotify_access')
    if (!stored) return false

    accessToken = stored
    refreshToken = sessionStorage.getItem('spotify_refresh') || ''
    tokenExpiry = parseInt(sessionStorage.getItem('spotify_expiry') || '0')
    isPremium.value = sessionStorage.getItem('spotify_premium') === 'true'
    displayName.value = sessionStorage.getItem('spotify_name') || ''

    if (Date.now() > tokenExpiry) {
      refreshAccessToken()
      return false
    }

    isConnected.value = true
    store.audio.spotifyConnected = true
    store.audio.spotifyPremium = isPremium.value

    if (isPremium.value) {
      initWebPlaybackSDK()
    } else {
      startPolling()
    }
    return true
  }

  async function refreshAccessToken() {
    if (!refreshToken) return
    try {
      const result = await $fetch<{
        accessToken: string
        refreshToken?: string
        expiresIn: number
      }>(`${config.public.apiUrl}api/v1/spotify/refresh`, {
        method: 'POST',
        body: { refreshToken },
      })
      accessToken = result.accessToken
      if (result.refreshToken) refreshToken = result.refreshToken
      tokenExpiry = Date.now() + result.expiresIn * 1000
      sessionStorage.setItem('spotify_access', accessToken)
      sessionStorage.setItem('spotify_refresh', refreshToken)
      sessionStorage.setItem('spotify_expiry', String(tokenExpiry))
    } catch {
      error.value = 'Failed to refresh Spotify token'
      disconnect()
    }
  }

  async function ensureValidToken() {
    if (Date.now() > tokenExpiry - 60_000) {
      await refreshAccessToken()
    }
  }

  // --- Web Playback SDK (Premium only) ---

  async function initWebPlaybackSDK() {
    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement('script')
      script.id = 'spotify-sdk'
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      document.head.appendChild(script)
    }

    await new Promise<void>((resolve) => {
      if (window.Spotify) {
        resolve()
        return
      }
      window.onSpotifyWebPlaybackSDKReady = () => resolve()
    })

    sdkPlayer = new window.Spotify.Player({
      name: 'evanbecker.net Ray Marcher',
      getOAuthToken: async (cb: (token: string) => void) => {
        await ensureValidToken()
        cb(accessToken)
      },
      volume: 0.5,
    })

    sdkPlayer.addListener('player_state_changed', (state: any) => {
      if (!state) return
      isPlaying.value = !state.paused
      playbackPosition.value = state.position
      const track = state.track_window?.current_track
      if (track) {
        const newTrackId = track.id
        currentTrack.value = {
          id: newTrackId,
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          albumArt: track.album.images[0]?.url || '',
          durationMs: track.duration_ms,
        }
        if (newTrackId !== lastAnalyzedTrackId) {
          fetchAnalysis(newTrackId)
        }
      }
    })

    sdkPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('[Spotify] Web Playback SDK ready, device:', device_id)
      transferPlayback(device_id)
    })

    await sdkPlayer.connect()
  }

  async function transferPlayback(deviceId: string) {
    await ensureValidToken()
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: true }),
    })
  }

  // --- Polling (Free accounts) ---

  function startPolling() {
    if (pollInterval) return
    pollNowPlaying()
    pollInterval = setInterval(pollNowPlaying, 3000)
  }

  let lastAnalyzedTrackId = ''

  async function pollNowPlaying() {
    await ensureValidToken()
    try {
      const result = await $fetch<any>(
        `${config.public.apiUrl}api/v1/spotify/now-playing`,
        { headers: { 'X-Spotify-Token': accessToken } },
      )
      if (result && result.item) {
        isPlaying.value = result.is_playing
        playbackPosition.value = result.progress_ms || 0
        const track = result.item
        currentTrack.value = {
          id: track.id,
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || '',
          albumArt: track.album?.images?.[0]?.url || '',
          durationMs: track.duration_ms || 0,
        }
        if (track.id !== lastAnalyzedTrackId) {
          fetchAnalysis(track.id)
        }
      }
    } catch {
      // Silently fail -- user might have paused or no active device
    }
  }

  // --- Analysis fetching ---

  const analysis = ref<any>(null)
  const features = ref<any>(null)

  async function fetchAnalysis(trackId: string) {
    await ensureValidToken()
    lastAnalyzedTrackId = trackId
    store.audio.spotifyTrackId = trackId
    try {
      const [analysisData, featuresData] = await Promise.all([
        $fetch(`${config.public.apiUrl}api/v1/spotify/analysis/${trackId}`, {
          headers: { 'X-Spotify-Token': accessToken },
        }),
        $fetch(`${config.public.apiUrl}api/v1/spotify/features/${trackId}`, {
          headers: { 'X-Spotify-Token': accessToken },
        }),
      ])
      analysis.value = analysisData
      features.value = featuresData
    } catch (e) {
      console.warn('[Spotify] Failed to fetch analysis:', e)
    }
  }

  function disconnect() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (sdkPlayer) {
      sdkPlayer.disconnect()
      sdkPlayer = null
    }
    sessionStorage.removeItem('spotify_access')
    sessionStorage.removeItem('spotify_refresh')
    sessionStorage.removeItem('spotify_expiry')
    sessionStorage.removeItem('spotify_premium')
    sessionStorage.removeItem('spotify_name')
    accessToken = ''
    refreshToken = ''
    isConnected.value = false
    isPremium.value = false
    currentTrack.value = null
    analysis.value = null
    features.value = null
    lastAnalyzedTrackId = ''
    store.audio.spotifyConnected = false
    store.audio.spotifyPremium = false
    store.audio.spotifyTrackId = ''
  }

  return {
    isConnected,
    isPremium,
    displayName,
    currentTrack,
    playbackPosition,
    isPlaying,
    error,
    analysis,
    features,
    connect,
    handleCallback,
    restoreSession,
    disconnect,
  }
}
