export interface LatticePreset {
  name: string
  scene?: number       // Scene index (0=Lattice, 1=Mandelbulb, 2=CSG, 3=Fractal). Defaults to 0.
  palette: number
  geoPreset: number
  animation: number
  cellSpacing: number
  wallThickness: number
  animOffset: number
  lightAngleX: number
  lightAngleY: number
}

export const LATTICE_PRESETS: LatticePreset[] = [
  {
    name: 'Deep Sea',
    palette: 3,       // Ocean
    geoPreset: 2,     // Nested Spheres
    animation: 1,     // Wave
    cellSpacing: 0.2,
    wallThickness: 0.6,
    animOffset: 0.0,
    lightAngleX: 0.4,
    lightAngleY: 0.8,
  },
  {
    name: 'Infinite Descent',
    scene: 3,         // Fractal Descent
    palette: 4,       // Electric
    geoPreset: 0,
    animation: 0,
    cellSpacing: 0.1,
    wallThickness: 0.5,
    animOffset: 0.0,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
  },
  {
    name: 'Jellyfish',
    palette: 10,      // Forest
    geoPreset: 0,     // Hollow Cube
    animation: 3,     // Pulse
    cellSpacing: 0.15,
    wallThickness: 0.48,
    animOffset: 1.0,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
  },
  {
    name: 'Vortex',
    palette: 9,       // Vapor
    geoPreset: 4,     // Torus Lattice
    animation: 2,     // Twist
    cellSpacing: 0.1,
    wallThickness: 0.4,
    animOffset: 0.0,
    lightAngleX: 0.6,
    lightAngleY: 0.6,
  },
  {
    name: 'Dreamscape',
    palette: 1,       // Cosmic
    geoPreset: 0,     // Hollow Cube
    animation: 8,     // Morph
    cellSpacing: 0.08,
    wallThickness: 0.5,
    animOffset: 0.0,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
  },
  {
    name: 'Neon Grid',
    palette: 6,       // Neon
    geoPreset: 3,     // Frame Only
    animation: 0,     // None
    cellSpacing: 0.05,
    wallThickness: 0.3,
    animOffset: 0.0,
    lightAngleX: 0.3,
    lightAngleY: 0.5,
  },
  {
    name: 'Shattered Ice',
    palette: 8,       // Ice
    geoPreset: 0,     // Hollow Cube
    animation: 7,     // Shatter
    cellSpacing: 0.12,
    wallThickness: 0.55,
    animOffset: 0.1,
    lightAngleX: 0.5,
    lightAngleY: 0.9,
  },
  {
    name: 'Crystal Array',
    palette: 1,       // Cosmic
    geoPreset: 0,     // Hollow Cube
    animation: 0,     // None
    cellSpacing: 0.08,
    wallThickness: 0.5,
    animOffset: 0.0,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
  },
  // --- New presets ---
  {
    name: 'Coral Reef',
    palette: 7,       // Sunset
    geoPreset: 5,     // Gyroid
    animation: 1,     // Wave
    cellSpacing: 0.9,
    wallThickness: 0.5,
    animOffset: 0.4,
    lightAngleX: 0.35,
    lightAngleY: 0.75,
  },
  {
    name: 'Clockwork',
    palette: 4,       // Electric
    geoPreset: 7,     // Chain Links
    animation: 2,     // Twist
    cellSpacing: 0.1,
    wallThickness: 0.45,
    animOffset: 0.3,
    lightAngleX: 0.5,
    lightAngleY: 0.6,
  },
  {
    name: 'Alien Hive',
    palette: 9,       // Vapor
    geoPreset: 5,     // Gyroid
    animation: 3,     // Pulse
    cellSpacing: 0.85,
    wallThickness: 0.5,
    animOffset: 0.8,
    lightAngleX: 0.4,
    lightAngleY: 0.85,
  },
  // --- AI music player presets (fractal/bending geometry) ---
  {
    name: 'Neural Weave',
    palette: 12,      // Custom (driven by viz engine)
    geoPreset: 10,    // Woven Cage
    animation: 10,    // Breathe
    cellSpacing: 0.18,
    wallThickness: 0.4,
    animOffset: 0.5,
    lightAngleX: 0.45,
    lightAngleY: 0.7,
  },
  {
    name: 'Fractal Machine',
    palette: 12,      // Custom
    geoPreset: 11,    // Fractal Scaffold
    animation: 9,     // Fold
    cellSpacing: 0.12,
    wallThickness: 0.35,
    animOffset: 0.3,
    lightAngleX: 0.5,
    lightAngleY: 0.65,
  },
  {
    name: 'Möbius Flow',
    palette: 12,      // Custom
    geoPreset: 12,    // Möbius Lattice
    animation: 2,     // Twist
    cellSpacing: 0.15,
    wallThickness: 0.45,
    animOffset: 0.0,
    lightAngleX: 0.55,
    lightAngleY: 0.75,
  },
  {
    name: 'Glitch Hive',
    palette: 12,      // Custom
    geoPreset: 5,     // Gyroid
    animation: 11,    // Glitch
    cellSpacing: 0.8,
    wallThickness: 0.5,
    animOffset: 0.6,
    lightAngleX: 0.4,
    lightAngleY: 0.8,
  },
  {
    name: 'Recursive Dream',
    palette: 12,      // Custom
    geoPreset: 11,    // Fractal Scaffold
    animation: 8,     // Morph
    cellSpacing: 0.1,
    wallThickness: 0.3,
    animOffset: 0.2,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
  },
  {
    name: 'Cage Pulse',
    palette: 12,      // Custom
    geoPreset: 10,    // Woven Cage
    animation: 3,     // Pulse
    cellSpacing: 0.2,
    wallThickness: 0.55,
    animOffset: 1.0,
    lightAngleX: 0.5,
    lightAngleY: 0.65,
  },
]
