export interface LatticePreset {
  name: string
  palette: number
  geoPreset: number
  animation: number
  cellSpacing: number
  wallThickness: number
  animOffset: number
  lightAngleX: number
  lightAngleY: number
  wireframe: boolean
}

export const LATTICE_PRESETS: LatticePreset[] = [
  {
    name: 'Default',
    palette: 1,       // Cosmic
    geoPreset: 0,     // Hollow Cube
    animation: 0,     // None
    cellSpacing: 0.08,
    wallThickness: 0.5,
    animOffset: 0.0,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
    wireframe: false,
  },
  {
    name: 'Jellyfish',
    palette: 10,      // Forest
    geoPreset: 0,     // Hollow Cube
    animation: 3,     // Pulse
    cellSpacing: 0.15,
    wallThickness: 0.48,
    animOffset: 0.35,
    lightAngleX: 0.5,
    lightAngleY: 0.7,
    wireframe: false,
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
    wireframe: true,
  },
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
    wireframe: false,
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
    wireframe: false,
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
    wireframe: false,
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
    wireframe: false,
  },
]
