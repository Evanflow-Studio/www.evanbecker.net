import { ref, onUnmounted } from 'vue'

export interface MonitorStatus {
  id: number
  status: 'up' | 'down' | 'unknown'
  ping: number
  lastCheck: string
}

const BASE_URL = 'https://health.evanbecker.net'
const POLL_INTERVAL_MS = 30_000

export function useUptimeKuma(slug = 'main') {
  const monitors = ref<Map<number, MonitorStatus>>(new Map())
  const loading = ref(true)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchHeartbeats() {
    try {
      const res = await fetch(`${BASE_URL}/api/status-page/heartbeat/${slug}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const heartbeatList: Record<string, Array<{ status: number; ping: number; time: string }>> = data.heartbeatList ?? {}

      const updated = new Map<number, MonitorStatus>()
      for (const [idStr, beats] of Object.entries(heartbeatList)) {
        const id = parseInt(idStr, 10)
        if (isNaN(id) || !beats.length) continue

        // Most recent heartbeat is last in array
        const latest = beats[beats.length - 1]
        updated.set(id, {
          id,
          status: latest.status === 1 ? 'up' : 'down',
          ping: latest.ping ?? 0,
          lastCheck: latest.time ?? '',
        })
      }

      monitors.value = updated
      error.value = null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch status'
    } finally {
      loading.value = false
    }
  }

  function getStatus(monitorId: number): MonitorStatus['status'] {
    return monitors.value.get(monitorId)?.status ?? 'unknown'
  }

  function getNodeStatus(monitorIds: number[] | undefined, alwaysLive: boolean | undefined): MonitorStatus['status'] {
    if (alwaysLive) return 'up'
    if (!monitorIds || monitorIds.length === 0) return 'unknown'

    const statuses = monitorIds.map(id => getStatus(id))
    if (statuses.every(s => s === 'up')) return 'up'
    if (statuses.some(s => s === 'down')) return 'down'
    return 'unknown'
  }

  function getMonitorDetails(monitorIds: number[]): MonitorStatus[] {
    return monitorIds
      .map(id => monitors.value.get(id))
      .filter((m): m is MonitorStatus => m !== undefined)
  }

  // Start polling
  fetchHeartbeats()
  pollTimer = setInterval(fetchHeartbeats, POLL_INTERVAL_MS)

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
  })

  return {
    monitors,
    loading,
    error,
    getStatus,
    getNodeStatus,
    getMonitorDetails,
  }
}
