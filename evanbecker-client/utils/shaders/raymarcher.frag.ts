import { SDF_PRIMITIVES } from './fragments/sdf-primitives.glsl'
import { CSG_OPERATIONS } from './fragments/csg-operations.glsl'
import { COSINE_PALETTES } from './fragments/cosine-palettes.glsl'
import { SCENE_LATTICE } from './fragments/scene-lattice.glsl'
import { SCENE_MANDELBULB } from './fragments/scene-mandelbulb.glsl'
import { SCENE_CSG } from './fragments/scene-csg.glsl'
import { SCENE_FRACTAL } from './fragments/scene-fractal.glsl'
import { SCENE_DISPATCHER } from './fragments/scene-dispatcher.glsl'
import { LIGHTING } from './fragments/lighting.glsl'
import { MAIN_LOOP } from './fragments/main-loop.glsl'

const UNIFORMS = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_cameraYaw;
uniform float u_cameraPitch;
uniform vec3 u_cameraPos;
uniform int u_iterations;
uniform int u_scene;
uniform int u_palette;
uniform vec3 u_lightDir;
uniform float u_cellSpacing;
uniform float u_wallThickness;
uniform int u_geoPreset;
uniform int u_animation;
uniform int u_maxSteps;
uniform float u_hitThreshold;
uniform float u_maxDist;
uniform float u_warpCorrection;
uniform int u_wireframe;
uniform float u_animOffset;

// Fog & zoom
uniform float u_fogDensity;
uniform float u_zoom;

// Custom palette vectors (IQ cosine formula: a + b * cos(2pi * (c*t + d)))
uniform vec3 u_paletteA;
uniform vec3 u_paletteB;
uniform vec3 u_paletteC;
uniform vec3 u_paletteD;

`

// Custom GLSL injection point for animation index 9
const CUSTOM_GLSL_PLACEHOLDER = '/* CUSTOM_GLSL_INJECT */'

function buildSceneLatticeWithCustom(customGlsl?: string): string {
  if (!customGlsl) return SCENE_LATTICE

  // Inject custom GLSL as animation == 9
  const injection = `} else if (u_animation == 9) {
    // Custom user GLSL transform
    ${customGlsl}
  `

  // Replace the marker comment with the custom animation branch
  return SCENE_LATTICE.replace(
    '// __CUSTOM_ANIMATION_INJECT__',
    injection,
  )
}

export function buildFragmentShader(customGlsl?: string): string {
  const lattice = buildSceneLatticeWithCustom(customGlsl)
  return [
    UNIFORMS,
    SDF_PRIMITIVES,
    CSG_OPERATIONS,
    COSINE_PALETTES,
    lattice,
    SCENE_MANDELBULB,
    SCENE_CSG,
    SCENE_FRACTAL,
    SCENE_DISPATCHER,
    LIGHTING,
    MAIN_LOOP,
  ].join('\n')
}

// Default shader (no custom GLSL)
export const FRAGMENT_SHADER = buildFragmentShader()
