import { ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'

export function useSpotifyPlayer() {
  const config = useRuntimeConfig()
  const store = useRayMarcherStore()
  const apiBase = config.public.apiUrl.replace(/\/$/, '')

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
  let tokenExpiry = 0
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let sdkPlayer: any = null

  // --- Auth helper ---

  async function getAuth0Token(): Promise<string | null> {
    try {
      if (!import.meta.client) return null
      const { useAuth0 } = await import('@auth0/auth0-vue')
      const auth0 = useAuth0()
      if (!auth0.isAuthenticated.value) return null
      return await auth0.getAccessTokenSilently()
    } catch {
      return null
    }
  }

  async function authFetch(path: string, options: RequestInit = {}) {
    const token = await getAuth0Token()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`${apiBase}/api/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string> || {}),
      },
      mode: 'cors',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `API error: ${res.status}`)
    }
    return res.json()
  }

  // --- Connect: redirect to account page ---

  function connect() {
    navigateTo('/account')
  }

  // --- Restore session from API (replaces sessionStorage) ---

  async function restoreSession(): Promise<boolean> {
    try {
      const auth0Token = await getAuth0Token()
      if (!auth0Token) return false

      const status = await authFetch('spotify/me')
      if (!status.connected || !status.tokenValid) return false

      // Fetch a fresh access token
      const tokenData = await authFetch('spotify/token')
      accessToken = tokenData.accessToken
      tokenExpiry = Date.now() + tokenData.expiresIn * 1000
      isPremium.value = tokenData.premium
      displayName.value = status.displayName || ''
      isConnected.value = true

      store.audio.spotifyConnected = true
      store.audio.spotifyPremium = isPremium.value

      if (isPremium.value) {
        await initWebPlaybackSDK()
      } else {
        startPolling()
      }
      return true
    } catch (e) {
      console.warn('[Spotify] Failed to restore session from API:', e)
      return false
    }
  }

  async function refreshAccessToken() {
    try {
      const tokenData = await authFetch('spotify/token')
      accessToken = tokenData.accessToken
      tokenExpiry = Date.now() + tokenData.expiresIn * 1000
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
        `${apiBase}/api/v1/spotify/now-playing`,
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
        $fetch(`${apiBase}/api/v1/spotify/analysis/${trackId}`, {
          headers: { 'X-Spotify-Token': accessToken },
        }),
        $fetch(`${apiBase}/api/v1/spotify/features/${trackId}`, {
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
    accessToken = ''
    isConnected.value = false
    isPremium.value = false
    currentTrack.value = null
    analysis.value = null
    features.value = null
    lastAnalyzedTrackId = ''
    store.audio.spotifyConnected = false
    store.audio.spotifyPremium = false
    store.audio.spotifyTrackId = ''

    // Also disconnect on the server side
    authFetch('spotify/disconnect', { method: 'POST' }).catch(() => {})
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
    restoreSession,
    disconnect,
  }
}
