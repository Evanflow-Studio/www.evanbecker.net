<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'

interface LabNode {
  id: string
  label: string
  hostname: string
  ip: string
  purpose: string
  status: 'Running' | 'Stopped'
  type: 'host' | 'database' | 'website' | 'ci' | 'secrets' | 'external'
  position: [number, number, number]
}

interface LabConnection {
  from: string
  to: string
  label: string
}

const nodes: LabNode[] = [
  { id: 'proxmox', label: 'Proxmox Host', hostname: 'pve', ip: '192.168.0.47', purpose: 'Hypervisor (i5-12600K, 16 threads)', status: 'Running', type: 'host', position: [0, 0, 0] },
  { id: 'ct103', label: 'CT103', hostname: 'docker-host', ip: '—', purpose: 'n8n + cloudflared', status: 'Running', type: 'external', position: [-3, 1.5, 2] },
  { id: 'ct105', label: 'CT105', hostname: 'docker-db-prod', ip: '192.168.0.105', purpose: 'PostgreSQL 18 (prod)', status: 'Running', type: 'database', position: [3, 1, -2] },
  { id: 'ct106', label: 'CT106', hostname: 'docker-db-test', ip: '192.168.0.106', purpose: 'PostgreSQL 18 (test)', status: 'Running', type: 'database', position: [3, -1, 2] },
  { id: 'ct107', label: 'CT107', hostname: 'infisical', ip: '192.168.0.107', purpose: 'Secrets management', status: 'Running', type: 'secrets', position: [-3, -1.5, -2] },
  { id: 'ct108', label: 'CT108', hostname: 'ci', ip: '192.168.0.168', purpose: 'Docker Registry + GH Actions', status: 'Running', type: 'ci', position: [0, 2.5, 3] },
  { id: 'ct109', label: 'CT109', hostname: 'website', ip: '192.168.0.169', purpose: 'Traefik + app stack + Uptime Kuma', status: 'Running', type: 'website', position: [0, -2, -1] },
  { id: 'internet', label: 'Internet', hostname: 'Cloudflare', ip: 'Edge', purpose: 'External ingress via CF Tunnel', status: 'Running', type: 'external', position: [-5, 0, 0] },
]

const connections: LabConnection[] = [
  { from: 'ct109', to: 'ct105', label: 'DB connection (prod)' },
  { from: 'ct109', to: 'ct106', label: 'DB connection (test)' },
  { from: 'ct109', to: 'ct107', label: 'Secrets fetch' },
  { from: 'ct108', to: 'ct109', label: 'Image push via registry' },
  { from: 'ct109', to: 'internet', label: 'Cloudflare Tunnel' },
  { from: 'ct103', to: 'internet', label: 'Cloudflare Tunnel' },
]

const containerRef = ref<HTMLDivElement | null>(null)
const selectedNode = ref<LabNode | null>(null)
const error = ref<string | null>(null)
const threeLoaded = ref(false)
const sceneNodeCount = ref(0)

let renderer: any = null
let animFrameId = 0
let resizeObserver: ResizeObserver | null = null

// Store references for testing
const nodeMap = new Map<string, any>()

defineExpose({
  nodes,
  connections,
  threeLoaded,
  sceneNodeCount,
  selectedNode,
  selectNode: (id: string) => {
    const n = nodes.find(nd => nd.id === id)
    if (n) selectedNode.value = n
  },
})

const TYPE_COLORS: Record<string, number> = {
  host: 0x64748b,
  database: 0x22c55e,
  website: 0x0c65e5,
  ci: 0xf59e0b,
  secrets: 0xa855f7,
  external: 0x6b7280,
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

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1120)
    scene.fog = new THREE.Fog(0x0b1120, 15, 30)

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(8, 6, 8)

    // WebGL renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.value.appendChild(renderer.domElement)
    renderer.domElement.style.borderRadius = '1rem'

    // CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(width, height)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.left = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    containerRef.value.appendChild(labelRenderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 4
    controls.maxDistance = 20
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5

    // Grid helper
    const grid = new THREE.GridHelper(20, 20, 0x1e293b, 0x1e293b)
    grid.position.y = -3
    scene.add(grid)

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    // Raycaster for click
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const clickableObjects: any[] = []

    // Create nodes
    for (const node of nodes) {
      const color = TYPE_COLORS[node.type] ?? 0x6b7280
      const size = node.type === 'host' ? 0.7 : 0.5

      const geometry = new THREE.BoxGeometry(size * 2, size, size * 2)
      // Round the edges a bit
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...node.position)
      mesh.userData = { nodeId: node.id }
      scene.add(mesh)
      clickableObjects.push(mesh)
      nodeMap.set(node.id, mesh)

      // Glow ring
      const ringGeo = new THREE.RingGeometry(size * 1.2, size * 1.4, 32)
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.set(node.position[0], node.position[1] - size * 0.5, node.position[2])
      ring.rotation.x = -Math.PI / 2
      scene.add(ring)

      // Label
      const labelDiv = document.createElement('div')
      labelDiv.style.cssText = 'font-size:11px;font-weight:600;color:#e2e8f0;background:rgba(15,23,41,0.85);padding:2px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;'
      labelDiv.textContent = `${node.label} - ${node.hostname}`
      const labelObj = new CSS2DObject(labelDiv)
      labelObj.position.set(0, size + 0.4, 0)
      mesh.add(labelObj)

      sceneNodeCount.value++
    }

    // Create connections
    const connectionMeshes: { mesh: any; direction: number }[] = []

    for (const conn of connections) {
      const fromNode = nodes.find(n => n.id === conn.from)
      const toNode = nodes.find(n => n.id === conn.to)
      if (!fromNode || !toNode) continue

      const from = new THREE.Vector3(...fromNode.position)
      const to = new THREE.Vector3(...toNode.position)

      const points = [from, to]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)

      const material = new THREE.LineBasicMaterial({
        color: 0x2d95fc,
        transparent: true,
        opacity: 0.4,
      })
      const line = new THREE.Line(geometry, material)
      scene.add(line)

      // Pulse particle
      const pulseGeo = new THREE.SphereGeometry(0.08, 8, 8)
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0x41a5f7 })
      const pulse = new THREE.Mesh(pulseGeo, pulseMat)
      pulse.userData = { from, to }
      scene.add(pulse)
      connectionMeshes.push({ mesh: pulse, direction: 1 })
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

    // Animation
    let clock = new THREE.Clock()

    function animate() {
      animFrameId = requestAnimationFrame(animate)
      controls.update()

      const t = clock.getElapsedTime()

      // Animate pulses
      for (const { mesh } of connectionMeshes) {
        const progress = (t * 0.3) % 1
        const from = mesh.userData.from as any
        const to = mesh.userData.to as any
        mesh.position.lerpVectors(from, to, progress)
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

onMounted(() => {
  init()
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  resizeObserver?.disconnect()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
})
</script>

<template>
  <div class="relative w-full">
    <div v-if="error" class="flex h-[500px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-else class="relative">
      <div ref="containerRef" class="relative h-[500px] w-full overflow-hidden rounded-2xl" />

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
          class="absolute top-3 right-3 w-72 rounded-xl border border-slate-700/60 bg-[#0f1729]/95 p-4 backdrop-blur-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-100">{{ selectedNode.label }}</h3>
              <p class="text-xs text-slate-400">{{ selectedNode.hostname }}</p>
            </div>
            <button @click="selectedNode = null" class="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
          </div>

          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">IP</span>
              <span class="font-mono text-slate-300">{{ selectedNode.ip }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Purpose</span>
              <span class="text-right text-slate-300">{{ selectedNode.purpose }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Status</span>
              <span class="flex items-center gap-1.5 text-slate-300">
                <span class="h-1.5 w-1.5 rounded-full" :class="selectedNode.status === 'Running' ? 'bg-green-500' : 'bg-red-500'" />
                {{ selectedNode.status }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Type</span>
              <span class="rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize"
                :class="{
                  'bg-green-500/10 text-green-400': selectedNode.type === 'database',
                  'bg-blue-500/10 text-blue-400': selectedNode.type === 'website',
                  'bg-amber-500/10 text-amber-400': selectedNode.type === 'ci',
                  'bg-purple-500/10 text-purple-400': selectedNode.type === 'secrets',
                  'bg-slate-500/10 text-slate-400': selectedNode.type === 'external' || selectedNode.type === 'host',
                }"
              >
                {{ selectedNode.type }}
              </span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Legend -->
      <div class="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-sm">
        <span v-for="(color, type) in { Database: '#22c55e', 'Website/App': '#0c65e5', CI: '#f59e0b', Secrets: '#a855f7', External: '#6b7280' }"
          :key="type"
          class="flex items-center gap-1.5 text-[10px] text-slate-400"
        >
          <span class="h-2 w-2 rounded-sm" :style="{ background: color }" />
          {{ type }}
        </span>
      </div>
    </div>
  </div>
</template>
