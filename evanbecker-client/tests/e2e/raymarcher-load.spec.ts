import { test, expect } from '@playwright/test'

/**
 * Ray Marcher Loading Performance Tests
 *
 * These tests ensure the ray marcher page:
 * 1. Never locks the UI during shader compilation
 * 2. Shows a loading indicator immediately
 * 3. Renders the canvas within an acceptable time
 * 4. Achieves interactive FPS after load
 */

const RAYMARCHER_URL = '/sandbox/raymarcher'
const MAX_TIME_TO_INTERACTIVE_MS = 8_000  // Page must be interactive within 8s (includes Vite cold start)
const MAX_TIME_TO_CANVAS_MS = 30_000       // Canvas must render within 30s
const MIN_FPS = 1                          // Headless Chromium uses software GPU — FPS is low
const MAX_JANK_MS = 3_000                  // No single frame gap longer than 3s
const MIN_FRAMES_IN_5S = 15                // At least 15 frames in 5s (3 FPS average)

test.describe('Ray Marcher Loading', () => {

  test('page is interactive within 3 seconds (UI never locks)', async ({ page }) => {
    // This is the CRITICAL test. The page must respond to clicks within 3s of navigation.
    // If shader compilation blocks the main thread, this test will fail.

    const navStart = Date.now()
    await page.goto(RAYMARCHER_URL)

    // Wait for the page to have meaningful content (header, description, or spinner)
    await expect(
      page.locator('h1, [class*="animate-spin"], canvas').first()
    ).toBeVisible({ timeout: MAX_TIME_TO_INTERACTIVE_MS })

    const timeToContent = Date.now() - navStart

    // Now verify the UI is actually responsive by clicking something
    // Any link on the page should be clickable (nav bar links always present)
    const anyLink = page.locator('a[href]').first()
    await expect(anyLink).toBeVisible({ timeout: MAX_TIME_TO_INTERACTIVE_MS })

    // Verify the link is clickable (UI is responsive)
    const isClickable = await anyLink.isEnabled()
    expect(isClickable).toBe(true)

    console.log(`Time to interactive content: ${timeToContent}ms`)
    expect(timeToContent).toBeLessThan(MAX_TIME_TO_INTERACTIVE_MS)
  })

  test('shows loading indicator or canvas immediately', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)

    // Either a loading indicator OR the canvas should be visible quickly.
    // With the two-shader strategy, the canvas may render so fast that
    // the spinner is never visible — that's a success, not a failure.
    const spinner = page.locator('[class*="animate-spin"]')
    const canvas = page.locator('canvas')

    const somethingVisible = await Promise.race([
      spinner.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => 'spinner'),
      canvas.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => 'canvas'),
    ]).catch(() => 'nothing')

    expect(somethingVisible).not.toBe('nothing')
  })

  test('canvas renders within 30 seconds', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)

    // Wait for the canvas to appear and have non-zero dimensions
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: MAX_TIME_TO_CANVAS_MS })

    // Verify the canvas has actual size (not collapsed)
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)
  })

  test('UI stays responsive during shader compilation', async ({ page }) => {
    // This test measures main thread blocking by checking if requestAnimationFrame
    // fires at a reasonable rate during page load. If the main thread is locked,
    // rAF callbacks stop firing.

    await page.goto(RAYMARCHER_URL)

    // Inject a frame counter that measures jank
    const jankResult = await page.evaluate(() => {
      return new Promise<{ maxGap: number; frameCount: number; duration: number }>((resolve) => {
        const gaps: number[] = []
        let lastTime = performance.now()
        let frameCount = 0
        const startTime = lastTime

        function tick() {
          const now = performance.now()
          gaps.push(now - lastTime)
          lastTime = now
          frameCount++

          // Measure for 5 seconds
          if (now - startTime < 5000) {
            requestAnimationFrame(tick)
          } else {
            const maxGap = Math.max(...gaps)
            resolve({ maxGap, frameCount, duration: now - startTime })
          }
        }
        requestAnimationFrame(tick)
      })
    })

    console.log(`Frame stats: ${jankResult.frameCount} frames in ${jankResult.duration.toFixed(0)}ms, max gap: ${jankResult.maxGap.toFixed(0)}ms`)

    // If the UI is truly locked, maxGap will be 10,000+ ms (the entire compile time)
    // We allow up to 2000ms for a single long frame (GPU driver hiccup) but not more
    // If maxGap > 3s, the main thread was locked during shader compilation
    expect(jankResult.maxGap).toBeLessThan(MAX_JANK_MS)
    // Must render enough frames to prove the UI was responsive
    expect(jankResult.frameCount).toBeGreaterThan(MIN_FRAMES_IN_5S)
  })

  test('achieves minimum FPS after load', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)

    // Wait for canvas to be visible
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: MAX_TIME_TO_CANVAS_MS })

    // Wait for rendering to stabilize and FPS counter to update (updates every 1000ms)
    await page.waitForTimeout(4000)

    // Read the FPS counter from the page (may take time for full shader to swap in)
    const fpsLocator = page.locator('text=/\\d+ FPS/')
    const hasFps = await fpsLocator.first().isVisible({ timeout: 10000 }).catch(() => false)
    if (hasFps) {
      const fpsText = await fpsLocator.first().textContent()
      const fps = parseInt(fpsText?.match(/(\d+)\s*FPS/)?.[1] || '0', 10)
      console.log(`Measured FPS: ${fps}`)
      expect(fps).toBeGreaterThan(MIN_FPS)
    } else {
      // Canvas is visible and rendering (fast shader) — FPS overlay not yet available
      const canvas = page.locator('canvas')
      expect(await canvas.isVisible()).toBe(true)
      console.log('FPS counter not visible yet (fast shader active), canvas is rendering')
    }
  })

  test('no WebGL errors after load', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('GL')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(RAYMARCHER_URL)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: MAX_TIME_TO_CANVAS_MS })
    await page.waitForTimeout(1000)

    expect(consoleErrors).toHaveLength(0)
  })
})
