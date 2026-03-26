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
      this.scene.palette = preset.palette
      this.scene.lightAngleX = preset.lightAngleX
      this.scene.lightAngleY = preset.lightAngleY
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
  },
})

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
