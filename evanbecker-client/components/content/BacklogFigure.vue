<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { coverageAt, coverageByPass, gapSize, type BacklogFigureData } from '~/utils/backlogFigure'

// The Virtual Backlog figure: Zeroset's spec statements start as grey noise and settle, in blue, at
// the pass of evidence that first covers them. What's still grey after the last pass is the gap.
// It plays once when scrolled into view, and not at all with prefers-reduced-motion: the pass
// buttons then step through it without animating.

const config = useRuntimeConfig()
const colorMode = useColorMode()

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const data = ref<BacklogFigureData | null>(null)
const failed = ref(false)
const target = ref(0)
const shown = ref(0)
const reducedMotion = ref(false)

const coverage = computed(() => (data.value ? coverageByPass(data.value) : []))
const passes = computed(() => data.value?.passes ?? [])
const gap = computed(() => (data.value ? gapSize(data.value) : 0))
const statementCount = computed(() => (data.value ? data.value.statements.length / 4 : 4757).toLocaleString('en-US'))
const shownCoverage = computed(() => `${(coverageAt(coverage.value, shown.value) * 100).toFixed(1)}%`)
const passLabel = computed(() => {
  const name = passes.value[target.value] ?? ''
  return target.value === 0 ? 'No evidence yet' : `Pass ${target.value} of ${passes.value.length - 1}: ${name}`
})

// Each statement's start, a fixed pseudo-random point, so the noise is the same on every visit.
let noiseX = new Float32Array(0)
let noiseY = new Float32Array(0)
function makeNoise(count: number) {
  let seed = 0x9e3779b9
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  noiseX = new Float32Array(count)
  noiseY = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    noiseX[i] = next() * 1000
    noiseY[i] = next() * 1000
  }
}

const ease = (s: number) => (s < 0.5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2)
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

function palette() {
  const dark = colorMode.value === 'dark'
  return {
    noise: dark ? '#cbd5e1' : '#94a3b8',
    covered: dark ? '#2D95FC' : '#0C65E5',
    evidence: dark ? '#94a3b8' : '#64748b',
  }
}

function draw() {
  const el = canvas.value
  const d = data.value
  if (!el || !d) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const width = el.width
  const height = el.height
  const margin = 10 * dpr
  const px = (x: number) => margin + (x / 1000) * (width - 2 * margin)
  const py = (y: number) => height - margin - (y / 1000) * (height - 2 * margin)
  const colors = palette()
  const now = shown.value
  ctx.clearRect(0, 0, width, height)

  // Evidence: faint dots that arrive with their pass.
  ctx.fillStyle = colors.evidence
  const dot = Math.max(1, Math.round(dpr))
  for (let i = 0; i < d.evidence.length; i += 3) {
    const alpha = clamp01(now - (d.evidence[i + 2] - 1)) * 0.22
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.fillRect(px(d.evidence[i]), py(d.evidence[i + 1]), dot, dot)
  }

  // Statements: grey at their noise position, blue at their real one, blended by how far their pass has run.
  const size = Math.max(2, Math.round(2.2 * dpr))
  const half = size / 2
  const positions: number[] = []
  for (let i = 0, n = 0; i < d.statements.length; i += 4, n++) {
    const first = d.statements[i + 2]
    const s = first > 0 ? ease(clamp01(now - (first - 1))) : 0
    positions.push(
      noiseX[n] + (d.statements[i] - noiseX[n]) * s,
      noiseY[n] + (d.statements[i + 1] - noiseY[n]) * s,
      s,
    )
  }
  ctx.fillStyle = colors.noise
  for (let j = 0; j < positions.length; j += 3) {
    const alpha = (1 - positions[j + 2]) * 0.8
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.fillRect(px(positions[j]) - half, py(positions[j + 1]) - half, size, size)
  }
  ctx.fillStyle = colors.covered
  for (let j = 0; j < positions.length; j += 3) {
    if (positions[j + 2] <= 0) continue
    ctx.globalAlpha = positions[j + 2] * 0.85
    ctx.fillRect(px(positions[j]) - half, py(positions[j + 1]) - half, size, size)
  }
  ctx.globalAlpha = 1
}

function resize() {
  const el = canvas.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  const width = el.clientWidth
  el.width = Math.round(width * dpr)
  el.height = Math.round(width * 0.6 * dpr)
  draw()
}

// Animation: move `shown` toward `target`, one pass per STEP_MS.
const STEP_MS = 1100
const PAUSE_MS = 600
let frame = 0
let queue: number[] = []
let pauseTimer: ReturnType<typeof setTimeout> | undefined

function animateTo(pass: number, onDone?: () => void) {
  cancelAnimationFrame(frame)
  target.value = pass
  if (reducedMotion.value) {
    shown.value = pass
    draw()
    onDone?.()
    return
  }
  const from = shown.value
  const start = performance.now()
  const duration = Math.min(2200, Math.max(250, Math.abs(pass - from) * STEP_MS))
  const tick = (time: number) => {
    const t = clamp01((time - start) / duration)
    shown.value = from + (pass - from) * t
    draw()
    if (t < 1) frame = requestAnimationFrame(tick)
    else onDone?.()
  }
  frame = requestAnimationFrame(tick)
}

function stop() {
  queue = []
  clearTimeout(pauseTimer)
  cancelAnimationFrame(frame)
}

function play() {
  stop()
  shown.value = 0
  target.value = 0
  draw()
  queue = passes.value.map((_, i) => i).slice(1)
  const step = () => {
    const next = queue.shift()
    if (next === undefined) return
    animateTo(next, () => {
      pauseTimer = setTimeout(step, PAUSE_MS)
    })
  }
  pauseTimer = setTimeout(step, PAUSE_MS)
}

function choose(pass: number) {
  stop()
  animateTo(pass)
}

let resizeObserver: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined
const onMotionChange = () => {
  reducedMotion.value = !!motionQuery?.matches
}

onMounted(async () => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMotionChange()
  motionQuery.addEventListener('change', onMotionChange)

  try {
    const response = await fetch(`${config.app.baseURL}figures/virtual-backlog-passes.json`)
    if (!response.ok) throw new Error(`figure data: ${response.status}`)
    data.value = (await response.json()) as BacklogFigureData
  } catch {
    failed.value = true
    return
  }
  makeNoise(data.value.statements.length / 4)

  // With reduced motion, show the finished picture; otherwise start from noise and play once in view.
  const last = data.value.passes.length - 1
  if (reducedMotion.value) {
    target.value = last
    shown.value = last
  }
  resizeObserver = new ResizeObserver(resize)
  if (canvas.value) resizeObserver.observe(canvas.value)
  resize()

  if (!reducedMotion.value && root.value) {
    visibilityObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visibilityObserver?.disconnect()
        play()
      }
    }, { threshold: 0.4 })
    visibilityObserver.observe(root.value)
  }
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  motionQuery?.removeEventListener('change', onMotionChange)
})

watch(() => colorMode.value, () => draw())
</script>

<template>
  <figure ref="root" class="not-prose my-8 overflow-hidden rounded-xl border border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50">
    <div class="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 font-mono text-xs text-slate-600 dark:text-slate-400">
      <span aria-live="polite">{{ data ? passLabel : failed ? 'The figure could not load.' : 'Loading the figure...' }}</span>
      <span v-if="data" class="tabular-nums text-sm font-semibold text-[#0C65E5] dark:text-[#2D95FC]">{{ shownCoverage }} covered</span>
    </div>
    <canvas
      ref="canvas"
      class="block h-auto w-full"
      role="img"
      :aria-label="`Scatter plot of ${statementCount} spec statements. They start as grey noise and turn blue at the pass of evidence that first covers them. Coverage by pass: 0%, 80.3%, 80.7%, 85.6%, 85.7%. The grey points left at the end are the gap.`"
    />
    <div v-if="data" class="flex flex-wrap items-center gap-2 px-4 pb-3">
      <button
        type="button"
        class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#0C65E5] hover:text-[#0C65E5] dark:border-slate-600 dark:text-slate-300 dark:hover:border-[#2D95FC] dark:hover:text-[#2D95FC]"
        @click="reducedMotion ? choose(0) : play()"
      >
        {{ reducedMotion ? 'Start over' : 'Replay' }}
      </button>
      <button
        v-for="(name, i) in passes"
        :key="name"
        type="button"
        :aria-pressed="target === i"
        class="rounded-full border px-3 py-1 text-xs transition-colors"
        :class="target === i
          ? 'border-[#0C65E5] bg-[#0C65E5] text-white dark:border-[#2D95FC] dark:bg-[#2D95FC] dark:text-slate-900'
          : 'border-slate-300 text-slate-600 hover:border-[#0C65E5] hover:text-[#0C65E5] dark:border-slate-600 dark:text-slate-400 dark:hover:border-[#2D95FC] dark:hover:text-[#2D95FC]'"
        @click="choose(i)"
      >
        {{ i === 0 ? 'none' : name }}
      </button>
    </div>
    <figcaption class="border-t border-slate-200 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700/50 dark:text-slate-400">
      {{ statementCount }} statements from Zeroset's spec, placed by a 2D projection of their
      embeddings. Each turns blue at the pass of evidence that first comes within the threshold. The faint dots are the
      evidence itself, arriving pass by pass. After the last pass, {{ gap || 678 }} statements are still grey: the gap.
      The layout is a picture of the space, so distances on it are approximate.
    </figcaption>
  </figure>
</template>
