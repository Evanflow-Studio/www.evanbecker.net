<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'

const router = useRouter()
const colorMode = useColorMode()
const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const showControls = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let width = 0
let height = 0
let mouse = { x: -1000, y: -1000, down: false }
let dragTarget: GraphNode | null = null
let hoveredNode: GraphNode | null = null

// Tunable physics
const physics = reactive({
  repelForce: 1200,
  linkDistance: 100,
  linkStrength: 0.025,
  damping: 0.92,
  centerGravity: 0.01,
})

// Filter state
const filters = reactive({
  showPages: true,
  showArticles: true,
  showTags: true,
  showTech: true,
})

// --- Data model ---

interface GraphNode {
  id: string
  label: string
  type: 'page' | 'article' | 'tag' | 'tech'
  href?: string
  internal?: boolean
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pinned: boolean
}

interface GraphLink {
  source: string
  target: string
}

// Site pages
const pages: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'pinned'>[] = [
  { id: 'home', label: 'Home', type: 'page', href: '/', internal: true },
  { id: 'about', label: 'About Me', type: 'page', href: '/about-me', internal: true },
  { id: 'contact', label: 'Contact', type: 'page', href: '/contact', internal: true },
  { id: 'blog', label: 'Blog', type: 'page', href: '/articles', internal: true },
  { id: 'projects', label: 'Projects', type: 'page', href: '/projects', internal: true },
]

// Articles (1 real + fakes to demonstrate clusters)
const articles: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'pinned'>[] = [
  { id: 'art-building', label: 'Building Evanbecker.net', type: 'article', href: '/articles/building-evanbecker-net', internal: true },
  { id: 'art-clean-arch', label: 'Clean Architecture in .NET', type: 'article', href: '#', internal: true },
  { id: 'art-proxmox', label: 'Proxmox Homelab Setup', type: 'article', href: '#', internal: true },
  { id: 'art-ef-migrations', label: 'EF Core Migrations', type: 'article', href: '#', internal: true },
  { id: 'art-docker-lxc', label: 'Docker in LXC', type: 'article', href: '#', internal: true },
  { id: 'art-traefik', label: 'Traefik Reverse Proxy', type: 'article', href: '#', internal: true },
  { id: 'art-auth0', label: 'Auth0 Integration', type: 'article', href: '#', internal: true },
  { id: 'art-game-physics', label: 'Game Physics Systems', type: 'article', href: '#', internal: true },
  { id: 'art-metrology', label: 'Metrology & CMMs', type: 'article', href: '#', internal: true },
]

// Tags (cluster anchors)
const tags: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'pinned'>[] = [
  { id: 'tag-software', label: 'software', type: 'tag' },
  { id: 'tag-infra', label: 'infrastructure', type: 'tag' },
  { id: 'tag-dotnet', label: '.net', type: 'tag' },
  { id: 'tag-devops', label: 'devops', type: 'tag' },
  { id: 'tag-security', label: 'security', type: 'tag' },
  { id: 'tag-gaming', label: 'game-dev', type: 'tag' },
  { id: 'tag-hardware', label: 'hardware', type: 'tag' },
]

// Tech nodes
const techNodes: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'pinned'>[] = [
  { id: 'tech-dotnet', label: '.NET 10', type: 'tech', href: 'https://dotnet.microsoft.com/', internal: false },
  { id: 'tech-nuxt', label: 'Nuxt', type: 'tech', href: 'https://nuxt.com/', internal: false },
  { id: 'tech-pg', label: 'PostgreSQL', type: 'tech', href: 'https://www.postgresql.org/', internal: false },
  { id: 'tech-docker', label: 'Docker', type: 'tech', href: 'https://www.docker.com/', internal: false },
  { id: 'tech-proxmox', label: 'Proxmox', type: 'tech', href: 'https://www.proxmox.com/', internal: false },
]

// Links: article <-> tag, article <-> tech, page <-> page
const links: GraphLink[] = [
  // Page connections
  { source: 'home', target: 'blog' },
  { source: 'home', target: 'about' },
  { source: 'home', target: 'projects' },
  { source: 'about', target: 'contact' },
  { source: 'blog', target: 'art-building' },

  // Article <-> tag clusters
  { source: 'art-building', target: 'tag-software' },
  { source: 'art-building', target: 'tag-infra' },
  { source: 'art-clean-arch', target: 'tag-software' },
  { source: 'art-clean-arch', target: 'tag-dotnet' },
  { source: 'art-proxmox', target: 'tag-infra' },
  { source: 'art-proxmox', target: 'tag-hardware' },
  { source: 'art-ef-migrations', target: 'tag-dotnet' },
  { source: 'art-ef-migrations', target: 'tag-software' },
  { source: 'art-docker-lxc', target: 'tag-devops' },
  { source: 'art-docker-lxc', target: 'tag-infra' },
  { source: 'art-traefik', target: 'tag-devops' },
  { source: 'art-traefik', target: 'tag-infra' },
  { source: 'art-auth0', target: 'tag-security' },
  { source: 'art-auth0', target: 'tag-software' },
  { source: 'art-game-physics', target: 'tag-gaming' },
  { source: 'art-game-physics', target: 'tag-software' },
  { source: 'art-metrology', target: 'tag-hardware' },

  // Tech <-> tag connections
  { source: 'tech-dotnet', target: 'tag-dotnet' },
  { source: 'tech-nuxt', target: 'tag-software' },
  { source: 'tech-pg', target: 'tag-infra' },
  { source: 'tech-docker', target: 'tag-devops' },
  { source: 'tech-proxmox', target: 'tag-infra' },
]

// --- Build nodes ---

let nodes: GraphNode[] = []
let activeLinks: GraphLink[] = []

const visibleTypes = computed(() => {
  const s = new Set<string>()
  if (filters.showPages) s.add('page')
  if (filters.showArticles) s.add('article')
  if (filters.showTags) s.add('tag')
  if (filters.showTech) s.add('tech')
  return s
})

function buildGraph() {
  const allDefs = [...pages, ...articles, ...tags, ...techNodes]
  nodes = allDefs
    .filter(d => visibleTypes.value.has(d.type))
    .map(d => ({
      ...d,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
      radius: d.type === 'tag' ? 6 : d.type === 'page' ? 5 : d.type === 'tech' ? 4 : 3.5,
      pinned: false,
    }))

  const nodeIds = new Set(nodes.map(n => n.id))
  activeLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
}

function getNode(id: string): GraphNode | undefined {
  return nodes.find(n => n.id === id)
}

// --- Colors ---

function nodeColor(n: GraphNode, hovered: boolean): string {
  if (hovered) return '#2D95FC'
  switch (n.type) {
    case 'page': return '#0C65E5'
    case 'article': return '#41A5F7'
    case 'tag': return '#2D95FC'
    case 'tech': return '#0C65E5'
    default: return '#2D95FC'
  }
}

function labelColor(hovered: boolean): string {
  if (hovered) return colorMode.value === 'dark' ? '#F8FAFC' : '#0F172A'
  return colorMode.value === 'dark' ? '#94A3B8' : '#64748B'
}

// --- Physics ---

function simulate() {
  const nodeCount = nodes.length

  // Repulsion (all pairs)
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 1 }

      const force = physics.repelForce / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (!a.pinned) { a.vx -= fx; a.vy -= fy }
      if (!b.pinned) { b.vx += fx; b.vy += fy }
    }
  }

  // Link attraction (spring)
  for (const link of activeLinks) {
    const a = getNode(link.source)
    const b = getNode(link.target)
    if (!a || !b) continue

    let dx = b.x - a.x
    let dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) continue

    const displacement = dist - physics.linkDistance
    const force = displacement * physics.linkStrength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    if (!a.pinned) { a.vx += fx; a.vy += fy }
    if (!b.pinned) { b.vx -= fx; b.vy -= fy }
  }

  // Center gravity
  for (const n of nodes) {
    if (n.pinned) continue
    n.vx += (width / 2 - n.x) * physics.centerGravity
    n.vy += (height / 2 - n.y) * physics.centerGravity
  }

  // Integrate
  for (const n of nodes) {
    if (n.pinned) continue
    n.vx *= physics.damping
    n.vy *= physics.damping
    n.x += n.vx
    n.y += n.vy

    // Soft bounds
    const pad = 40
    if (n.x < pad) { n.x = pad; n.vx *= -0.3 }
    if (n.x > width - pad) { n.x = width - pad; n.vx *= -0.3 }
    if (n.y < pad) { n.y = pad; n.vy *= -0.3 }
    if (n.y > height - pad) { n.y = height - pad; n.vy *= -0.3 }
  }
}

// --- Rendering ---

function findHovered(): GraphNode | null {
  for (const n of nodes) {
    const dx = mouse.x - n.x
    const dy = mouse.y - n.y
    const hitRadius = n.radius + 12
    if (dx * dx + dy * dy < hitRadius * hitRadius) return n
  }
  return null
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  simulate()
  hoveredNode = findHovered()

  if (canvas.value) {
    canvas.value.style.cursor = hoveredNode ? 'pointer' : dragTarget ? 'grabbing' : 'default'
  }

  // Draw links
  for (const link of activeLinks) {
    const a = getNode(link.source)
    const b = getNode(link.target)
    if (!a || !b) continue

    const isHoverLink = hoveredNode && (link.source === hoveredNode.id || link.target === hoveredNode.id)

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = isHoverLink
      ? `rgba(45, 149, 252, 0.45)`
      : `rgba(45, 149, 252, 0.12)`
    ctx.lineWidth = isHoverLink ? 1.2 : 0.5
    ctx.stroke()
  }

  // Draw nodes
  for (const n of nodes) {
    const isHovered = n === hoveredNode
    const isConnectedToHover = hoveredNode && activeLinks.some(
      l => (l.source === hoveredNode!.id && l.target === n.id) ||
           (l.target === hoveredNode!.id && l.source === n.id)
    )
    const dimmed = hoveredNode && !isHovered && !isConnectedToHover

    // Glow on hover
    if (isHovered) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(45, 149, 252, 0.12)'
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(n.x, n.y, isHovered ? n.radius + 1.5 : n.radius, 0, Math.PI * 2)
    ctx.fillStyle = nodeColor(n, isHovered)
    ctx.globalAlpha = dimmed ? 0.2 : (isHovered ? 1 : 0.8)
    ctx.fill()
    ctx.globalAlpha = 1

    // Label
    const fontSize = n.type === 'tag' ? 10 : 9
    ctx.font = `${isHovered ? '600 ' : ''}${fontSize}px Inter, system-ui, sans-serif`
    ctx.fillStyle = labelColor(isHovered)
    ctx.globalAlpha = dimmed ? 0.15 : 1
    ctx.textAlign = 'center'
    ctx.fillText(n.label, n.x, n.y + n.radius + 13)
    ctx.globalAlpha = 1

    // Type indicator for tags (small ring)
    if (n.type === 'tag' && !dimmed) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius + 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(45, 149, 252, 0.25)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // Hover tooltip with type
  if (hoveredNode) {
    const typeLabel = hoveredNode.type === 'article' ? 'Article'
      : hoveredNode.type === 'tag' ? 'Tag'
      : hoveredNode.type === 'tech' ? 'Technology'
      : 'Page'
    const isDark = colorMode.value === 'dark'
    ctx.font = '9px Inter, system-ui, sans-serif'
    ctx.fillStyle = isDark ? '#64748B' : '#94A3B8'
    ctx.textAlign = 'center'
    ctx.fillText(typeLabel, hoveredNode.x, hoveredNode.y - hoveredNode.radius - 8)
  }

  animationId = requestAnimationFrame(draw)
}

// --- Interaction ---

function onMouseMove(e: MouseEvent) {
  if (!canvas.value) return
  const rect = canvas.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top

  if (dragTarget) {
    dragTarget.x = mouse.x
    dragTarget.y = mouse.y
    dragTarget.vx = 0
    dragTarget.vy = 0
  }
}

function onMouseDown(e: MouseEvent) {
  mouse.down = true
  const h = findHovered()
  if (h) {
    dragTarget = h
    dragTarget.pinned = true
    e.preventDefault()
  }
}

function onMouseUp() {
  if (dragTarget) {
    dragTarget.pinned = false
    dragTarget = null
  }
  mouse.down = false
}

function onClick() {
  if (dragTarget) return // was dragging
  if (!hoveredNode?.href) return
  if (hoveredNode.internal) {
    router.push(hoveredNode.href)
  } else {
    window.open(hoveredNode.href, '_blank', 'noopener')
  }
}

function onMouseLeave() {
  mouse.x = -1000
  mouse.y = -1000
  if (dragTarget) {
    dragTarget.pinned = false
    dragTarget = null
  }
}

// --- Lifecycle ---

function resize() {
  if (!canvas.value || !container.value) return
  const rect = container.value.getBoundingClientRect()
  width = rect.width
  height = rect.height
  canvas.value.width = width * window.devicePixelRatio
  canvas.value.height = height * window.devicePixelRatio
  canvas.value.style.width = width + 'px'
  canvas.value.style.height = height + 'px'
  ctx = canvas.value.getContext('2d')
  ctx?.scale(window.devicePixelRatio, window.devicePixelRatio)
}

function start() {
  resize()
  buildGraph()
  draw()
}

function stop() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// Rebuild graph when filters change
watch(filters, () => {
  const oldPositions = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]))
  buildGraph()
  // Preserve positions of surviving nodes
  for (const n of nodes) {
    const old = oldPositions.get(n.id)
    if (old) { n.x = old.x; n.y = old.y }
  }
})

let resizeHandler: (() => void) | null = null

onMounted(() => {
  nextTick(() => start())
  resizeHandler = () => { resize() }
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  stop()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div class="relative">
    <div
      ref="container"
      class="relative w-full overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/30"
      style="height: 300px;"
    >
      <canvas
        ref="canvas"
        class="absolute inset-0"
        @mousemove="onMouseMove"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @click="onClick"
      />

      <!-- Controls toggle -->
      <button
        @click="showControls = !showControls"
        class="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition"
        :class="showControls
          ? 'bg-[#0C65E5]/10 text-[#0C65E5] dark:bg-[#2D95FC]/15 dark:text-[#2D95FC]'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'"
      >
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
        Tune
      </button>

      <!-- Controls panel -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div
          v-show="showControls"
          class="absolute right-2 top-9 z-10 w-48 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-[#0B1120]/95"
        >
          <div class="space-y-2.5 text-[10px]">
            <div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Repel</span>
                <span>{{ physics.repelForce }}</span>
              </div>
              <input type="range" v-model.number="physics.repelForce" min="100" max="3000" step="50"
                class="mt-0.5 h-1 w-full accent-[#2D95FC]" />
            </div>
            <div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Link distance</span>
                <span>{{ physics.linkDistance }}</span>
              </div>
              <input type="range" v-model.number="physics.linkDistance" min="30" max="200" step="5"
                class="mt-0.5 h-1 w-full accent-[#2D95FC]" />
            </div>
            <div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Link strength</span>
                <span>{{ physics.linkStrength.toFixed(3) }}</span>
              </div>
              <input type="range" v-model.number="physics.linkStrength" min="0.005" max="0.1" step="0.005"
                class="mt-0.5 h-1 w-full accent-[#2D95FC]" />
            </div>
            <div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Damping</span>
                <span>{{ physics.damping.toFixed(2) }}</span>
              </div>
              <input type="range" v-model.number="physics.damping" min="0.8" max="0.99" step="0.01"
                class="mt-0.5 h-1 w-full accent-[#2D95FC]" />
            </div>

            <hr class="border-slate-200 dark:border-slate-700" />

            <div class="flex flex-wrap gap-1.5">
              <button
                @click="filters.showPages = !filters.showPages"
                class="rounded-full px-2 py-0.5 text-[9px] font-medium transition"
                :class="filters.showPages ? 'bg-[#0C65E5]/15 text-[#0C65E5]' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >Pages</button>
              <button
                @click="filters.showArticles = !filters.showArticles"
                class="rounded-full px-2 py-0.5 text-[9px] font-medium transition"
                :class="filters.showArticles ? 'bg-[#41A5F7]/15 text-[#41A5F7]' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >Articles</button>
              <button
                @click="filters.showTags = !filters.showTags"
                class="rounded-full px-2 py-0.5 text-[9px] font-medium transition"
                :class="filters.showTags ? 'bg-[#2D95FC]/15 text-[#2D95FC]' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >Tags</button>
              <button
                @click="filters.showTech = !filters.showTech"
                class="rounded-full px-2 py-0.5 text-[9px] font-medium transition"
                :class="filters.showTech ? 'bg-[#0C65E5]/15 text-[#0C65E5]' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >Tech</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
