// Scene and palette names — shared between controls and orchestrator
export const SCENE_NAMES = ['Infinite Lattice', 'Mandelbulb', 'CSG Operations', 'Fractal Descent'] as const
export const PALETTE_NAMES = ['Aether', 'Cosmic', 'Inferno', 'Ocean', 'Electric', 'Prismatic', 'Neon', 'Sunset', 'Ice', 'Vapor', 'Forest', 'Mono', 'Custom'] as const
export const QUALITY_NAMES = ['Performance', 'Balanced', 'High', 'Ultra'] as const
export const GEO_PRESET_NAMES = ['Hollow Cube', 'Cross Beams', 'Nested Spheres', 'Frame Only', 'Torus Lattice'] as const
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
  PLACE_DISTANCE: 3.0,
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

// Audio FFT
export const AUDIO = {
  FFT_SIZE: 256,
  SMOOTHING: 0.8,
  BASS_END_RATIO: 0.1,
  MID_END_RATIO: 0.4,
  MASTER_VOLUME: 0.15,
  TRACK_VOLUME: 0.5,
} as const

// Musical note frequencies for the generative drone
export const NOTES = {
  // Octave 1
  E1: 41.2,
  F1: 43.65,
  G1: 49,
  A1: 55,
  Bb1: 58.27,
  B1: 61.74,
  // Octave 2
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98,
  A2: 110,
  // Octave 3
  C3: 130.81,
  D3: 146.83,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  Gs3: 207.65,
  A3: 220,
  Bb3: 233.08,
  B3: 246.94,
  // Octave 4
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440,
  Bb4: 466.16,
  B4: 493.88,
  // Octave 5
  C5: 523.25,
  E5: 659,
  F5: 698.46,
  G5: 783,
  A5: 880,
  // Octave 6
  C6: 1046,
} as const
