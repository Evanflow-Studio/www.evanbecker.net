/**
 * Detects when the camera is inside geometry by reading a small patch
 * of center pixels and checking if the color variance is near zero.
 *
 * When clipping is detected, returns a nudge direction to push the camera out.
 */

const CHECK_INTERVAL = 0.25 // seconds between checks (faster response)
const SAMPLE_SIZE = 6       // 6x6 pixel patch at center (wider sample)
const VARIANCE_THRESHOLD = 0.012 // below this = probably inside geometry or staring at wall
const CONSECUTIVE_FRAMES = 2     // 2 consecutive = act (0.5s total delay)

export interface ClipDetectorState {
  timeSinceCheck: number
  consecutiveClips: number
  isClipping: boolean
}

export function createClipDetectorState(): ClipDetectorState {
  return { timeSinceCheck: 0, consecutiveClips: 0, isClipping: false }
}

/**
 * Check center pixels for clipping. Returns true if the camera appears
 * to be inside geometry (uniform color across the center patch).
 */
export function checkClipping(
  gl: WebGL2RenderingContext,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  const cx = Math.floor(canvasWidth / 2) - Math.floor(SAMPLE_SIZE / 2)
  const cy = Math.floor(canvasHeight / 2) - Math.floor(SAMPLE_SIZE / 2)

  const pixels = new Uint8Array(SAMPLE_SIZE * SAMPLE_SIZE * 4)
  gl.readPixels(cx, cy, SAMPLE_SIZE, SAMPLE_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // Compute mean RGB
  let rSum = 0, gSum = 0, bSum = 0
  const count = SAMPLE_SIZE * SAMPLE_SIZE
  for (let i = 0; i < count; i++) {
    rSum += pixels[i * 4] / 255
    gSum += pixels[i * 4 + 1] / 255
    bSum += pixels[i * 4 + 2] / 255
  }
  const rMean = rSum / count
  const gMean = gSum / count
  const bMean = bSum / count

  // Compute variance across all channels
  let variance = 0
  for (let i = 0; i < count; i++) {
    const r = pixels[i * 4] / 255 - rMean
    const g = pixels[i * 4 + 1] / 255 - gMean
    const b = pixels[i * 4 + 2] / 255 - bMean
    variance += r * r + g * g + b * b
  }
  variance /= count * 3

  return variance < VARIANCE_THRESHOLD
}

/**
 * Update the clip detector state. Call this every frame from the viz engine.
 * Returns true when the camera should be nudged out of geometry.
 */
export function updateClipDetector(
  state: ClipDetectorState,
  dt: number,
  gl: WebGL2RenderingContext | null,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  if (!gl) return false

  state.timeSinceCheck += dt
  if (state.timeSinceCheck < CHECK_INTERVAL) return false
  state.timeSinceCheck = 0

  const clipping = checkClipping(gl, canvasWidth, canvasHeight)

  if (clipping) {
    state.consecutiveClips++
    state.isClipping = state.consecutiveClips >= CONSECUTIVE_FRAMES
  } else {
    state.consecutiveClips = 0
    state.isClipping = false
  }

  return state.isClipping
}
