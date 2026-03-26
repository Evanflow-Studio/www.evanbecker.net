import { SCREENSHOT_SCALE } from '~/utils/shaders/constants'
import type { GLResources } from '~/types/raymarcher'

/**
 * Capture a high-resolution screenshot of the ray marcher canvas.
 * Renders at 2x resolution, downloads as PNG, then restores original size.
 */
export function captureScreenshot(
  canvas: HTMLCanvasElement,
  res: GLResources,
  scale = SCREENSHOT_SCALE,
) {
  const { gl, program, mainCache } = res
  if (!gl || !program) return

  const origW = canvas.width
  const origH = canvas.height

  canvas.width = origW * scale
  canvas.height = origH * scale
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.uniform2f(mainCache['u_resolution'], canvas.width, canvas.height)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `raymarcher-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')

  canvas.width = origW
  canvas.height = origH
}
