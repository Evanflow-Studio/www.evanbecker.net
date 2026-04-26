// Proxy to Uptime Kuma status page API — avoids CORS issues from client-side fetch.
// The heartbeat endpoint is public and requires no authentication.
const UPTIME_KUMA_URL = 'https://health.evanbecker.net/api/status-page/heartbeat/main'

export default defineEventHandler(async () => {
  const data = await $fetch(UPTIME_KUMA_URL)
  return data
})
