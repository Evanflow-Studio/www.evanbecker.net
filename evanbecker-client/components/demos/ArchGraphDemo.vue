<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// Graph data in JSON-LD compatible format
const graphData = reactive({
  '@context': {
    '@vocab': 'https://schema.org/',
    'label': 'name',
    'category': 'additionalType',
    'importance': 'identifier',
    'edges': 'isRelatedTo',
  },
  '@type': 'Graph',
  nodes: [
    // Patterns
    { id: 'monolith', label: 'Monolith', category: 'pattern', importance: 3 },
    { id: 'microservices', label: 'Microservices', category: 'pattern', importance: 4 },
    { id: 'modular-monolith', label: 'Modular Monolith', category: 'pattern', importance: 3 },
    { id: 'event-driven', label: 'Event-Driven', category: 'pattern', importance: 3 },
    { id: 'cqrs', label: 'CQRS', category: 'pattern', importance: 2 },
    { id: 'serverless', label: 'Serverless', category: 'pattern', importance: 2 },
    // Qualities
    { id: 'scalability', label: 'Scalability', category: 'quality', importance: 4 },
    { id: 'maintainability', label: 'Maintainability', category: 'quality', importance: 3 },
    { id: 'simplicity', label: 'Simplicity', category: 'quality', importance: 3 },
    { id: 'performance', label: 'Performance', category: 'quality', importance: 3 },
    { id: 'cost', label: 'Cost', category: 'quality', importance: 2 },
    { id: 'team-autonomy', label: 'Team Autonomy', category: 'quality', importance: 2 },
    // Technologies
    { id: 'dotnet', label: '.NET', category: 'technology', importance: 3 },
    { id: 'docker', label: 'Docker', category: 'technology', importance: 3 },
    { id: 'postgresql', label: 'PostgreSQL', category: 'technology', importance: 3 },
    { id: 'rabbitmq', label: 'RabbitMQ', category: 'technology', importance: 2 },
    { id: 'kubernetes', label: 'Kubernetes', category: 'technology', importance: 3 },
    { id: 'azure', label: 'Azure', category: 'technology', importance: 2 },
  ],
  edges: [
    { source: 'microservices', target: 'scalability', relationship: 'enables' },
    { source: 'microservices', target: 'team-autonomy', relationship: 'enables' },
    { source: 'microservices', target: 'simplicity', relationship: 'conflicts with' },
    { source: 'microservices', target: 'docker', relationship: 'requires' },
    { source: 'microservices', target: 'kubernetes', relationship: 'requires' },
    { source: 'monolith', target: 'simplicity', relationship: 'enables' },
    { source: 'monolith', target: 'scalability', relationship: 'conflicts with' },
    { source: 'monolith', target: 'cost', relationship: 'enhances' },
    { source: 'modular-monolith', target: 'maintainability', relationship: 'enables' },
    { source: 'modular-monolith', target: 'simplicity', relationship: 'enhances' },
    { source: 'modular-monolith', target: 'dotnet', relationship: 'requires' },
    { source: 'event-driven', target: 'scalability', relationship: 'enables' },
    { source: 'event-driven', target: 'rabbitmq', relationship: 'requires' },
    { source: 'event-driven', target: 'performance', relationship: 'enhances' },
    { source: 'cqrs', target: 'performance', relationship: 'enables' },
    { source: 'cqrs', target: 'event-driven', relationship: 'enhances' },
    { source: 'cqrs', target: 'simplicity', relationship: 'conflicts with' },
    { source: 'serverless', target: 'cost', relationship: 'enables' },
    { source: 'serverless', target: 'scalability', relationship: 'enables' },
    { source: 'serverless', target: 'azure', relationship: 'requires' },
    { source: 'docker', target: 'microservices', relationship: 'enables' },
    { source: 'kubernetes', target: 'docker', relationship: 'requires' },
    { source: 'dotnet', target: 'postgresql', relationship: 'enhances' },
    { source: 'azure', target: 'kubernetes', relationship: 'enhances' },
  ],
})

const CATEGORY_COLORS: Record<string, number> = {
  pattern: 0x0c65e5,
  quality: 0x22c55e,
  technology: 0xf59e0b,
}

const RELATIONSHIP_COLORS: Record<string, number> = {
  'enables': 0x22c55e,
  'conflicts with': 0xef4444,
  'requires': 0xf59e0b,
  'enhances': 0x2d95fc,
}

const containerRef = ref<HTMLDivElement | null>(null)
const searchQuery = ref('')
const selectedNodeId = ref<string | null>(null)
const filterCategory = ref<string | null>(null)
const error = ref<string | null>(null)
const threeLoaded = ref(false)
const layoutConverged = ref(false)
const totalMovement = ref(Infinity)

let renderer: any = null
let animFrameId = 0
let resizeObserver: ResizeObserver | null = null

// Node positions for force layout
const nodePositions = reactive<Record<string, { x: number; y: number; z: number; vx: number; vy: number; vz: number }>>({})

// Initialize positions randomly
for (const node of graphData.nodes) {
  nodePositions[node.id] = {
    x: (Math.random() - 0.5) * 8,
    y: (Math.random() - 0.5) * 8,
    z: (Math.random() - 0.5) * 8,
    vx: 0, vy: 0, vz: 0,
  }
}

// Force-directed layout step
function layoutStep() {
  const nodes = graphData.nodes
  const edges = graphData.edges
  const damping = 0.85
  const springLength = 3.0
  const springStrength = 0.02
  const repulsion = 2.0
  const centerPull = 0.005

  let movement = 0

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodePositions[nodes[i].id]
      const b = nodePositions[nodes[j].id]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001
      const force = repulsion / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const fz = (dz / dist) * force
      a.vx += fx; a.vy += fy; a.vz += fz
      b.vx -= fx; b.vy -= fy; b.vz -= fz
    }
  }

  // Spring forces along edges
  for (const edge of edges) {
    const a = nodePositions[edge.source]
    const b = nodePositions[edge.target]
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = b.z - a.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001
    const force = (dist - springLength) * springStrength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    const fz = (dz / dist) * force
    a.vx += fx; a.vy += fy; a.vz += fz
    b.vx -= fx; b.vy -= fy; b.vz -= fz
  }

  // Center pull and apply
  for (const node of nodes) {
    const p = nodePositions[node.id]
    p.vx -= p.x * centerPull
    p.vy -= p.y * centerPull
    p.vz -= p.z * centerPull
    p.vx *= damping
    p.vy *= damping
    p.vz *= damping
    p.x += p.vx
    p.y += p.vy
    p.z += p.vz
    movement += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vz)
  }

  totalMovement.value = movement
  if (movement < 0.01) layoutConverged.value = true
}

// Run initial layout iterations
for (let i = 0; i < 200; i++) {
  layoutStep()
}

const filteredNodes = computed(() => {
  let result = graphData.nodes
  if (filterCategory.value) {
    result = result.filter(n => n.category === filterCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(n => n.label.toLowerCase().includes(q) || n.category.toLowerCase().includes(q))
  }
  return result
})

const filteredNodeIds = computed(() => new Set(filteredNodes.value.map(n => n.id)))

function exportJSON() {
  const json = JSON.stringify(graphData, null, 2)
  navigator.clipboard.writeText(json).catch(() => {
    // Fallback: open in new window
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url)
  })
}

defineExpose({
  graphData,
  threeLoaded,
  layoutConverged,
  totalMovement,
  filteredNodes,
  exportJSON,
  selectedNodeId,
  searchQuery,
  filterCategory,
})

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

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(10, 8, 10)

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
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    // Node meshes
    const nodeMeshes: Map<string, any> = new Map()
    const clickableObjects: any[] = []

    for (const node of graphData.nodes) {
      const pos = nodePositions[node.id]
      const color = CATEGORY_COLORS[node.category] ?? 0x6b7280
      const radius = 0.15 + node.importance * 0.1

      const geometry = new THREE.SphereGeometry(radius, 24, 24)
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.4,
        emissive: color,
        emissiveIntensity: 0.15,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(pos.x, pos.y, pos.z)
      mesh.userData = { nodeId: node.id }
      scene.add(mesh)
      nodeMeshes.set(node.id, mesh)
      clickableObjects.push(mesh)

      // Label
      const labelDiv = document.createElement('div')
      labelDiv.style.cssText = 'font-size:10px;font-weight:600;color:#e2e8f0;background:rgba(15,23,41,0.8);padding:1px 6px;border-radius:4px;white-space:nowrap;'
      labelDiv.textContent = node.label
      const labelObj = new CSS2DObject(labelDiv)
      labelObj.position.set(0, radius + 0.3, 0)
      mesh.add(labelObj)
    }

    // Edge lines
    const edgeLines: Map<string, any> = new Map()

    for (const edge of graphData.edges) {
      const fromPos = nodePositions[edge.source]
      const toPos = nodePositions[edge.target]
      if (!fromPos || !toPos) continue

      const points = [
        new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
        new THREE.Vector3(toPos.x, toPos.y, toPos.z),
      ]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const color = RELATIONSHIP_COLORS[edge.relationship] ?? 0x6b7280
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
      const line = new THREE.Line(geometry, material)
      scene.add(line)
      edgeLines.set(`${edge.source}-${edge.target}`, line)
    }

    // Click handling
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function onClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(clickableObjects)
      if (intersects.length > 0) {
        selectedNodeId.value = intersects[0].object.userData.nodeId
      } else {
        selectedNodeId.value = null
      }
    }

    renderer.domElement.addEventListener('click', onClick)

    // Animate
    function animate() {
      animFrameId = requestAnimationFrame(animate)
      controls.update()

      // Update visibility based on filter
      for (const node of graphData.nodes) {
        const mesh = nodeMeshes.get(node.id)
        if (mesh) {
          const visible = filteredNodeIds.value.has(node.id)
          mesh.visible = visible

          // Highlight selected
          const mat = mesh.material as any
          if (node.id === selectedNodeId.value) {
            mat.emissiveIntensity = 0.6
          } else {
            mat.emissiveIntensity = 0.15
          }
        }
      }

      // Update edge visibility
      for (const edge of graphData.edges) {
        const key = `${edge.source}-${edge.target}`
        const line = edgeLines.get(key)
        if (line) {
          const bothVisible = filteredNodeIds.value.has(edge.source) && filteredNodeIds.value.has(edge.target)
          line.visible = bothVisible

          // Highlight edges connected to selected node
          const mat = line.material as any
          if (selectedNodeId.value && (edge.source === selectedNodeId.value || edge.target === selectedNodeId.value)) {
            mat.opacity = 0.9
          } else {
            mat.opacity = 0.35
          }
        }
      }

      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }

    animate()

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

const selectedNodeData = computed(() => {
  if (!selectedNodeId.value) return null
  return graphData.nodes.find(n => n.id === selectedNodeId.value)
})

const selectedNodeEdges = computed(() => {
  if (!selectedNodeId.value) return []
  return graphData.edges.filter(e => e.source === selectedNodeId.value || e.target === selectedNodeId.value)
})

onMounted(() => { init() })

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

    <div v-else>
      <!-- Controls bar -->
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search nodes..."
          class="rounded-lg border border-slate-700 bg-[#1E293B] px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-[#2D95FC] focus:outline-none focus:ring-1 focus:ring-[#2D95FC]"
        />
        <select
          v-model="filterCategory"
          class="rounded-lg border border-slate-700 bg-[#1E293B] px-3 py-1.5 text-sm text-slate-200 focus:border-[#2D95FC] focus:outline-none"
        >
          <option :value="null">All categories</option>
          <option value="pattern">Patterns</option>
          <option value="quality">Qualities</option>
          <option value="technology">Technologies</option>
        </select>
        <button
          @click="exportJSON"
          class="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600"
        >
          Export as JSON
        </button>
      </div>

      <div class="relative">
        <div ref="containerRef" class="relative h-[500px] w-full overflow-hidden rounded-2xl" />

        <!-- Selected node info -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-x-4"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-4"
        >
          <div
            v-if="selectedNodeData"
            class="absolute top-3 right-3 w-64 rounded-xl border border-slate-700/60 bg-[#0f1729]/95 p-4 backdrop-blur-sm"
          >
            <div class="flex items-start justify-between">
              <h3 class="text-sm font-bold text-slate-100">{{ selectedNodeData.label }}</h3>
              <button @click="selectedNodeId = null" class="text-slate-500 hover:text-slate-300 text-lg leading-none">&times;</button>
            </div>
            <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
              :class="{
                'bg-blue-500/10 text-blue-400': selectedNodeData.category === 'pattern',
                'bg-green-500/10 text-green-400': selectedNodeData.category === 'quality',
                'bg-amber-500/10 text-amber-400': selectedNodeData.category === 'technology',
              }"
            >
              {{ selectedNodeData.category }}
            </span>

            <div v-if="selectedNodeEdges.length > 0" class="mt-3 space-y-1.5">
              <p class="text-[10px] font-medium uppercase tracking-wider text-slate-500">Relationships</p>
              <div
                v-for="edge in selectedNodeEdges"
                :key="`${edge.source}-${edge.target}`"
                class="flex items-center gap-2 text-xs text-slate-400"
              >
                <span class="h-1.5 w-1.5 rounded-full"
                  :class="{
                    'bg-green-500': edge.relationship === 'enables',
                    'bg-red-500': edge.relationship === 'conflicts with',
                    'bg-amber-500': edge.relationship === 'requires',
                    'bg-blue-500': edge.relationship === 'enhances',
                  }"
                />
                <span class="italic text-slate-500">{{ edge.relationship }}</span>
                <span class="text-slate-300">
                  {{ edge.source === selectedNodeId
                    ? graphData.nodes.find(n => n.id === edge.target)?.label
                    : graphData.nodes.find(n => n.id === edge.source)?.label
                  }}
                </span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Legend -->
        <div class="absolute bottom-3 left-3 flex gap-4 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-sm">
          <span v-for="(color, cat) in { Patterns: '#0c65e5', Qualities: '#22c55e', Technologies: '#f59e0b' }"
            :key="cat"
            class="flex items-center gap-1.5 text-[10px] text-slate-400"
          >
            <span class="h-2 w-2 rounded-full" :style="{ background: color }" />
            {{ cat }}
          </span>
          <span class="border-l border-slate-700 pl-3 text-[10px] text-slate-500">
            Edges:
            <span class="ml-1 text-green-400">enables</span>
            <span class="ml-1 text-red-400">conflicts</span>
            <span class="ml-1 text-amber-400">requires</span>
            <span class="ml-1 text-blue-400">enhances</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
