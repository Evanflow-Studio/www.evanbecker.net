<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

/* ── career data ────────────────────────────────────────────────── */
export interface TimelineEntry {
  year: number
  endYear?: number
  label: string
  role: string
  slug: string
  color: string
  description: string
}

const entries: TimelineEntry[] = [
  {
    year: 2013, label: 'High School Projects', role: 'First Code',
    slug: 'hs', color: '#64748B',
    description: 'Built a Flappy Bird clone, designed guitar amplifier chassis for Limelight Amplification, and volunteered on a dog rescue website — learning that software could touch the physical world.',
  },
  {
    year: 2014, endYear: 2016, label: 'PRO-CAST, INC', role: 'CAD Designer & Web Developer',
    slug: 'procast', color: '#64748B',
    description: 'Modeled 150+ cast products in Autodesk and built two e-commerce sites from scratch, bridging physical manufacturing with digital presence.',
  },
  {
    year: 2016, endYear: 2018, label: 'UW-Milwaukee', role: 'Undergraduate Researcher',
    slug: 'uwm', color: '#F59E0B',
    description: 'Co-researched an audio-first language tool for visually impaired learners with Professor Jacques du Plessis. Six consecutive SURF grants. Learned that the best interfaces disappear — they just work.',
  },
  {
    year: 2018, label: 'Stack41 / Caravela IoT', role: 'Software Engineer',
    slug: 'stack41', color: '#1E3A5F',
    description: 'Built a DCaaS dashboard with live VM control via noVNC at a startup later acquired by Potawatomi\'s Data Holdings. IoT sensor networks, circuit prototyping, and bare-metal Proxmox — where I first got comfortable at the edge of hardware and software.',
  },
  {
    year: 2018, endYear: 2019, label: 'Mitutoyo-RDA', role: 'Software Engineer',
    slug: 'mitutoyo', color: '#EA580C',
    description: 'Developed 3D metrology software for coordinate-measuring machines used in aerospace manufacturing. Built the scene framework, renderer, and collision detection in HOOPS Visualize — where imprecision isn\'t an option.',
  },
  {
    year: 2019, endYear: 2026, label: 'nvisia', role: 'Senior Technical Architect',
    slug: 'nvisia', color: '#0C65E5',
    description: 'Enterprise architecture consulting across energy, manufacturing, consumer products, and chemicals. From NERC CIP compliance at Alliant Energy to AI-powered ERP queries at Hydrite — designing systems where the -ilities actually matter.',
  },
]

const props = defineProps<{
  modelValue?: string | null
}>()
const emit = defineEmits<{
  'update:modelValue': [slug: string | null]
  'select': [entry: TimelineEntry | null]
}>()

/* ── state ──────────────────────────────────────────────────────── */
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const hoveredSlug = ref<string | null>(null)
const selectedSlug = ref<string | null>(props.modelValue ?? null)
let raf = 0
let startTime = 0
let cssWidth = 0   // CSS pixel dimensions (what we draw in)
let cssHeight = 0
let dpr = 1
let nodePositions: { x: number; y: number; entry: TimelineEntry }[] = []

/* ── coordinate mapping — evenly spaced by index ────────────────── */
const PAD_TOP = 50
const PAD_BOT = 30
const NODE_SPACING = 80  // minimum px between nodes

function indexToY(i: number): number {
  const totalSpan = (entries.length - 1) * NODE_SPACING
  const usable = cssHeight - PAD_TOP - PAD_BOT
  // Center the nodes if they fit; otherwise stretch to fill
  const actualSpan = Math.min(totalSpan, usable)
  const step = actualSpan / Math.max(entries.length - 1, 1)
  const offsetY = PAD_TOP + (usable - actualSpan) / 2
  return offsetY + i * step
}

/* ── drawing (all coordinates in CSS pixels) ────────────────────── */
function draw(ctx: CanvasRenderingContext2D, t: number) {
  ctx.clearRect(0, 0, cssWidth, cssHeight)

  const lineX = cssWidth / 2

  // Spine
  const firstY = indexToY(0)
  const lastY = indexToY(entries.length - 1)
  const gradient = ctx.createLinearGradient(lineX, firstY, lineX, lastY)
  gradient.addColorStop(0, 'rgba(100,116,139,0.15)')
  gradient.addColorStop(0.3, 'rgba(12,101,229,0.3)')
  gradient.addColorStop(1, 'rgba(12,101,229,0.5)')
  ctx.beginPath()
  ctx.moveTo(lineX, firstY - 20)
  ctx.lineTo(lineX, lastY + 20)
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()

  // Nodes
  nodePositions = []
  entries.forEach((entry, i) => {
    const y = indexToY(i)
    nodePositions.push({ x: lineX, y, entry })

    const isHovered = hoveredSlug.value === entry.slug
    const isSelected = selectedSlug.value === entry.slug
    const isActive = isHovered || isSelected

    // Glow
    if (isActive) {
      const glowR = 28 + Math.sin(t * 2) * 4
      const glow = ctx.createRadialGradient(lineX, y, 0, lineX, y, glowR)
      glow.addColorStop(0, entry.color + '60')
      glow.addColorStop(1, entry.color + '00')
      ctx.beginPath()
      ctx.arc(lineX, y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()
    }

    // Outer ring
    ctx.beginPath()
    ctx.arc(lineX, y, isActive ? 14 : 10, 0, Math.PI * 2)
    ctx.fillStyle = isActive ? entry.color + '40' : entry.color + '20'
    ctx.fill()

    // Inner dot
    ctx.beginPath()
    ctx.arc(lineX, y, isActive ? 7 : 5, 0, Math.PI * 2)
    ctx.fillStyle = entry.color
    ctx.fill()

    // Pulse ring on selected
    if (isSelected) {
      const pulseR = 14 + Math.sin(t * 3) * 6
      ctx.beginPath()
      ctx.arc(lineX, y, pulseR, 0, Math.PI * 2)
      ctx.strokeStyle = entry.color + '40'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Year label — left of spine
    ctx.font = `${isActive ? 'bold ' : ''}12px Inter, system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isActive ? '#e2e8f0' : '#94a3b8'
    const yearText = entry.endYear ? `${entry.year}–${entry.endYear}` : `${entry.year}`
    ctx.fillText(yearText, lineX - 24, y)

    // Label — right of spine
    ctx.font = `${isActive ? '600 ' : '400 '}13px Inter, system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillStyle = isActive ? '#f1f5f9' : '#cbd5e1'
    ctx.fillText(entry.label, lineX + 24, y - 7)

    // Role subtitle
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillStyle = isActive ? '#94a3b8' : '#64748b'
    ctx.fillText(entry.role, lineX + 24, y + 9)
  })

  // Floating particles
  for (let i = 0; i < 12; i++) {
    const phase = (t * 0.3 + i * 0.83) % 1
    const py = (firstY - 20) + phase * (lastY - firstY + 40)
    const px = lineX + Math.sin(t * 0.7 + i * 2.1) * 8
    const alpha = Math.sin(phase * Math.PI) * 0.4
    ctx.beginPath()
    ctx.arc(px, py, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(45, 149, 252, ${alpha})`
    ctx.fill()
  }
}

/* ── interaction (CSS-pixel coordinates) ────────────────────────── */
function getEntryAtPosition(clientX: number, clientY: number): TimelineEntry | null {
  if (!canvasRef.value) return null
  const rect = canvasRef.value.getBoundingClientRect()
  const mx = clientX - rect.left   // CSS pixels
  const my = clientY - rect.top
  const hitRadius = 30

  for (const node of nodePositions) {
    const dx = mx - node.x
    const dy = my - node.y
    if (dx * dx + dy * dy < hitRadius * hitRadius) {
      return node.entry
    }
  }
  return null
}

function onPointerMove(e: PointerEvent) {
  const entry = getEntryAtPosition(e.clientX, e.clientY)
  hoveredSlug.value = entry?.slug ?? null
  if (canvasRef.value) canvasRef.value.style.cursor = entry ? 'pointer' : 'default'
}

function onPointerDown(e: PointerEvent) {
  const entry = getEntryAtPosition(e.clientX, e.clientY)
  if (entry) {
    selectedSlug.value = selectedSlug.value === entry.slug ? null : entry.slug
    emit('update:modelValue', selectedSlug.value)
    emit('select', selectedSlug.value ? entry : null)
  }
}

function onPointerLeave() {
  hoveredSlug.value = null
}

/* ── resize ─────────────────────────────────────────────────────── */
function resize() {
  if (!canvasRef.value || !containerRef.value) return
  dpr = window.devicePixelRatio || 1
  const rect = containerRef.value.getBoundingClientRect()
  cssWidth = rect.width
  cssHeight = rect.height
  // Set canvas buffer to physical pixels for crisp rendering
  canvasRef.value.width = cssWidth * dpr
  canvasRef.value.height = cssHeight * dpr
  canvasRef.value.style.width = cssWidth + 'px'
  canvasRef.value.style.height = cssHeight + 'px'
}

/* ── render loop ────────────────────────────────────────────────── */
function loop() {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  // Scale context so we draw in CSS pixels, canvas buffer handles DPR
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const t = (performance.now() - startTime) / 1000
  draw(ctx, t)
  raf = requestAnimationFrame(loop)
}

/* ── lifecycle ──────────────────────────────────────────────────── */
onMounted(() => {
  startTime = performance.now()
  resize()
  loop()
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})

watch(() => props.modelValue, (val) => {
  selectedSlug.value = val ?? null
})

defineExpose({ entries })
</script>

<template>
  <div ref="containerRef" class="relative h-full w-full min-h-[560px]">
    <canvas
      ref="canvasRef"
      class="block h-full w-full"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerLeave"
    />
  </div>
</template>
