// === State interfaces ===

export interface CameraState {
  posX: number
  posY: number
  posZ: number
  yaw: number
  pitch: number
  moveSpeed: number
  autoRotate: boolean
  lastInteraction: number
}

export interface SceneState {
  index: number
  palette: number
  iterations: number
  lightAngleX: number
  lightAngleY: number
}

export interface LatticeState {
  presetIndex: number
  geoPreset: number
  animation: number
  cellSpacing: number
  wallThickness: number
  animOffset: number
  wireframe: boolean
  isCustomized: boolean
  basePresetName: string
}

export interface RenderState {
  quality: number
  bloomStrength: number
  chromaticAmount: number
  fogDensity: number
  zoom: number
}

export interface TimeState {
  paused: boolean
  speed: number
}

export interface CustomPalette {
  a: [number, number, number]
  b: [number, number, number]
  c: [number, number, number]
  d: [number, number, number]
}

// === Quality ===

export interface QualityPreset {
  name: string
  steps: number
  threshold: number
  maxDist: number
  warpCorrection: number
  bloom: number
  chroma: number
}

// === Scene defaults ===

export interface SceneDefault {
  pos: [number, number, number]
  yaw: number
  pitch: number
}

// === GL internal state ===

export type UniformCache = Record<string, WebGLUniformLocation | null>

export interface GLResources {
  gl: WebGL2RenderingContext | null
  program: WebGLProgram | null
  postProgram: WebGLProgram | null
  fbo: WebGLFramebuffer | null
  fboTexture: WebGLTexture | null
  fboWidth: number
  fboHeight: number
  vao: WebGLVertexArrayObject | null
  quadBuffer: WebGLBuffer | null
  mainCache: UniformCache
  postCache: UniformCache
}

export interface FrameTiming {
  animFrameId: number
  startTime: number
  frameCount: number
  lastFpsTime: number
  accumulatedTime: number
  lastFrameTime: number
}

export interface InputTracking {
  isDragging: boolean
  lastMouse: { x: number; y: number }
  keysDown: Set<string>
  lastPinchDist: number
}

export interface OrbitTracking {
  center: [number, number, number] | null
  angle: number
}
