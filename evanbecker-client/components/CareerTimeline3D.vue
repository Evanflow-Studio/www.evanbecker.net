<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

export interface TimelineEntry {
  id: string
  year: string
  label: string
  role: string
  color: string
}

const entries: TimelineEntry[] = [
  { id: 'nvisia',   year: '2019–Now',  label: 'nvisia',              role: 'Senior Technical Architect', color: '#0C65E5' },
  { id: 'mitutoyo', year: '2018–2019', label: 'Mitutoyo-RDA',        role: 'Software Engineer',          color: '#EA580C' },
  { id: 'stack41',  year: '2018',      label: 'Stack41 / Caravela',  role: 'Software Engineer',          color: '#3B82F6' },
  { id: 'uwm',      year: '2016–2018', label: 'UW-Milwaukee',        role: 'Undergraduate Researcher',   color: '#F59E0B' },
  { id: 'procast',  year: '2014–2016', label: 'PRO-CAST',            role: 'CAD & Web Developer',        color: '#64748B' },
  { id: 'hs',       year: '2013',      label: 'First Projects',      role: 'High School',                color: '#475569' },
]

const props = defineProps<{ activeId?: string }>()
const emit = defineEmits<{ 'select': [id: string] }>()

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hoveredId = ref<string | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let raf = 0
let startTime = 0
let nodeMeshes: { mesh: THREE.Mesh; entry: TimelineEntry; baseY: number }[] = []
let particleSystem: THREE.Points
let splineMesh: THREE.Line
let glowMeshes: THREE.Mesh[] = []
let mouse = new THREE.Vector2(9999, 9999)
let raycaster = new THREE.Raycaster()

// Layout: nodes along a gentle 3D helix
function getNodePosition(i: number): THREE.Vector3 {
  const t = i / (entries.length - 1)
  const y = 3 - t * 6                        // top to bottom
  const angle = t * Math.PI * 1.2 - 0.3      // gentle twist
  const radius = 1.2 + Math.sin(t * Math.PI) * 0.4
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return new THREE.Vector3(x, y, z)
}

function init() {
  if (!containerRef.value || !canvasRef.value) return

  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 0.5, 7)
  camera.lookAt(0, -0.5, 0)

  // Ambient light
  scene.add(new THREE.AmbientLight(0xffffff, 0.3))

  // Point light from above-right
  const pointLight = new THREE.PointLight(0x2D95FC, 1.5, 20)
  pointLight.position.set(3, 4, 4)
  scene.add(pointLight)

  // Subtle fill light from below-left
  const fillLight = new THREE.PointLight(0x0C65E5, 0.5, 20)
  fillLight.position.set(-3, -3, 2)
  scene.add(fillLight)

  // Build spline through node positions
  const curvePoints = entries.map((_, i) => getNodePosition(i))
  // Add extra control points for a smoother curve
  const extendedPoints = [
    curvePoints[0].clone().add(new THREE.Vector3(0, 1.5, -0.5)),
    ...curvePoints,
    curvePoints[curvePoints.length - 1].clone().add(new THREE.Vector3(0, -1.5, -0.5)),
  ]
  const curve = new THREE.CatmullRomCurve3(extendedPoints)

  // Spine line
  const splineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120))
  const splineMat = new THREE.LineBasicMaterial({
    color: 0x0C65E5,
    transparent: true,
    opacity: 0.25,
  })
  splineMesh = new THREE.Line(splineGeo, splineMat)
  scene.add(splineMesh)

  // Nodes
  nodeMeshes = []
  glowMeshes = []
  entries.forEach((entry, i) => {
    const pos = getNodePosition(i)

    // Outer glow sphere
    const glowGeo = new THREE.SphereGeometry(0.22, 24, 24)
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(entry.color),
      transparent: true,
      opacity: 0.08,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.copy(pos)
    scene.add(glow)
    glowMeshes.push(glow)

    // Core sphere
    const geo = new THREE.SphereGeometry(0.1, 20, 20)
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(entry.color),
      emissive: new THREE.Color(entry.color),
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.6,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.userData = { entryId: entry.id }
    scene.add(mesh)
    nodeMeshes.push({ mesh, entry, baseY: pos.y })
  })

  // Particle field
  const particleCount = 200
  const particleGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    // Scatter around the helix path
    const t = Math.random()
    const pathPos = curve.getPoint(t * 0.85 + 0.075)
    positions[i * 3]     = pathPos.x + (Math.random() - 0.5) * 3
    positions[i * 3 + 1] = pathPos.y + (Math.random() - 0.5) * 2
    positions[i * 3 + 2] = pathPos.z + (Math.random() - 0.5) * 3
    sizes[i] = Math.random() * 2 + 0.5
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  const particleMat = new THREE.PointsMaterial({
    color: 0x2D95FC,
    size: 0.02,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  })
  particleSystem = new THREE.Points(particleGeo, particleMat)
  scene.add(particleSystem)

  startTime = performance.now()
}

function animate() {
  if (!renderer) return
  const t = (performance.now() - startTime) / 1000

  // Gentle camera orbit
  const camAngle = Math.sin(t * 0.15) * 0.3
  camera.position.x = Math.sin(camAngle) * 7
  camera.position.z = Math.cos(camAngle) * 7
  camera.position.y = 0.5 + Math.sin(t * 0.1) * 0.3
  camera.lookAt(0, -0.5, 0)

  // Animate nodes
  nodeMeshes.forEach(({ mesh, entry, baseY }, i) => {
    const isActive = props.activeId === entry.id
    const isHovered = hoveredId.value === entry.id

    // Gentle float
    mesh.position.y = baseY + Math.sin(t * 0.8 + i * 1.2) * 0.05

    // Scale pulse on active
    const targetScale = isActive ? 1.6 : isHovered ? 1.3 : 1.0
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)

    // Emissive intensity
    const mat = mesh.material as THREE.MeshStandardMaterial
    const targetEmissive = isActive ? 0.9 : isHovered ? 0.6 : 0.3
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.08

    // Glow sphere
    const glow = glowMeshes[i]
    const glowScale = isActive ? 3.5 + Math.sin(t * 2) * 0.5 : isHovered ? 2.5 : 1.5
    glow.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), 0.06)
    glow.position.y = mesh.position.y
    const glowMat = glow.material as THREE.MeshBasicMaterial
    const glowOpacity = isActive ? 0.15 : isHovered ? 0.1 : 0.05
    glowMat.opacity += (glowOpacity - glowMat.opacity) * 0.08
  })

  // Rotate particles slowly
  particleSystem.rotation.y = t * 0.02

  // Raycasting for hover
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh))
  if (intersects.length > 0) {
    hoveredId.value = intersects[0].object.userData.entryId
  } else {
    hoveredId.value = null
  }

  renderer.render(scene, camera)
  raf = requestAnimationFrame(animate)
}

function onResize() {
  if (!containerRef.value || !renderer) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function onPointerMove(e: PointerEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function onPointerDown(e: PointerEvent) {
  if (hoveredId.value) {
    emit('select', hoveredId.value)
  }
}

function onPointerLeave() {
  mouse.set(9999, 9999)
  hoveredId.value = null
}

onMounted(() => {
  init()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  renderer?.dispose()
  window.removeEventListener('resize', onResize)
})

defineExpose({ entries })
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full"
    :class="hoveredId ? 'cursor-pointer' : ''"
  >
    <canvas
      ref="canvasRef"
      class="block h-full w-full"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerLeave"
    />

    <!-- HTML overlay labels — positioned via CSS to avoid canvas text issues -->
    <div
      v-for="(entry, i) in entries"
      :key="entry.id"
      class="pointer-events-none absolute transition-all duration-300"
      :class="props.activeId === entry.id ? 'opacity-100' : 'opacity-50'"
      :style="{
        left: '55%',
        top: `${12 + i * (76 / (entries.length - 1))}%`,
      }"
    >
      <span
        class="text-xs font-semibold sm:text-sm"
        :style="{ color: props.activeId === entry.id ? entry.color : '#94a3b8' }"
      >
        {{ entry.label }}
      </span>
      <span class="ml-2 text-xs text-slate-600">{{ entry.year }}</span>
    </div>
  </div>
</template>
