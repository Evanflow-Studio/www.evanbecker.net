import { SDF_PRIMITIVES } from './fragments/sdf-primitives.glsl'
import { CSG_OPERATIONS } from './fragments/csg-operations.glsl'
import { COSINE_PALETTES } from './fragments/cosine-palettes.glsl'
import { SCENE_LATTICE } from './fragments/scene-lattice.glsl'
import { SCENE_MANDELBULB } from './fragments/scene-mandelbulb.glsl'
import { SCENE_CSG } from './fragments/scene-csg.glsl'
import { SCENE_FRACTAL } from './fragments/scene-fractal.glsl'
import { LOCAL_GEOMETRY } from './fragments/local-geometry.glsl'
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

// Audio reactivity (0.0-1.0)
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_amplitude;
uniform float u_colorReact;

// Local placed objects: xyz = position, w = shape type
uniform vec4 u_localObjects[8];
uniform int u_localObjectCount;

// Preview indicator
uniform vec3 u_previewPos;
uniform int u_previewShape;
uniform int u_showPreview;
`

// Custom GLSL injection point for animation index 9
const CUSTOM_GLSL_PLACEHOLDER = '/* CUSTOM_GLSL_INJECT */'

function buildSceneLatticeWithCustom(customGlsl?: string): string {
  if (!customGlsl) return SCENE_LATTICE

  // Inject custom GLSL as animation == 9
  const injection = `} else if (u_animation == 9) {
    // Custom user GLSL transform
    vec3 rp = p - animCenter;
    ${customGlsl}
    p = rp + animCenter;
  `

  // Insert before the closing of the animation block
  return SCENE_LATTICE.replace(
    'p = rp + animCenter; // transform back to world space\n  }',
    `p = rp + animCenter; // transform back to world space\n  ${injection}}`
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
    LOCAL_GEOMETRY,
    SCENE_DISPATCHER,
    LIGHTING,
    MAIN_LOOP,
  ].join('\n')
}

// Default shader (no custom GLSL)
export const FRAGMENT_SHADER = buildFragmentShader()
