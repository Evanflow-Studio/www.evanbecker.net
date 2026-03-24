// Scene and palette names — shared between controls and orchestrator
export const SCENE_NAMES = ['Infinite Lattice', 'Mandelbulb', 'CSG Operations', 'Fractal Descent'] as const
export const PALETTE_NAMES = ['Aether', 'Cosmic', 'Inferno', 'Ocean', 'Electric', 'Prismatic', 'Neon', 'Sunset', 'Ice', 'Vapor', 'Forest', 'Mono', 'Custom'] as const
export const QUALITY_NAMES = ['Performance', 'Balanced', 'High', 'Ultra'] as const
export const GEO_PRESET_NAMES = ['Hollow Cube', 'Cross Beams', 'Nested Spheres', 'Frame Only', 'Torus Lattice', 'Gyroid', 'Menger Cross', 'Chain Links', 'Spiral Column', 'Diamond Lattice'] as const
export const ANIMATION_NAMES = ['None', 'Wave', 'Twist', 'Pulse', 'Kaleidoscope', 'Orbit', 'Ripple', 'Shatter', 'Morph', 'Custom'] as const

// Animation type enum — replaces magic numbers
export const ANIMATION = {
  None: 0,
  Wave: 1,
  Twist: 2,
  Pulse: 3,
  Kaleidoscope: 4,
  Orbit: 5,
  Ripple: 6,
  Shatter: 7,
  Morph: 8,
  Custom: 9,
} as const

// Camera defaults
export const CAMERA_DEFAULTS = {
  MOVE_SPEED: 0.04,
  SPRINT_MULTIPLIER: 2.5,
  LOOK_SPEED: 0.005,
  ORBIT_DELAY_MS: 2000,
  ORBIT_RADIUS: 2.5,
  ORBIT_SPEED: 0.6,
  ORBIT_BOB_AMPLITUDE: 0.8,
  ORBIT_BOB_FREQUENCY: 0.3,
  MAX_DPR: 2,
} as const

// Drift animation constants
export const DRIFT = {
  YAW_SPEED: 0.004,
  PITCH_FREQUENCY: 0.3,
  PITCH_AMPLITUDE: 0.0005,
} as const

// Light auto-rotation
export const LIGHT = {
  YAW_SPEED: 0.015,
  PITCH_FREQUENCY: 0.02,
  PITCH_AMPLITUDE: 0.1,
} as const

// Cell spacing range (maps to shader mix())
export const CELL_SPACING = {
  MIN: 4.0,
  MAX: 10.0,
} as const

// FPS counter
export const FPS_UPDATE_INTERVAL_MS = 1000

// Screenshot
export const SCREENSHOT_SCALE = 2

