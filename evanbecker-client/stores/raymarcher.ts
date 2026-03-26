import { defineStore } from 'pinia'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import { CAMERA_DEFAULTS } from '~/utils/shaders/constants'
import type { CameraState, SceneState, LatticeState, RenderState, TimeState, QualityPreset, SceneDefault } from '~/types/raymarcher'

const DEFAULT_PRESET = LATTICE_PRESETS[0]

export const useRayMarcherStore = defineStore('raymarcher', {
  state: () => ({
    // Scene
    scene: {
      index: 0,
      palette: DEFAULT_PRESET.palette,
      iterations: 6,
      lightAngleX: DEFAULT_PRESET.lightAngleX,
      lightAngleY: DEFAULT_PRESET.lightAngleY,
    } as SceneState,

    // Camera
    camera: {
      posX: 0,
      posY: 0,
      posZ: 3,
      yaw: 0.8,
      pitch: 0.0,
      moveSpeed: CAMERA_DEFAULTS.MOVE_SPEED,
      autoRotate: false,
      lastInteraction: 0,
    } as CameraState,

    // Lattice
    lattice: {
      presetIndex: 0,
      geoPreset: DEFAULT_PRESET.geoPreset,
      animation: DEFAULT_PRESET.animation,
      cellSpacing: DEFAULT_PRESET.cellSpacing,
      wallThickness: DEFAULT_PRESET.wallThickness,
      animOffset: DEFAULT_PRESET.animOffset,
      wireframe: DEFAULT_PRESET.wireframe,
      isCustomized: false,
      basePresetName: DEFAULT_PRESET.name,
    } as LatticeState,

    // Rendering / FX
    render: {
      quality: 1,
      bloomStrength: 0,
      chromaticAmount: 0,
      fogDensity: 0.001,
      zoom: 1.0,
    } as RenderState,

    // Time
    time: {
      paused: false,
      speed: 1.0,
    } as TimeState,

    // Custom palette (IQ cosine)
    customPalette: {
      a: [0.5, 0.5, 0.5] as [number, number, number],
      b: [0.5, 0.5, 0.5] as [number, number, number],
      c: [1.0, 1.0, 1.0] as [number, number, number],
      d: [0.0, 0.33, 0.67] as [number, number, number],
    },

    // Scripting
    scripting: {
      customGlsl: '',
      customJs: '',
      glslError: '',
    },

    // GL status (read-only from composable)
    gl: {
      fps: 0,
      error: null as string | null,
      shaderCompiled: false,
      shaderCompiling: false,
      contextCreated: false,
      errors: [] as string[],
      orbitProgress: 0,
    },

    // Mobile
    isMobile: false,
  }),

  getters: {
    currentQualityPreset(): QualityPreset {
      return QUALITY_PRESETS[this.render.quality]
    },
    currentLatticePreset() {
      return LATTICE_PRESETS[this.lattice.presetIndex]
    },
  },

  actions: {
    applyLatticePreset(index: number) {
      const preset = LATTICE_PRESETS[index]
      if (!preset) return
      this.lattice.presetIndex = index
      this.lattice.geoPreset = preset.geoPreset
      this.lattice.animation = preset.animation
      this.lattice.cellSpacing = preset.cellSpacing
      this.lattice.wallThickness = preset.wallThickness
      this.lattice.animOffset = preset.animOffset
      this.lattice.wireframe = preset.wireframe
      this.lattice.isCustomized = false
      this.lattice.basePresetName = preset.name
      this.scene.palette = preset.palette
      this.scene.lightAngleX = preset.lightAngleX
      this.scene.lightAngleY = preset.lightAngleY
    },

    /** Auto-fork: marks the current preset as customized. Called when any lattice/scene property is manually changed. */
    forkPreset() {
      if (!this.lattice.isCustomized) {
        this.lattice.basePresetName = LATTICE_PRESETS[this.lattice.presetIndex]?.name ?? 'Unknown'
        this.lattice.isCustomized = true
      }
    },

    /** Reset back to the base preset, undoing all customizations. */
    resetPreset() {
      this.applyLatticePreset(this.lattice.presetIndex)
    },

    applySceneDefaults(sceneIndex: number) {
      const def = SCENE_DEFAULTS[sceneIndex]
      if (!def) return
      this.scene.index = sceneIndex
      this.camera.posX = def.pos[0]
      this.camera.posY = def.pos[1]
      this.camera.posZ = def.pos[2]
      this.camera.yaw = def.yaw
      this.camera.pitch = def.pitch
      this.camera.lastInteraction = performance.now()
    },

    applyQualityFX(qualityIndex: number) {
      const preset = QUALITY_PRESETS[qualityIndex]
      this.render.quality = qualityIndex
      this.render.bloomStrength = preset.bloom
      this.render.chromaticAmount = preset.chroma
    },

    recordInteraction() {
      this.camera.lastInteraction = performance.now()
    },

    detectMobile() {
      if (typeof window === 'undefined') return
      this.isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768
      if (this.isMobile) this.render.quality = 0
    },

    /** Import state from URL hash. Returns true if state was restored. Clears hash after import. */
    importFromUrl(): boolean {
      if (typeof window === 'undefined') return false
      const hash = window.location.hash
      if (!hash || hash.length < 2) return false

      const params = new URLSearchParams(hash.slice(1))
      let applied = false

      for (const [key, { path, type }] of Object.entries(URL_SCHEMA)) {
        const val = params.get(key)
        if (val === null) continue
        const parsed = type === 'int' ? parseInt(val, 10) : type === 'bool' ? val === '1' : parseFloat(val)
        if (typeof parsed === 'number' && isNaN(parsed)) continue

        // Navigate nested path like "scene.index" → this.scene.index
        const parts = path.split('.')
        let target: any = this
        for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]]
        target[parts[parts.length - 1]] = parsed
        applied = true
      }

      if (applied) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      return applied
    },

    /** Export current state to a shareable URL. Copies to clipboard and returns the URL. */
    exportToUrl(): string {
      const parts: string[] = []
      for (const [key, { path, type }] of Object.entries(URL_SCHEMA)) {
        const pathParts = path.split('.')
        let val: any = this
        for (const p of pathParts) val = val[p]
        const serialized = type === 'int' ? String(val) : type === 'bool' ? (val ? '1' : '0') : (val as number).toFixed(4)
        parts.push(`${key}=${serialized}`)
      }
      const url = `${window.location.origin}${window.location.pathname}#${parts.join('&')}`
      navigator.clipboard.writeText(url)
      return url
    },
  },
})

// URL schema — maps short keys to store paths with types
type UrlFieldType = 'int' | 'float' | 'bool'
const URL_SCHEMA: Record<string, { path: string; type: UrlFieldType }> = {
  s:  { path: 'scene.index',           type: 'int' },
  p:  { path: 'scene.palette',         type: 'int' },
  q:  { path: 'render.quality',        type: 'int' },
  g:  { path: 'lattice.geoPreset',     type: 'int' },
  a:  { path: 'lattice.animation',     type: 'int' },
  cs: { path: 'lattice.cellSpacing',   type: 'float' },
  wt: { path: 'lattice.wallThickness', type: 'float' },
  ao: { path: 'lattice.animOffset',    type: 'float' },
  w:  { path: 'lattice.wireframe',     type: 'bool' },
  bl: { path: 'render.bloomStrength',  type: 'float' },
  ca: { path: 'render.chromaticAmount',type: 'float' },
  fd: { path: 'render.fogDensity',     type: 'float' },
  ts: { path: 'time.speed',            type: 'float' },
  cx: { path: 'camera.posX',           type: 'float' },
  cy: { path: 'camera.posY',           type: 'float' },
  cz: { path: 'camera.posZ',           type: 'float' },
  yw: { path: 'camera.yaw',            type: 'float' },
  pt: { path: 'camera.pitch',          type: 'float' },
  ms: { path: 'camera.moveSpeed',      type: 'float' },
}

// Quality presets — co-located with the store that uses them
export const QUALITY_PRESETS: QualityPreset[] = [
  { name: 'Performance', steps: 32,  threshold: 0.005,  maxDist: 100,  warpCorrection: 1.0, bloom: 0,   chroma: 0 },
  { name: 'Balanced',    steps: 64,  threshold: 0.002,  maxDist: 300,  warpCorrection: 0.8, bloom: 0.3, chroma: 0.5 },
  { name: 'High',        steps: 96,  threshold: 0.001,  maxDist: 600,  warpCorrection: 0.6, bloom: 0.6, chroma: 1.0 },
  { name: 'Ultra',       steps: 128, threshold: 0.0005, maxDist: 1200, warpCorrection: 0.3, bloom: 1.0, chroma: 1.5 },
]

export const SCENE_DEFAULTS: SceneDefault[] = [
  { pos: [0, 0, 3], yaw: 0.8, pitch: 0 },
  { pos: [0, 0, 2.5], yaw: 0, pitch: 0 },
  { pos: [0, 0, 10], yaw: 0, pitch: 0 },
  { pos: [0, 0, 3], yaw: 0, pitch: 0 },
]
