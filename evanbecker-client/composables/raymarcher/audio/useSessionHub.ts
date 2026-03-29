import { ref, computed, onUnmounted } from 'vue'
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { useAuth0 } from '@auth0/auth0-vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import type { YouTubeTrack } from './useYouTubePlayer'

// ── Types ────────────────────────────────────────────────────

export interface SessionMember {
  userId: string
  firstName: string
  lastName: string | null
  avatar: string | null
  isHost: boolean
  isReady: boolean
  isVisualizerConnected: boolean
}

export interface PlaybackState {
  videoId: string | null
  title: string | null
  channel: string | null
  thumbnail: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  /** Unix ms when the host sent this state — used for time-delta sync */
  sentAt: number
}

export interface QueueState {
  tracks: Array<{ videoId: string; title: string; channel: string; thumbnail: string }>
  currentIndex: number
}

export interface ChatMessage {
  senderName: string
  senderAvatar: string | null
  content: string
  timestamp: number
}

interface SessionState {
  roomCode: string
  host: SessionMember
  members: SessionMember[]
  playback: PlaybackState | null
  queue: QueueState | null
}

// ── Composable ───────────────────────────────────────────────

// Module-level state so it's shared across components
let connection: HubConnection | null = null
let heartbeatInterval: ReturnType<typeof setInterval> | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null

const isConnected = ref(false)
const myUserId = ref('')  // Our user ID from the session — used to derive isHost
const hostUserId = ref('') // The host's user ID — set from session state
const roomCode = ref('')
const hostName = ref('')
const members = ref<SessionMember[]>([])
const chatMessages = ref<ChatMessage[]>([])
const error = ref('')
const hostDisconnectedCountdown = ref(0)
const syncedPlayback = ref<PlaybackState | null>(null)
const syncedQueue = ref<QueueState | null>(null)

// Derive isHost from actual IDs — never a separately tracked flag
const isHost = computed(() => !!myUserId.value && myUserId.value === hostUserId.value)

const MAX_CHAT_MESSAGES = 200

export function useSessionHub() {
  const config = useRuntimeConfig()
  const baseUrl = (config.public.apiUrl as string)?.replace(/\/$/, '') || ''

  let getTokenFn: (() => Promise<string>) | null = null
  if (import.meta.client) {
    const { getAccessTokenSilently } = useAuth0()
    getTokenFn = getAccessTokenSilently
  }

  // ── Connection ───────────────────────────────────────────

  async function connect(): Promise<HubConnection> {
    if (connection?.state === 'Connected') return connection

    if (!getTokenFn) throw new Error('Auth not available')

    connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/session`, {
        accessTokenFactory: () => getTokenFn!(),
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    // ── Event listeners ──────────────────────────────────

    connection.on('PlaybackSync', (state: PlaybackState) => {
      if (!isHost.value) syncedPlayback.value = state
    })

    connection.on('QueueSync', (queue: QueueState) => {
      if (!isHost.value) syncedQueue.value = queue
    })

    connection.on('MemberJoined', (member: SessionMember) => {
      if (!members.value.find(m => m.userId === member.userId)) {
        members.value = [...members.value, member]
      }
    })

    connection.on('MemberLeft', (userId: string) => {
      members.value = members.value.filter(m => m.userId !== userId)
    })

    connection.on('MemberReady', (userId: string, ready: boolean) => {
      members.value = members.value.map(m =>
        m.userId === userId ? { ...m, isReady: ready } : m
      )
    })

    connection.on('MemberVisualizerConnected', (userId: string, connected: boolean) => {
      members.value = members.value.map(m =>
        m.userId === userId ? { ...m, isVisualizerConnected: connected } : m
      )
    })

    connection.on('HostDisconnected', () => {
      hostDisconnectedCountdown.value = 60
      countdownInterval = setInterval(() => {
        hostDisconnectedCountdown.value--
        if (hostDisconnectedCountdown.value <= 0) {
          clearInterval(countdownInterval!)
          countdownInterval = null
        }
      }, 1000)
    })

    connection.on('HostReconnected', () => {
      hostDisconnectedCountdown.value = 0
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    })

    connection.on('RoomClosed', () => {
      resetState()
    })

    connection.on('Kicked', () => {
      error.value = 'You were removed from the session.'
      resetState()
    })

    connection.on('ChatMessage', (msg: ChatMessage) => {
      chatMessages.value = [...chatMessages.value, msg]
      if (chatMessages.value.length > MAX_CHAT_MESSAGES) {
        chatMessages.value = chatMessages.value.slice(-MAX_CHAT_MESSAGES)
      }
    })

    connection.onclose(() => {
      if (isConnected.value) {
        // Unexpected disconnect
        if (import.meta.dev) console.log('%c[Session] Connection lost', 'color: #EF4444')
      }
    })

    await connection.start()
    return connection
  }

  // ── Room operations ────────────────────────────────────

  async function createRoom(): Promise<string | null> {
    try {
      error.value = ''
      const conn = await connect()
      const state: SessionState | null = await conn.invoke('CreateRoom')
      if (!state) {
        error.value = 'Failed to create room'
        return null
      }
      // Host's userId comes from the state — we ARE the host
      applyState(state, state.host.userId)
      startHeartbeat()
      if (import.meta.dev) console.log('%c[Session] Room created:', 'color: #10B981; font-weight: bold', state.roomCode, 'hostId:', state.host.userId)
      return state.roomCode
    } catch (e: any) {
      error.value = e.message || 'Failed to create room'
      return null
    }
  }

  async function joinRoom(code: string): Promise<boolean> {
    try {
      error.value = ''
      const conn = await connect()
      const state: SessionState | null = await conn.invoke('JoinRoom', code.toUpperCase())
      if (!state) {
        error.value = 'Room not found or full'
        return false
      }
      // Find ourselves in the members list to get our userId
      const me = state.members.find(m => !m.isHost && m.userId !== state.host.userId)
        ?? state.members[state.members.length - 1] // fallback: last joined
      applyState(state, me.userId)
      if (import.meta.dev) console.log('%c[Session] Joined room:', 'color: #10B981; font-weight: bold', code, 'myId:', me.userId, 'hostId:', state.host.userId)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to join room'
      return false
    }
  }

  async function leaveRoom() {
    if (!connection || !roomCode.value) return
    try {
      await connection.invoke('LeaveRoom', roomCode.value)
    } catch { /* ignore */ }
    stopHeartbeat()
    await connection.stop()
    connection = null
    resetState()
  }

  async function sendChat(message: string) {
    if (!connection || !roomCode.value || !message.trim()) return
    try {
      await connection.invoke('SendChat', roomCode.value, message.trim())
    } catch (e: any) {
      if (import.meta.dev) console.warn('[Session] Chat send failed:', e)
    }
  }

  async function setReady(ready: boolean) {
    if (!connection || !roomCode.value) return
    try {
      await connection.invoke('SetReady', roomCode.value, ready)
    } catch (e: any) {
      if (import.meta.dev) console.warn('[Session] SetReady failed:', e)
    }
  }

  async function setVisualizerConnected(connected: boolean) {
    if (!connection || !roomCode.value) return
    try {
      await connection.invoke('SetVisualizerConnected', roomCode.value, connected)
    } catch (e: any) {
      if (import.meta.dev) console.warn('[Session] SetVisualizerConnected failed:', e)
    }
  }

  /** Whether all members (including host) are ready AND have visualizer connected */
  const allMembersFullyReady = computed(() => {
    if (!isConnected.value || members.value.length === 0) return false
    return members.value.every(m => m.isReady && m.isVisualizerConnected)
  })

  async function kickMember(userId: string) {
    if (!connection || !roomCode.value || !isHost.value) return
    try {
      await connection.invoke('KickMember', roomCode.value, userId)
    } catch (e: any) {
      if (import.meta.dev) console.warn('[Session] Kick failed:', e)
    }
  }

  // ── Host broadcast ─────────────────────────────────────

  async function broadcastPlayback(state: PlaybackState) {
    if (!connection || !roomCode.value || !isHost.value) return
    try {
      await connection.invoke('UpdatePlayback', roomCode.value, state)
    } catch { /* non-critical */ }
  }

  async function broadcastQueue(queue: QueueState) {
    if (!connection || !roomCode.value || !isHost.value) return
    try {
      await connection.invoke('UpdateQueue', roomCode.value, queue)
    } catch { /* non-critical */ }
  }

  // ── Heartbeat ──────────────────────────────────────────
  // Reads directly from the store — no provider function needed.
  // The store always has current playback state from the YouTube player.

  // External setter so AudioPlayer can provide real-time YouTube player state
  let getPlayerStateFn: (() => { currentTime: number; duration: number; isPlaying: boolean; videoId: string }) | null = null

  function setPlayerStateProvider(fn: typeof getPlayerStateFn) {
    getPlayerStateFn = fn
  }

  function buildPlaybackState(): PlaybackState {
    const store = useRayMarcherStore()
    const playerState = getPlayerStateFn?.() ?? { currentTime: 0, duration: 0, isPlaying: false, videoId: '' }
    return {
      videoId: playerState.videoId || store.audio.youtubeUrl || null,
      title: store.audio.trackTitle || null,
      channel: store.audio.trackArtist || null,
      thumbnail: null,
      currentTime: playerState.currentTime,
      duration: playerState.duration,
      isPlaying: playerState.isPlaying,
      sentAt: Date.now(),
    }
  }

  /** Immediately broadcast current state — call on play/pause/seek/track change */
  function broadcastPlaybackNow() {
    if (!isHost.value || !connection) return
    broadcastPlayback(buildPlaybackState())
  }

  // No heartbeat — sync is purely event-driven (play/pause/seek/track change).
  // Heartbeat caused phantom pauses because any transient state that leaked
  // into buildPlaybackState would get broadcast to all clients.
  function startHeartbeat() { /* intentionally empty */ }
  function stopHeartbeat() { /* intentionally empty */ }

  // ── Internal ───────────────────────────────────────────

  function applyState(state: SessionState, currentUserId: string) {
    isConnected.value = true
    myUserId.value = currentUserId
    hostUserId.value = state.host.userId
    roomCode.value = state.roomCode
    hostName.value = `${state.host.firstName}${state.host.lastName ? ` ${state.host.lastName}` : ''}`
    members.value = state.members
    chatMessages.value = []
    hostDisconnectedCountdown.value = 0
    error.value = ''

    // Non-host: apply existing session state
    if (currentUserId !== state.host.userId) {
      if (state.playback) syncedPlayback.value = state.playback
      if (state.queue) syncedQueue.value = state.queue
    }
  }

  function resetState() {
    isConnected.value = false
    myUserId.value = ''
    hostUserId.value = ''
    roomCode.value = ''
    hostName.value = ''
    members.value = []
    chatMessages.value = []
    hostDisconnectedCountdown.value = 0
    syncedPlayback.value = null
    syncedQueue.value = null
    stopHeartbeat()
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }

  async function disconnect() {
    await leaveRoom()
  }

  onUnmounted(() => {
    // Don't destroy the connection on unmount — it's module-level
    // and other components may still reference it
  })

  return {
    // State
    isConnected,
    isHost,
    roomCode,
    hostName,
    members,
    chatMessages,
    error,
    hostDisconnectedCountdown,
    syncedPlayback,
    syncedQueue,

    // Computed
    allMembersFullyReady,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    kickMember,
    setReady,
    setVisualizerConnected,
    broadcastPlayback,
    broadcastPlaybackNow,
    broadcastQueue,
    setPlayerStateProvider,
    disconnect,
  }
}
