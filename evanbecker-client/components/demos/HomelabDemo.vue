<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUptimeKuma, type MonitorStatus } from '~/composables/useUptimeKuma'

// === Infrastructure Model ===

interface LabNode {
  id: string
  label: string
  hostname: string
  ip: string
  purpose: string
  type: 'host' | 'database' | 'website-prod' | 'website-test' | 'ci' | 'secrets' | 'external' | 'cloudflare'
  position: [number, number, number]
  monitorIds?: number[]
  alwaysLive?: boolean
  services?: string[]
}

interface LabConnection {
  from: string
  to: string
  label: string
  type?: 'lxc' | 'data' | 'tunnel'
}

const MONITOR_NAMES: Record<number, string> = {
  1: 'Website (Prod)',
  2: 'Website (Test)',
  3: 'API (Prod)',
  4: 'API (Test)',
  5: 'Database (Prod)',
  6: 'Database (Test)',
  7: 'Infisical',
  8: 'Docker Registry',
  9: 'n8n',
}

const nodes: LabNode[] = [
  {
    id: 'proxmox', label: 'Proxmox Host', hostname: 'pve', ip: '192.168.0.47',
    purpose: 'Hypervisor (i5-12600K, 16 threads, MSI MPG Z690)',
    type: 'host', position: [0, -1, 0], alwaysLive: true,
  },
  {
    id: 'ct103', label: 'CT103', hostname: 'docker-host', ip: '—',
    purpose: 'n8n automation + cloudflared',
    type: 'external', position: [-4, 1.5, 2], monitorIds: [9],
    services: ['n8n.evanbecker.net'],
  },
  {
    id: 'ct105', label: 'CT105', hostname: 'docker-db-prod', ip: '192.168.0.105',
    purpose: 'PostgreSQL 18 (production)',
    type: 'database', position: [4, 1.5, -2], monitorIds: [5],
  },
  {
    id: 'ct106', label: 'CT106', hostname: 'docker-db-test', ip: '192.168.0.106',
    purpose: 'PostgreSQL 18 (test)',
    type: 'database', position: [4, -0.5, 2.5], monitorIds: [6],
  },
  {
    id: 'ct107', label: 'CT107', hostname: 'infisical', ip: '192.168.0.107',
    purpose: 'Infisical secrets + PG 16 + Redis',
    type: 'secrets', position: [-3, -0.5, -2.5], monitorIds: [7],
  },
  {
    id: 'ct108', label: 'CT108', hostname: 'ci', ip: '192.168.0.168',
    purpose: 'Docker Registry + GitHub Actions Runner',
    type: 'ci', position: [0, 3, 3], monitorIds: [8],
  },
  // CT109 split into prod and test
  {
    id: 'ct109-prod', label: 'CT109 (Prod)', hostname: 'website', ip: '192.168.0.169',
    purpose: 'Traefik + Production Website + API + Uptime Kuma',
    type: 'website-prod', position: [0, 1.5, -1.5], monitorIds: [1, 3],
    services: ['www.evanbecker.net', 'api.evanbecker.net', 'health.evanbecker.net', 'monitoring.evanbecker.net'],
  },
  {
    id: 'ct109-test', label: 'CT109 (Test)', hostname: 'website', ip: '192.168.0.169',
    purpose: 'Test Website + API + Watchtower',
    type: 'website-test', position: [0, 0, 1.5], monitorIds: [2, 4],
    services: ['test.evanbecker.net', 'api-test.evanbecker.net'],
  },
  {
    id: 'cloudflare', label: 'Cloudflare', hostname: 'Edge Network', ip: '—',
    purpose: 'DNS + Tunnel ingress to all public services',
    type: 'cloudflare', position: [-6, 1, 0], alwaysLive: true,
    services: [
      'www.evanbecker.net', 'api.evanbecker.net',
      'test.evanbecker.net', 'api-test.evanbecker.net',
      'health.evanbecker.net', 'monitoring.evanbecker.net',
      'n8n.evanbecker.net',
    ],
  },
]

const connections: LabConnection[] = [
  // Data connections
  { from: 'ct109-prod', to: 'ct105', label: 'DB connection (prod)', type: 'data' },
  { from: 'ct109-test', to: 'ct106', label: 'DB connection (test)', type: 'data' },
  { from: 'ct109-prod', to: 'ct107', label: 'Secrets fetch at startup', type: 'data' },
  { from: 'ct109-test', to: 'ct107', label: 'Secrets fetch at startup', type: 'data' },
  { from: 'ct108', to: 'ct109-prod', label: 'Image push (prod)', type: 'data' },
  { from: 'ct108', to: 'ct109-test', label: 'Image push (test)', type: 'data' },
  // Cloudflare tunnels
  { from: 'ct109-prod', to: 'cloudflare', label: 'CF Tunnel (prod)', type: 'tunnel' },
  { from: 'ct109-test', to: 'cloudflare', label: 'CF Tunnel (test)', type: 'tunnel' },
  { from: 'ct103', to: 'cloudflare', label: 'CF Tunnel (n8n)', type: 'tunnel' },
  // LXC host relationships
  { from: 'proxmox', to: 'ct103', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct105', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct106', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct107', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct108', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct109-prod', label: 'LXC host', type: 'lxc' },
  { from: 'proxmox', to: 'ct109-test', label: 'LXC host', type: 'lxc' },
]

// === Live Status ===

const kuma = useUptimeKuma()

function getNodeStatus(node: LabNode): 'up' | 'down' | 'unknown' {
  return kuma.getNodeStatus(node.monitorIds, node.alwaysLive)
}

// === 3D Scene ===

const containerRef = ref<HTMLDivElement | null>(null)
const selectedNode = ref<LabNode | null>(null)
const error = ref<string | null>(null)
const threeLoaded = ref(false)
const sceneNodeCount = ref(0)

let renderer: any = null
let animFrameId = 0
let resizeObserver: ResizeObserver | null = null

const nodeMap = new Map<string, any>()

defineExpose({
  nodes, connections, threeLoaded, sceneNodeCount, selectedNode,
  selectNode: (id: string) => {
    const n = nodes.find(nd => nd.id === id)
    if (n) selectedNode.value = n
  },
})

const TYPE_COLORS: Record<string, number> = {
  'host': 0x64748b,
  'database': 0x22c55e,
  'website-prod': 0x0c65e5,
  'website-test': 0x2d95fc,
  'ci': 0xf59e0b,
  'secrets': 0xa855f7,
  'external': 0x6b7280,
  'cloudflare': 0xf48120,
}

const STATUS_COLORS: Record<string, number> = {
  up: 0x22c55e,
  down: 0xef4444,
  unknown: 0xf59e0b,
}

const CONNECTION_COLORS: Record<string, number> = {
  data: 0x2d95fc,
  tunnel: 0xf48120,
  lxc: 0x475569,
}

// Sonar ping configuration
const PING_INTERVAL = 3.0 // seconds between pings
const PING_DURATION = 2.0 // seconds for ring to expand and fade
const PING_MAX_SCALE_UP = 3.0 // max scale for UP status
const PING_MAX_SCALE_DOWN = 6.0 // much larger for DOWN status

interface SonarPing {
  ring: any // THREE.Mesh
  nodeId: string
  startTime: number
  maxScale: number
  baseSize: number
}

async function init() {
  if (!containerRef.value) return

  try {
    const THREE = await import('three')
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
    const { CSS2DRenderer, CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js')
    threeLoaded.value = true

    const width = containerRef.value.clientWidth
    const height = 500

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1120)
    scene.fog = new THREE.Fog(0x0b1120, 18, 35)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(10, 7, 10)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.value.appendChild(renderer.domElement)
    renderer.domElement.style.borderRadius = '1rem'

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(width, height)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.left = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    containerRef.value.appendChild(labelRenderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 5
    controls.maxDistance = 25
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4

    // Grid
    const grid = new THREE.GridHelper(24, 24, 0x1e293b, 0x1e293b)
    grid.position.y = -3.5
    scene.add(grid)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const clickableObjects: any[] = []

    // Track last ping time per node for staggered sonar
    const lastPingTime = new Map<string, number>()
    const activePings: SonarPing[] = []

    // Stagger initial pings so they don't all fire at once
    nodes.forEach((node, i) => {
      lastPingTime.set(node.id, -(PING_INTERVAL * (i / nodes.length)))
    })

    // Create nodes
    for (const node of nodes) {
      const color = TYPE_COLORS[node.type] ?? 0x6b7280
      const isHost = node.type === 'host'
      const isCloudflare = node.type === 'cloudflare'
      const size = isHost ? 0.8 : isCloudflare ? 0.6 : 0.5

      const geometry = isCloudflare
        ? new THREE.SphereGeometry(size, 16, 16)
        : new THREE.BoxGeometry(size * 2, size, size * 2)

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...node.position)
      mesh.userData = { nodeId: node.id, baseSize: size }
      scene.add(mesh)
      clickableObjects.push(mesh)
      nodeMap.set(node.id, mesh)

      // Label
      const labelDiv = document.createElement('div')
      labelDiv.style.cssText = 'font-size:11px;font-weight:600;color:#e2e8f0;background:rgba(15,23,41,0.85);padding:2px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;'
      labelDiv.textContent = `${node.label} — ${node.hostname}`
      const labelObj = new CSS2DObject(labelDiv)
      labelObj.position.set(0, size + 0.4, 0)
      mesh.add(labelObj)

      sceneNodeCount.value++
    }

    // Helper: spawn a sonar ping ring
    function spawnPing(node: LabNode, status: 'up' | 'down' | 'unknown') {
      const mesh = nodeMap.get(node.id)
      if (!mesh) return

      const baseSize = mesh.userData.baseSize as number
      const isDown = status === 'down'
      const pingColor = STATUS_COLORS[status] ?? STATUS_COLORS.unknown

      const ringGeo = new THREE.RingGeometry(baseSize * 1.1, baseSize * 1.3, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: pingColor,
        transparent: true,
        opacity: isDown ? 0.8 : 0.5,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.set(node.position[0], node.position[1] - baseSize * 0.5, node.position[2])
      ring.rotation.x = -Math.PI / 2
      scene.add(ring)

      activePings.push({
        ring,
        nodeId: node.id,
        startTime: clock.getElapsedTime(),
        maxScale: isDown ? PING_MAX_SCALE_DOWN : PING_MAX_SCALE_UP,
        baseSize,
      })
    }

    // Create connections
    const connectionMeshes: { mesh: any }[] = []

    for (const conn of connections) {
      const fromNode = nodes.find(n => n.id === conn.from)
      const toNode = nodes.find(n => n.id === conn.to)
      if (!fromNode || !toNode) continue

      const from = new THREE.Vector3(...fromNode.position)
      const to = new THREE.Vector3(...toNode.position)

      const connColor = CONNECTION_COLORS[conn.type ?? 'data'] ?? 0x2d95fc
      const isLxc = conn.type === 'lxc'

      const geometry = new THREE.BufferGeometry().setFromPoints([from, to])
      const material = new THREE.LineBasicMaterial({
        color: connColor,
        transparent: true,
        opacity: isLxc ? 0.12 : 0.4,
      })

      const line = new THREE.Line(geometry, material)
      scene.add(line)

      if (!isLxc) {
        const pulseGeo = new THREE.SphereGeometry(0.06, 8, 8)
        const pulseMat = new THREE.MeshBasicMaterial({ color: connColor })
        const pulse = new THREE.Mesh(pulseGeo, pulseMat)
        pulse.userData = { from, to }
        scene.add(pulse)
        connectionMeshes.push({ mesh: pulse })
      }
    }

    // Click handler
    function onClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(clickableObjects)
      if (intersects.length > 0) {
        const nodeId = intersects[0].object.userData.nodeId
        const found = nodes.find(n => n.id === nodeId)
        if (found) {
          selectedNode.value = found
          controls.autoRotate = false
          setTimeout(() => { controls.autoRotate = true }, 5000)
        }
      } else {
        selectedNode.value = null
      }
    }

    renderer.domElement.addEventListener('click', onClick)

    // Animation loop
    const clock = new THREE.Clock()

    function animate() {
      animFrameId = requestAnimationFrame(animate)
      controls.update()
      const t = clock.getElapsedTime()

      // Animate connection pulses
      for (const { mesh } of connectionMeshes) {
        const progress = (t * 0.25) % 1
        const from = mesh.userData.from as any
        const to = mesh.userData.to as any
        mesh.position.lerpVectors(from, to, progress)
      }

      // Spawn sonar pings at intervals
      for (const node of nodes) {
        const last = lastPingTime.get(node.id) ?? 0
        if (t - last >= PING_INTERVAL) {
          lastPingTime.set(node.id, t)
          const status = getNodeStatus(node)
          spawnPing(node, status)
        }
      }

      // Animate active sonar pings: expand + fade
      for (let i = activePings.length - 1; i >= 0; i--) {
        const ping = activePings[i]
        const age = t - ping.startTime
        const progress = age / PING_DURATION

        if (progress >= 1) {
          // Remove expired ping
          scene.remove(ping.ring)
          ping.ring.geometry.dispose()
          ping.ring.material.dispose()
          activePings.splice(i, 1)
          continue
        }

        // Expand: 1x → maxScale
        const scale = 1 + (ping.maxScale - 1) * progress
        ping.ring.scale.set(scale, scale, 1)

        // Fade out
        ping.ring.material.opacity = (1 - progress) * 0.6
      }

      // Dim down nodes when status is "down"
      for (const node of nodes) {
        const mesh = nodeMap.get(node.id)
        if (!mesh) continue
        const status = getNodeStatus(node)
        mesh.material.opacity = status === 'down' ? 0.35 : 0.9
      }

      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }

    animate()

    // Resize
    resizeObserver = new ResizeObserver(() => {
      if (!containerRef.value) return
      const w = containerRef.value.clientWidth
      const h = 500
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      labelRenderer.setSize(w, h)
    })
    resizeObserver.observe(containerRef.value)
  } catch (e: any) {
    error.value = `Failed to initialize 3D scene: ${e.message}`
  }
}

onMounted(init)

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  resizeObserver?.disconnect()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
})

function timeAgo(isoString: string): string {
  if (!isoString) return '—'
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
</script>

<template>
  <div class="relative w-full">
    <div v-if="error" class="flex h-[500px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-else class="relative">
      <div ref="containerRef" class="relative h-[500px] w-full overflow-hidden rounded-2xl" />

      <!-- Live status badge -->
      <div class="absolute top-3 left-3 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5">
        <div class="h-2 w-2 rounded-full" :class="kuma.loading.value ? 'bg-amber-400 animate-pulse' : 'bg-green-400'" />
        <span class="text-[10px] font-medium text-slate-300">
          {{ kuma.loading.value ? 'Fetching status...' : 'Live from Uptime Kuma' }}
        </span>
      </div>

      <!-- Details panel -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div
          v-if="selectedNode"
          class="absolute top-3 right-3 w-80 rounded-xl border border-slate-700/60 bg-[#0f1729]/95 p-4 backdrop-blur-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-100">{{ selectedNode.label }}</h3>
              <p class="text-xs text-slate-400">{{ selectedNode.hostname }}</p>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="h-2.5 w-2.5 rounded-full"
                :class="{
                  'bg-green-400': getNodeStatus(selectedNode) === 'up',
                  'bg-red-400 animate-pulse': getNodeStatus(selectedNode) === 'down',
                  'bg-amber-400 animate-pulse': getNodeStatus(selectedNode) === 'unknown',
                }"
              />
              <button @click="selectedNode = null" class="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
            </div>
          </div>

          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">IP</span>
              <span class="font-mono text-slate-300">{{ selectedNode.ip }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Purpose</span>
              <span class="text-slate-300 text-right max-w-[180px]">{{ selectedNode.purpose }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Status</span>
              <span
                class="font-medium"
                :class="{
                  'text-green-400': getNodeStatus(selectedNode) === 'up',
                  'text-red-400': getNodeStatus(selectedNode) === 'down',
                  'text-amber-400': getNodeStatus(selectedNode) === 'unknown',
                }"
              >
                {{ getNodeStatus(selectedNode).toUpperCase() }}
                <span v-if="selectedNode.alwaysLive" class="text-slate-500 font-normal">(inferred)</span>
              </span>
            </div>

            <!-- Monitor details -->
            <template v-if="selectedNode.monitorIds?.length">
              <div class="border-t border-slate-700/50 pt-2 mt-2">
                <p class="text-slate-500 font-medium mb-1.5">Monitors</p>
                <div
                  v-for="monitor in kuma.getMonitorDetails(selectedNode.monitorIds)"
                  :key="monitor.id"
                  class="flex items-center justify-between py-0.5"
                >
                  <div class="flex items-center gap-1.5">
                    <div
                      class="h-1.5 w-1.5 rounded-full"
                      :class="monitor.status === 'up' ? 'bg-green-400' : 'bg-red-400'"
                    />
                    <span class="text-slate-300">{{ MONITOR_NAMES[monitor.id] || `Monitor ${monitor.id}` }}</span>
                  </div>
                  <span class="text-slate-500">
                    {{ monitor.ping > 0 ? `${monitor.ping}ms` : '—' }}
                    · {{ timeAgo(monitor.lastCheck) }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Services -->
            <template v-if="selectedNode.services?.length">
              <div class="border-t border-slate-700/50 pt-2 mt-2">
                <p class="text-slate-500 font-medium mb-1.5">Services</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="svc in selectedNode.services"
                    :key="svc"
                    class="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400"
                  >
                    {{ svc }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
